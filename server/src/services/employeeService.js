const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { encrypt, decrypt } = require("../utils/cryptoUtil");
const { maskUniqueFieldsForSoftDelete, restoreUniqueFieldsForUndelete } = require("../utils/softDeleteUtil");
const { validateSoftDelete } = require("../utils/softDeleteValidation");

// Define date fields that need special processing
const dateFields = ["cnic_issue_date", "cnic_expire_date", "date_of_birth"];

const employeeService = {
  createEmployee: async (data, processedFiles, documentRecords) => {
    const {
      full_name,
      past_experiences,
      educations,
      experience_documents,
      education_documents,
      ...rest
    } = data;

    // Generate employee_id if not provided
    const employee_id =
      data.employee_id ||
      `EMP${new Date().getFullYear()}${String(Date.now()).slice(-3)}`;

    // Process date fields
    const processedData = { ...rest };
    dateFields.forEach((field) => {
      if (
        processedData[field] === "" ||
        processedData[field] === null ||
        processedData[field] === undefined
      ) {
        processedData[field] = null;
      } else if (
        processedData[field] &&
        typeof processedData[field] === "string" &&
        processedData[field].trim() !== ""
      ) {
        try {
          processedData[field] = new Date(processedData[field]);
        } catch (error) {
          console.error(
            `Invalid date format for ${field}: ${processedData[field]}`
          );
          processedData[field] = null;
        }
      }
    });

    // Coerce IDs
    const district_id = processedData.district_id
      ? parseInt(processedData.district_id)
      : null;
    const city_id = processedData.city_id
      ? parseInt(processedData.city_id)
      : null;

    // Prepare main employee data
    const employeePayload = {
      employee_id,
      full_name,
      father_husband_name: processedData.father_husband_name,
      relationship_type: processedData.relationship_type,
      mother_name: processedData.mother_name,
      cnic: processedData.cnic,
      cnic_issue_date: processedData.cnic_issue_date,
      cnic_expire_date: processedData.cnic_expire_date,
      date_of_birth: processedData.date_of_birth,
      gender: processedData.gender,
      marital_status: processedData.marital_status,
      nationality: processedData.nationality,
      religion: processedData.religion,
      blood_group: processedData.blood_group,
      domicile_district: processedData.domicile_district,
      mobile_number: processedData.mobile_number,
      whatsapp_number: processedData.whatsapp_number,
      email: processedData.email,
      present_address: processedData.present_address,
      permanent_address: processedData.permanent_address,
      same_address:
        processedData.same_address === "true" ||
        processedData.same_address === true,
      // Legacy string fields preserved for backward compatibility
      district: processedData.district,
      city: processedData.city,
      // New normalized refs
      district_id: district_id || null,
      city_id: city_id || null,
      has_disability:
        processedData.has_disability === "true" ||
        processedData.has_disability === true,
      disability_type: processedData.disability_type,
      disability_description: processedData.disability_description,

      status: processedData.status || "Active",
      profile_picture: processedFiles?.profile_picture_file || null,
      missing_note: processedData.missing_note || null,
    };

    // Create employee with related data in a transaction
    return prisma.$transaction(async (tx) => {
      // Create main employee record
      console.log(
        "Creating employee with payload:",
        JSON.stringify(employeePayload, null, 2)
      );
      let employee;
      try {
        employee = await tx.employee.create({ data: employeePayload });
        console.log(
          "Employee created successfully:",
          employee.id,
          employee.full_name
        );
      } catch (employeeError) {
        console.error("ERROR creating employee record:", employeeError);
        throw employeeError;
      }

      // Create profile picture document record if profile picture is uploaded
      if (processedFiles?.profile_picture_file) {
        console.log(
          "Profile picture uploaded during creation, creating document record"
        );
        try {
          const profilePictureDoc = await tx.employeeDocument.create({
            data: {
              employee_id: employee.id,
              file_type: "profile_picture",
              document_name:
                processedFiles.profile_picture_file.name || "Profile Picture",
              file_path: processedFiles.profile_picture_file,
              file_size: processedFiles.profile_picture_file.size,
              mime_type: processedFiles.profile_picture_file.type,
              is_deleted: false,
            },
          });
          console.log(
            `✅ Created profile picture document ${profilePictureDoc.id} for new employee`
          );
        } catch (error) {
          console.error(
            "❌ Error creating profile picture document:",
            error.message
          );
        }
      }

      // Create past experiences if provided and map temporary IDs to actual IDs
      const experienceIdMapping = {};
      if (past_experiences && Array.isArray(past_experiences)) {
        for (const exp of past_experiences) {
          const createdExperience = await tx.pastExperience.create({
            data: {
              employee_id: employee.id,
              company_name: exp.company_name,
              position: exp.position || null,
              start_date: exp.start_date,
              end_date: exp.end_date,
              description: exp.description || null,
            },
          });
          if (exp.id) {
            experienceIdMapping[exp.id] = createdExperience.id;
          }
        }
      }

      // Create education qualifications if provided and map temporary IDs to actual IDs
      const educationIdMapping = {};
      if (educations && Array.isArray(educations)) {
        for (const edu of educations) {
          // Parse year_of_completion (now DateTime) from date string
          let completionDate = null;
          if (
            edu.year_of_completion &&
            typeof edu.year_of_completion === "string" &&
            edu.year_of_completion.trim() !== ""
          ) {
            const d = new Date(edu.year_of_completion);
            if (!isNaN(d.getTime())) completionDate = d;
          }
          // start_date is now a String (year), just use it directly
          const startYear = edu.start_date && typeof edu.start_date === "string" 
            ? edu.start_date.trim() 
            : null;
          // Coerce level id
          const levelId = edu.education_level_id
            ? parseInt(edu.education_level_id)
            : null;
          const createdEducation = await tx.educationQualification.create({
            data: {
              employee_id: employee.id,
              education_level: edu.education_level || "",
              education_level_id: levelId,
              institution_name: edu.institution_name,
              year_of_completion: completionDate,
              marks_gpa: edu.marks_gpa || null,
              start_date: startYear || null,
            },
          });
          if (edu.id) {
            educationIdMapping[edu.id] = createdEducation.id;
          }
        }
      }

      // Create document records if any
      if (documentRecords && documentRecords.length > 0) {
        console.log(
          `Creating ${documentRecords.length} document records for employee ${employee.id}`
        );
        const documentsToCreate = documentRecords.map((doc) => {
          let mappedAssociatedId = doc.associated_id;
          if (doc.associated_id) {
            if (
              doc.file_type === "education" &&
              educationIdMapping[doc.associated_id]
            ) {
              mappedAssociatedId = educationIdMapping[doc.associated_id];
            } else if (
              doc.file_type === "experience" &&
              experienceIdMapping[doc.associated_id]
            ) {
              mappedAssociatedId = experienceIdMapping[doc.associated_id];
            }
          }
          return {
            ...doc,
            associated_id: mappedAssociatedId,
            employee_id: employee.id,
          };
        });
        console.log("Documents to create:", documentsToCreate);
        try {
          const result = await tx.employeeDocument.createMany({
            data: documentsToCreate,
          });
          console.log("Document records created successfully:", result);
          const createdDocs = await tx.employeeDocument.findMany({
            where: {
              employee_id: employee.id,
              is_deleted: false,
            },
          });
          console.log(
            `Verified: ${createdDocs.length} documents created for employee ${employee.id}`
          );
        } catch (docError) {
          console.error("ERROR creating document records:", docError);
          throw docError;
        }
      } else {
        console.log("No document records to create");
      }

      // Return employee with all related data
      return tx.employee.findFirst({
        where: {
          id: employee.id,
          is_deleted: false,
        },
        include: {
          districtRef: true,
          cityRef: true,
          pastExperiences: true,
          educationQualifications: { include: { level: true } },
          documents: true,
          employmentRecords: {
            include: {
              department: true,
              designation: true,
              salary: true,
              location: true,
            },
          },
        },
      });
    });
  },

  updateEmployee: async (id, data, processedFiles, documentRecords) => {
    console.log("Updating employee with data:", JSON.stringify(data, null, 2));

    const {
      past_experiences,
      educations,
      experience_documents,
      education_documents,
      documents_to_remove,
      new_documents,
      ...rest
    } = data;

    // Process date fields for employee data
    const processedData = { ...rest };
    const dateFields = ["cnic_issue_date", "cnic_expire_date", "date_of_birth"];
    dateFields.forEach((field) => {
      if (
        processedData[field] === "" ||
        processedData[field] === null ||
        processedData[field] === undefined
      ) {
        processedData[field] = null;
      } else if (
        processedData[field] &&
        typeof processedData[field] === "string" &&
        processedData[field].trim() !== ""
      ) {
        try {
          processedData[field] = new Date(processedData[field]);
        } catch (error) {
          console.error(
            `Invalid date format for ${field}: ${processedData[field]}`
          );
          processedData[field] = null;
        }
      }
    });

    // Prepare main employee data
    const employeeUpdateData = {};
    const allowedFields = [
      "employee_id",
      "full_name",
      "father_husband_name",
      "relationship_type",
      "mother_name",
      "cnic",
      "cnic_issue_date",
      "cnic_expire_date",
      "date_of_birth",
      "gender",
      "marital_status",
      "nationality",
      "religion",
      "blood_group",
      "domicile_district",
      "mobile_number",
      "whatsapp_number",
      "email",
      "present_address",
      "permanent_address",
      "same_address",
      "district",
      "city",
      "district_id",
      "city_id",
      "has_disability",
      "disability_type",
      "disability_description",
      "status",
      "missing_note",
      "profile_picture",
    ];

    for (const key of allowedFields) {
      if (processedData[key] !== undefined) {
        if (key === "same_address" || key === "has_disability") {
          employeeUpdateData[key] =
            processedData[key] === "true" || processedData[key] === true;
        } else if (dateFields.includes(key)) {
          employeeUpdateData[key] = processedData[key]; // Use processed date or null
        } else if (key === "district_id" || key === "city_id") {
          employeeUpdateData[key] = processedData[key]
            ? parseInt(processedData[key])
            : null;
        } else {
          employeeUpdateData[key] = processedData[key];
        }
      }
    }

    // Sanitize profile_picture before file logic: if provided but not a non-empty string, set null
    if (
      !processedFiles?.profile_picture_file &&
      Object.prototype.hasOwnProperty.call(processedData, "profile_picture")
    ) {
      const v = processedData.profile_picture;
      if (typeof v !== "string" || v.trim() === "" || v === "null") {
        employeeUpdateData.profile_picture = null;
      }
    }

    // Debug logging for profile picture handling
    console.log("🔍 Profile picture debug info:");
    console.log("  - data.profile_picture:", data.profile_picture);
    console.log("  - data.profile_picture type:", typeof data.profile_picture);
    console.log(
      "  - processedFiles?.profile_picture_file:",
      processedFiles?.profile_picture_file
    );

    // Determine intent
    const hasNewProfilePic = !!processedFiles?.profile_picture_file;
    const explicitRemove =
      Object.prototype.hasOwnProperty.call(data, "profile_picture") &&
      (data.profile_picture === null ||
        data.profile_picture === "null" ||
        data.profile_picture === "");

    // Apply profile picture changes
    if (hasNewProfilePic) {
      console.log(
        "Found profile picture file, updating employee:",
        processedFiles.profile_picture_file
      );
      employeeUpdateData.profile_picture = processedFiles.profile_picture_file;
    } else if (explicitRemove) {
      console.log("Profile picture explicitly removed, setting to null");
      employeeUpdateData.profile_picture = null;
    } // else: leave undefined to keep existing value

    // Ensure only string or null if provided
    if (
      employeeUpdateData.hasOwnProperty("profile_picture") &&
      employeeUpdateData.profile_picture !== null &&
      typeof employeeUpdateData.profile_picture !== "string"
    ) {
      console.log(
        "🔄 Coercing non-string profile_picture to null before DB update"
      );
      employeeUpdateData.profile_picture = null;
    }

    // Update employee with related data in a transaction
    return prisma.$transaction(async (tx) => {
      // Update main employee record
      const employee = await tx.employee.update({
        where: { id: parseInt(id) },
        data: employeeUpdateData,
      });

      console.log("🔍 Employee update verification:");
      console.log("  - Updated employee ID:", employee.id);
      console.log(
        "  - Updated employee profile_picture:",
        employee.profile_picture
      );
      console.log(
        "  - Expected profile_picture value:",
        employeeUpdateData.profile_picture
      );
      console.log(
        "  - Profile picture update successful:",
        employeeUpdateData.hasOwnProperty("profile_picture")
          ? employee.profile_picture === employeeUpdateData.profile_picture
          : "unchanged"
      );

      // Handle profile picture changes - update corresponding document record
      console.log("🔍 Profile picture document handling debug:");
      console.log("  - data.profile_picture:", data.profile_picture);
      console.log(
        "  - data.profile_picture type:",
        typeof data.profile_picture
      );
      console.log(
        "  - employeeUpdateData.profile_picture:",
        employeeUpdateData.profile_picture
      );

      // Removal only if explicitly requested and no new file uploaded
      const isProfilePictureRemoved = explicitRemove && !hasNewProfilePic;

      console.log("🔍 Profile picture removal check:");
      console.log("  - isProfilePictureRemoved:", isProfilePictureRemoved);
      console.log("  - explicitRemove:", explicitRemove);
      console.log("  - hasNewProfilePic:", hasNewProfilePic);

      if (isProfilePictureRemoved) {
        console.log(
          "Profile picture removed, updating corresponding document record"
        );
        try {
          // Find and soft delete the profile picture document
          const profilePictureDoc = await tx.employeeDocument.findFirst({
            where: {
              employee_id: employee.id,
              file_type: "profile_picture",
              is_deleted: false,
            },
          });

          console.log("  - Found profile picture document:", profilePictureDoc);

          if (profilePictureDoc) {
            await tx.employeeDocument.update({
              where: { id: profilePictureDoc.id },
              data: { is_deleted: true },
            });
            console.log(
              `✅ Soft deleted profile picture document ${profilePictureDoc.id}`
            );
          } else {
            console.log("No profile picture document found to soft delete");
          }
        } catch (error) {
          console.error(
            "❌ Error soft deleting profile picture document:",
            error.message
          );
        }
      } else if (hasNewProfilePic) {
        console.log(
          "New profile picture uploaded, updating corresponding document record"
        );
        try {
          // Soft delete any existing profile picture document
          const existingProfilePictureDoc = await tx.employeeDocument.findFirst(
            {
              where: {
                employee_id: employee.id,
                file_type: "profile_picture",
                is_deleted: false,
              },
            }
          );

          if (existingProfilePictureDoc) {
            await tx.employeeDocument.update({
              where: { id: existingProfilePictureDoc.id },
              data: { is_deleted: true },
            });
            console.log(
              `✅ Soft deleted existing profile picture document ${existingProfilePictureDoc.id}`
            );
          }

          // Create new profile picture document record
          const newProfilePictureDoc = await tx.employeeDocument.create({
            data: {
              employee_id: employee.id,
              file_type: "profile_picture",
              document_name:
                processedFiles.profile_picture_file.name || "Profile Picture",
              file_path: processedFiles.profile_picture_file,
              file_size: processedFiles.profile_picture_file.size,
              mime_type: processedFiles.profile_picture_file.type,
              is_deleted: false,
            },
          });
          console.log(
            `✅ Created new profile picture document ${newProfilePictureDoc.id}`
          );
        } catch (error) {
          console.error(
            "❌ Error updating profile picture document:",
            error.message
          );
        }
      }

      // Initialize ID mappings for new records
      const experienceIdMapping = {};
      const educationIdMapping = {};

      // Process past experiences
      if (past_experiences && Array.isArray(past_experiences)) {
        console.log(
          "Received past_experiences:",
          JSON.stringify(past_experiences, null, 2)
        );
        const existingExperiences = await tx.pastExperience.findMany({
          where: { employee_id: employee.id, is_deleted: false },
        });

        const existingExpMap = new Map(
          existingExperiences.map((exp) => [exp.id, exp])
        );
        const incomingExpMap = new Map(
          past_experiences
            .filter(
              (exp) =>
                exp.id && !isNaN(parseInt(exp.id)) && parseInt(exp.id) > 0
            )
            .map((exp) => [parseInt(exp.id), exp])
        );

        // Update existing experiences
        for (const [expId, incomingExp] of incomingExpMap) {
          if (existingExpMap.has(expId)) {
            await tx.pastExperience.update({
              where: { id: expId },
              data: {
                company_name: incomingExp.company_name || "",
                position: incomingExp.position || "",
                start_date: incomingExp.start_date || "",
                end_date: incomingExp.end_date || "",
                description: incomingExp.description || "",
              },
            });
            existingExpMap.delete(expId);
          }
        }

        // Create new experiences
        for (const incomingExp of past_experiences.filter(
          (exp) => !exp.id || isNaN(parseInt(exp.id))
        )) {
          const createdExp = await tx.pastExperience.create({
            data: {
              employee_id: employee.id,
              company_name: incomingExp.company_name || "",
              position: incomingExp.position || "",
              start_date: incomingExp.start_date || "",
              end_date: incomingExp.end_date || "",
              description: incomingExp.description || "",
            },
          });
          if (incomingExp.id)
            experienceIdMapping[incomingExp.id] = createdExp.id;
        }

        // Delete remaining existing experiences not in request
        for (const leftover of existingExpMap.values()) {
          await tx.pastExperience.delete({ where: { id: leftover.id } });
        }
      } else {
        console.log("No past_experiences provided or not an array");
      }

      // Handle educations
      if (educations && Array.isArray(educations)) {
        console.log(
          "Received educations:",
          JSON.stringify(educations, null, 2)
        );
        const existingEducations = await tx.educationQualification.findMany({
          where: { employee_id: employee.id, is_deleted: false },
        });
        console.log(
          "Existing educations:",
          JSON.stringify(existingEducations, null, 2)
        );

        const existingEduMap = new Map(
          existingEducations.map((edu) => [edu.id, edu])
        );
        const incomingEduMap = new Map(
          educations
            .filter(
              (edu) =>
                edu.id && !isNaN(parseInt(edu.id)) && parseInt(edu.id) > 0
            )
            .map((edu) => [parseInt(edu.id), edu])
        );
        const newEducations = educations.filter((edu) => {
          const eduId = parseInt(edu.id);
          return !edu.id || isNaN(eduId) || !existingEduMap.has(eduId);
        });

        console.log(
          "New educations to create:",
          JSON.stringify(newEducations, null, 2)
        );
        console.log(
          "Incoming educations with IDs:",
          JSON.stringify([...incomingEduMap.values()], null, 2)
        );

        // Update existing educations
        for (const [eduId, incomingEdu] of incomingEduMap) {
          if (existingEduMap.has(eduId)) {
            console.log(`Updating education ID ${eduId}:`, incomingEdu);
          // Parse year_of_completion (now DateTime) from date string
          let completionDate = null;
          if (
            incomingEdu.year_of_completion &&
            typeof incomingEdu.year_of_completion === "string" &&
            incomingEdu.year_of_completion.trim() !== ""
          ) {
            const d = new Date(incomingEdu.year_of_completion);
            if (!isNaN(d.getTime())) completionDate = d;
          }
          // start_date is now a String (year), just use it directly
          const startYear = incomingEdu.start_date && typeof incomingEdu.start_date === "string" 
            ? incomingEdu.start_date.trim() 
            : null;
          const levelId = incomingEdu.education_level_id
            ? parseInt(incomingEdu.education_level_id)
            : null;
            await tx.educationQualification.update({
              where: { id: eduId },
              data: {
                education_level: incomingEdu.education_level || "",
                education_level_id: levelId,
                institution_name: incomingEdu.institution_name || "",
                year_of_completion: completionDate,
                marks_gpa: incomingEdu.marks_gpa || "",
                start_date: startYear || null,
              },
            });
            existingEduMap.delete(eduId);
            console.log(`Updated education ID ${eduId}`);
          }
        }

        // Create new educations and store ID mappings
        for (const edu of newEducations) {
          if (!edu.institution_name || edu.institution_name.trim() === "") {
            console.warn(
              "Skipping education with missing or empty institution_name:",
              JSON.stringify(edu, null, 2)
            );
            continue;
          }
          // Parse year_of_completion (now DateTime) from date string
          let completionDate = null;
          if (
            edu.year_of_completion &&
            typeof edu.year_of_completion === "string" &&
            edu.year_of_completion.trim() !== ""
          ) {
            const d = new Date(edu.year_of_completion);
            if (!isNaN(d.getTime())) completionDate = d;
          }
          // start_date is now a String (year), just use it directly
          const startYear = edu.start_date && typeof edu.start_date === "string" 
            ? edu.start_date.trim() 
            : null;
          const levelId = edu.education_level_id
            ? parseInt(edu.education_level_id)
            : null;
          try {
            const createdEdu = await tx.educationQualification.create({
              data: {
                employee: { connect: { id: employee.id } },
                education_level: edu.education_level || "",
                education_level_id: levelId,
                institution_name: edu.institution_name,
                year_of_completion: completionDate,
                marks_gpa: edu.marks_gpa || "",
                start_date: startYear || null,
              },
            });
            if (edu.id) {
              educationIdMapping[edu.id] = createdEdu.id; // Map temporary ID to database ID
            }
            console.log(
              "Created new education:",
              createdEdu.id,
              edu.education_level,
              edu.institution_name
            );
          } catch (error) {
            console.error(
              "Error creating education:",
              error.message,
              "Data:",
              JSON.stringify(edu, null, 2)
            );
          }
        }

        // Delete unprocessed existing educations
        const incomingEducationIds = (educations || [])
          .map((edu) => parseInt(edu.id))
          .filter((id) => !isNaN(id));

        console.log(
          "Incoming education IDs from request:",
          incomingEducationIds
        );
        console.log(
          "Existing education IDs in DB:",
          existingEducations.map((e) => e.id)
        );

        // 3. Find educations that should be deleted (not in request)
        const educationsToDelete = existingEducations.filter(
          (edu) => !incomingEducationIds.includes(edu.id)
        );

        console.log(
          "Educations to delete:",
          educationsToDelete.map((e) => e.id)
        );

        // 4. Delete documents and educations
        for (const edu of educationsToDelete) {
          try {
            await tx.employeeDocument.deleteMany({
              where: {
                employee_id: employee.id,
                file_type: "education",
                associated_id: edu.id,
              },
            });
            console.log(`Deleted documents for education ${edu.id}`);

            await tx.educationQualification.delete({ where: { id: edu.id } });
            console.log(`✅ Deleted education ${edu.id}`);
          } catch (err) {
            console.error(
              `❌ Error deleting education ${edu.id}:`,
              err.message
            );
          }
        }
      } else {
        console.log("No educations provided or not an array");
      }
      // Delete disability document if has_disability is false or not provided
      if (!employeeUpdateData.has_disability) {
        await tx.employeeDocument.deleteMany({
          where: {
            employee_id: employee.id,
            file_type: "disability",
            associated_id: null,
          },
        });
        console.log(
          "Deleted disability document as has_disability is false or not provided"
        );
      }

      // Process document changes
      await processDocumentChanges(
        tx,
        employee.id,
        data,
        documentRecords || []
      );

      // Add new document records with ID mapping
      if (documentRecords && documentRecords.length > 0) {
        console.log(
          "Processing document records for employee update:",
          JSON.stringify(documentRecords, null, 2)
        );
        const singleDocumentTypes = [
          "cnic_front",
          "cnic_back",
          "domicile",
          "disability",
        ];

        // Map temporary IDs to database IDs for document records
        const documentsToCreate = documentRecords.map((doc) => {
          let mappedAssociatedId = doc.associated_id;
          if (doc.associated_id) {
            if (
              doc.file_type === "education" &&
              educationIdMapping[doc.associated_id]
            ) {
              mappedAssociatedId = educationIdMapping[doc.associated_id];
              console.log(
                `Mapped education associated_id ${doc.associated_id} to ${mappedAssociatedId}`
              );
            } else if (
              doc.file_type === "experience" &&
              experienceIdMapping[doc.associated_id]
            ) {
              mappedAssociatedId = experienceIdMapping[doc.associated_id];
              console.log(
                `Mapped experience associated_id ${doc.associated_id} to ${mappedAssociatedId}`
              );
            } else if (doc.associated_id > 2147483647) {
              console.log(
                `Removing large associated_id ${doc.associated_id} for document ${doc.document_name}`
              );
              mappedAssociatedId = null;
            }
          }
          return {
            ...doc,
            associated_id: mappedAssociatedId,
            employee_id: employee.id,
          };
        });

        // Delete existing single-type document records (without deleting physical files)
        for (const doc of documentsToCreate) {
          if (singleDocumentTypes.includes(doc.file_type)) {
            const whereCondition = {
              employee_id: employee.id,
              file_type: doc.file_type,
              associated_id: null,
            };

            await tx.employeeDocument.deleteMany({
              where: whereCondition,
            });
            console.log(
              `Deleted existing document records for ${doc.file_type}`
            );
          }
        }

        console.log(
          `Creating ${documentsToCreate.length} new document records:`,
          JSON.stringify(documentsToCreate, null, 2)
        );
        const result = await tx.employeeDocument.createMany({
          data: documentsToCreate,
        });
        console.log(`Successfully created ${result.count} document records`);
      }

      // Return employee with all related data
      const finalEmployee = await tx.employee.findFirst({
        where: {
          id: employee.id,
          is_deleted: false,
        },
        include: {
          districtRef: true,
          cityRef: true,
          pastExperiences: true,
          educationQualifications: { include: { level: true } },
          documents: true,
          employmentRecords: {
            include: {
              department: true,
              designation: true,
              salary: true,
              location: true,
            },
          },
        },
      });

      // Final verification for profile picture removal
      if (isProfilePictureRemoved) {
        console.log(
          "🔍 Final verification - checking if profile picture was actually removed:"
        );
        console.log(
          "  - Employee profile_picture field:",
          finalEmployee.profile_picture
        );
        console.log(
          "  - Profile picture documents:",
          finalEmployee.documents.filter(
            (d) => d.file_type === "profile_picture" && !d.is_deleted
          )
        );

        if (finalEmployee.profile_picture === null) {
          console.log(
            "✅ Profile picture successfully removed from employee record"
          );
        } else {
          console.log(
            "❌ Profile picture still exists in employee record:",
            finalEmployee.profile_picture
          );
        }

        const activeProfilePictureDocs = finalEmployee.documents.filter(
          (d) => d.file_type === "profile_picture" && !d.is_deleted
        );
        if (activeProfilePictureDocs.length === 0) {
          console.log(
            "✅ All profile picture documents successfully soft-deleted"
          );
        } else {
          console.log(
            "❌ Profile picture documents still exist:",
            activeProfilePictureDocs.map((d) => d.id)
          );
        }
      }

      return finalEmployee;
    });
  },
  getAllEmployees: async (includeDeleted = false) => {
    try {
      const employees = await prisma.employee.findMany({
        where: includeDeleted ? {} : { is_deleted: false },
        include: {
          districtRef: true,
          cityRef: true,
          pastExperiences: {
            where: includeDeleted ? {} : { is_deleted: false },
          },
          educationQualifications: {
            where: includeDeleted ? {} : { is_deleted: false },
            include: { level: true },
          },
          documents: {
            where: includeDeleted ? {} : { is_deleted: false },
          },
          employmentRecords: {
            where: includeDeleted ? {} : { is_deleted: false },
            include: {
              department: {
                where: includeDeleted ? {} : { is_deleted: false },
              },
              designation: {
                where: includeDeleted ? {} : { is_deleted: false },
              },
              role_tag: {
                where: includeDeleted ? {} : { is_deleted: false },
              },
              scale_grade: {
                where: includeDeleted ? {} : { is_deleted: false },
              },
              salary: {
                where: includeDeleted ? {} : { is_deleted: false },
              },
              location: {
                where: includeDeleted ? {} : { is_deleted: false },
              },
            },
          },
        },
      });
      return employees;
    } catch (error) {
      console.log("Error in getAllEmployees:", error);
      return [];
    }
  },

  getAllEmployeesPaginated: async (params = {}) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        department_id,
        designation_id,
        designation_title,
        location_id,
        scale_grade_id,
      } = params;
      const skip = (page - 1) * limit;

      // Build where clause for employees
      const employeeWhere = {
        is_deleted: false,
        ...(search && {
          OR: [
            { full_name: { contains: search, mode: "insensitive" } },
            { employee_id: { contains: search, mode: "insensitive" } },
            { cnic: { contains: search, mode: "insensitive" } },
            { mobile_number: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      // Build where clause for employment records
      const employmentWhere = {
        is_current: true,
        is_deleted: false,
        ...(department_id && { department_id: parseInt(department_id) }),
        ...(designation_id && { designation_id: parseInt(designation_id) }),
        ...(designation_title && {
          designation: {
            title: { equals: designation_title, mode: "insensitive" },
          },
        }),
        ...(location_id && { location_id: parseInt(location_id) }),
        ...(scale_grade_id && { scale_grade_id: parseInt(scale_grade_id) }),
      };

      // If we have filters on employment, we need to filter employees by their employment records
      if (
        department_id ||
        designation_id ||
        designation_title ||
        location_id ||
        scale_grade_id
      ) {
        employeeWhere.employmentRecords = {
          some: employmentWhere,
        };
      }

      const [employees, total] = await Promise.all([
        prisma.employee.findMany({
          where: employeeWhere,
          skip,
          take: parseInt(limit),
          include: {
            employmentRecords: {
              where: {
                is_current: true,
                is_deleted: false,
              },
              include: {
                department: true,
                designation: true,
                role_tag: true,
                scale_grade: true,
                location: {
                  include: {
                    city: true,
                    district: true,
                  },
                },
              },
            },
          },
          orderBy: { full_name: "asc" },
        }),
        prisma.employee.count({ where: employeeWhere }),
      ]);

      return {
        success: true,
        employees,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      };
    } catch (error) {
      console.log("Error in getAllEmployeesPaginated:", error);
      throw error;
    }
  },

  getEmployeeById: async (id, includeDeleted = false) => {
    const emp = await prisma.employee.findUnique({
      where: {
        id: parseInt(id),
        ...(includeDeleted ? {} : { is_deleted: false }),
      },
      include: {
        districtRef: true,
        cityRef: true,
        pastExperiences: {
          where: includeDeleted ? {} : { is_deleted: false },
        },
        educationQualifications: {
          where: includeDeleted ? {} : { is_deleted: false },
          include: { level: true },
        },
        documents: {
          where: includeDeleted ? {} : { is_deleted: false },
        },
        employmentRecords: {
          where: includeDeleted ? {} : { is_deleted: false },
          include: {
            department: {
              where: includeDeleted ? {} : { is_deleted: false },
            },
            designation: {
              where: includeDeleted ? {} : { is_deleted: false },
            },
            role_tag: {
              where: includeDeleted ? {} : { is_deleted: false },
            },
            scale_grade: {
              where: includeDeleted ? {} : { is_deleted: false },
            },
            salary: {
              where: includeDeleted ? {} : { is_deleted: false },
            },
            location: {
              where: includeDeleted ? {} : { is_deleted: false },
            },
          },
        },
      },
    });
    return emp;
  },

  deleteEmployee: async (id) => {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: parseInt(id) },
      });
      if (!employee) return null;

      // Check for active child records
      const validation = await validateSoftDelete('Employee', parseInt(id));
      if (!validation.canDelete) {
        throw new Error(validation.message);
      }

      // Mask unique fields to prevent unique constraint violations
      const { masked } = maskUniqueFieldsForSoftDelete('Employee', employee);

      // Soft delete employee and related records
      await prisma.employee.update({
        where: { id: parseInt(id) },
        data: { 
          is_deleted: true,
          ...masked, // Apply masked unique fields
        },
      });
      await prisma.pastExperience.updateMany({
        where: { employee_id: parseInt(id) },
        data: { is_deleted: true },
      });
      await prisma.educationQualification.updateMany({
        where: { employee_id: parseInt(id) },
        data: { is_deleted: true },
      });
      await prisma.employment.updateMany({
        where: { employee_id: parseInt(id) },
        data: { is_deleted: true },
      });

      return { success: true };
    } catch (error) {
      console.error("Error deleting employee:", error.message);
      throw new Error(error.message || "Failed to delete employee");
    }
  },

  restoreEmployee: async (id) => {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: parseInt(id) },
      });
      
      if (!employee) {
        throw new Error("Employee not found");
      }
      
      if (!employee.is_deleted) {
        throw new Error("Employee is not soft-deleted");
      }

      // Restore unique fields to their original values
      const restored = restoreUniqueFieldsForUndelete('Employee', employee);

      // Restore employee and related records
      await prisma.employee.update({
        where: { id: parseInt(id) },
        data: { 
          is_deleted: false,
          ...restored, // Restore original unique field values
        },
      });
      
      // Restore related records
      await prisma.pastExperience.updateMany({
        where: { employee_id: parseInt(id) },
        data: { is_deleted: false },
      });
      await prisma.educationQualification.updateMany({
        where: { employee_id: parseInt(id) },
        data: { is_deleted: false },
      });
      await prisma.employment.updateMany({
        where: { employee_id: parseInt(id) },
        data: { is_deleted: false },
      });

      const restoredEmployee = await prisma.employee.findUnique({
        where: { id: parseInt(id) },
      });

      return { 
        success: true,
        message: `Employee ${restoredEmployee.full_name} restored successfully`,
        restoredEmployee,
      };
    } catch (error) {
      console.error("Error restoring employee:", error.message);
      throw new Error(`Failed to restore employee: ${error.message}`);
    }
  },
};

const processDocumentChanges = async (
  tx,
  employeeId,
  data,
  documentRecords
) => {
  console.log("Processing document changes for employee:", employeeId);
  console.log("Documents to remove:", data.documents_to_remove);
  console.log("Documents to remove type:", typeof data.documents_to_remove);
  console.log(
    "Documents to remove isArray:",
    Array.isArray(data.documents_to_remove)
  );
  console.log("Document records to add:", documentRecords);

  // Step 1: Delete document records specified in documents_to_remove
  if (
    data.documents_to_remove &&
    Array.isArray(data.documents_to_remove) &&
    data.documents_to_remove.length > 0
  ) {
    try {
      // Ensure documents_to_remove is an array and filter out invalid values
      const validDocumentIds = data.documents_to_remove
        .filter((id) => id != null && id !== "")
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id) && id > 0);

      console.log("Valid document IDs to remove:", validDocumentIds);

      if (validDocumentIds.length > 0) {
        await tx.employeeDocument.deleteMany({
          where: {
            id: { in: validDocumentIds },
            employee_id: parseInt(employeeId),
          },
        });
        console.log(
          `Deleted ${validDocumentIds.length} document records from employeeDocument table`
        );
      }
    } catch (error) {
      console.error("Error deleting document records:", error);
      throw error;
    }
  } else {
    console.log("No documents to remove or invalid format");
  }

  // Step 2: Handle new document records (already handled in updateEmployee for creation)
  // No additional action needed here since document creation is handled in updateEmployee
};

module.exports = employeeService;
