const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { encrypt, decrypt } = require("../utils/cryptoUtil");
const {
  maskUniqueFieldsForSoftDelete,
  restoreUniqueFieldsForUndelete,
} = require("../utils/softDeleteUtil");
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
      full_name,
      father_husband_name: processedData.father_husband_name,
      relationship_type: processedData.relationship_type,
      mother_name: processedData.mother_name,
      cnic: processedData.cnic,
      // Biometric / attendance device user id (optional, unique)
      deviceUserId: (() => {
        const v = String(processedData.deviceUserId ?? "").trim();
        return v === "" ? null : v;
      })(),
      cnic_issue_date: processedData.cnic_issue_date,
      cnic_expire_date: processedData.cnic_expire_date,
      cnic_lifetime:
        processedData.cnic_lifetime === "true" ||
        processedData.cnic_lifetime === true,
      date_of_birth: processedData.date_of_birth,
      gender: processedData.gender,
      marital_status: processedData.marital_status,
      nationality: processedData.nationality,
      religion: processedData.religion,
      blood_group: processedData.blood_group,
      domicile_district: processedData.domicile_district,
      mobile_number: processedData.mobile_number,
      whatsapp_number: processedData.whatsapp_number,
      email: (() => {
        const v = String(processedData.email ?? "").trim();
        return v === "" ? null : v;
      })(),
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
          const startYear =
            edu.start_date && typeof edu.start_date === "string"
              ? edu.start_date.trim()
              : null;
          // Coerce level id
          const levelId = edu.education_level_id
            ? parseInt(edu.education_level_id)
            : null;
          // Build data object conditionally: include education_level_id only if levelId is a valid number
          const eduCreateData = {
            employee_id: employee.id,
            education_level: edu.education_level || "",
            institution_name: edu.institution_name,
            year_of_completion: completionDate,
            marks_gpa: edu.marks_gpa || null,
            roll_no: edu.roll_no || null,
            registration_number: edu.registration_number || null,
            certificate_number: edu.certificate_number || null,
            total_marks: edu.total_marks ? parseInt(edu.total_marks) : null,
            start_date: startYear || null,
          };
          if (typeof levelId === "number" && !isNaN(levelId)) {
            eduCreateData.education_level_id = levelId; // only include if column exists in generated client
          }
          const createdEducation = await tx.educationQualification.create({
            data: eduCreateData,
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
      "full_name",
      "father_husband_name",
      "relationship_type",
      "mother_name",
      "cnic",
      "deviceUserId",
      "cnic_issue_date",
      "cnic_expire_date",
      "cnic_lifetime",
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
        if (
          key === "same_address" ||
          key === "has_disability" ||
          key === "cnic_lifetime"
        ) {
          employeeUpdateData[key] =
            processedData[key] === "true" || processedData[key] === true;
        } else if (dateFields.includes(key)) {
          employeeUpdateData[key] = processedData[key]; // Use processed date or null
        } else if (key === "district_id" || key === "city_id") {
          employeeUpdateData[key] = processedData[key]
            ? parseInt(processedData[key])
            : null;
        } else if (key === "deviceUserId" || key === "email") {
          // Unique fields: store trimmed value or null (never empty string)
          const v = String(processedData[key] ?? "").trim();
          employeeUpdateData[key] = v === "" ? null : v;
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

      // Process past experiences (prevent duplication on update)
      if (past_experiences && Array.isArray(past_experiences)) {
        console.log(
          "Received past_experiences:",
          JSON.stringify(past_experiences, null, 2)
        );
        const existingExperiences = await tx.pastExperience.findMany({
          where: { employee_id: employee.id, is_deleted: false },
        });
        const existingIds = new Set(existingExperiences.map((e) => e.id));

        // Separate incoming into existing and new
        const incomingExisting = [];
        const incomingNew = [];
        for (const exp of past_experiences) {
          const parsedId =
            exp.id !== undefined && exp.id !== null ? parseInt(exp.id) : null;
          if (
            parsedId &&
            !isNaN(parsedId) &&
            parsedId > 0 &&
            existingIds.has(parsedId)
          ) {
            incomingExisting.push({ parsedId, exp });
          } else if (
            parsedId === null ||
            parsedId === undefined ||
            isNaN(parsedId) ||
            parsedId < 0
          ) {
            incomingNew.push(exp);
          } else if (parsedId > 0 && !existingIds.has(parsedId)) {
            // Positive id that does not exist in DB: treat as new (e.g., stale client state)
            incomingNew.push(exp);
          }
        }

        console.log("Experience update summary:", {
          existingInDB: existingExperiences.length,
          incomingExistingCount: incomingExisting.length,
          incomingNewCount: incomingNew.length,
        });

        // Update existing experiences
        for (const { parsedId, exp } of incomingExisting) {
          try {
            await tx.pastExperience.update({
              where: { id: parsedId },
              data: {
                company_name: exp.company_name || "",
                position: exp.position || "",
                start_date: exp.start_date || "",
                end_date: exp.end_date || "",
                description: exp.description || "",
              },
            });
            console.log(`Updated past experience ${parsedId}`);
          } catch (err) {
            console.error(
              `Error updating past experience ${parsedId}:`,
              err.message
            );
          }
        }

        // Create new experiences
        for (const exp of incomingNew) {
          try {
            const created = await tx.pastExperience.create({
              data: {
                employee_id: employee.id,
                company_name: exp.company_name || "",
                position: exp.position || "",
                start_date: exp.start_date || "",
                end_date: exp.end_date || "",
                description: exp.description || "",
              },
            });
            if (exp.id) experienceIdMapping[exp.id] = created.id;
            console.log("Created past experience", created.id);
          } catch (err) {
            console.error(
              "Error creating past experience:",
              err.message,
              "Data:",
              exp
            );
          }
        }

        // Determine deletions: existing DB records not present in incoming positive IDs
        const incomingPositiveIds = past_experiences
          .map((exp) => {
            const parsedId =
              exp.id !== undefined && exp.id !== null ? parseInt(exp.id) : null;
            return parsedId && !isNaN(parsedId) && parsedId > 0
              ? parsedId
              : null;
          })
          .filter((id) => id !== null);

        const toDelete = existingExperiences.filter(
          (e) => !incomingPositiveIds.includes(e.id)
        );
        console.log(
          "Past experiences to delete:",
          toDelete.map((e) => e.id)
        );
        for (const exp of toDelete) {
          try {
            await tx.pastExperience.delete({ where: { id: exp.id } });
            console.log("Deleted past experience", exp.id);
          } catch (err) {
            console.error(
              "Error deleting past experience",
              exp.id,
              err.message
            );
          }
        }
      } else {
        console.log("No past_experiences provided or not an array");
      }

      // Handle educations ONLY if client explicitly sent the field
      const educationsProvidedFlag = data._educationsProvided === true;
      if (!educationsProvidedFlag) {
        console.log(
          "ℹ️ Skipping education processing — field not provided in request (existing records preserved)."
        );
      }
      const educationsArray =
        educationsProvidedFlag && Array.isArray(educations) ? educations : [];
      if (educationsProvidedFlag) {
        console.log(
          "Received educations (provided flag true):",
          JSON.stringify(educationsArray, null, 2)
        );
        console.log(
          "Educations type:",
          typeof educations,
          "Is array:",
          Array.isArray(educations),
          "Length:",
          educationsArray.length
        );
      }

      // Only enter processing logic if field was provided
      if (educationsProvidedFlag) {
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
          educationsArray
            .filter(
              (edu) =>
                edu.id && !isNaN(parseInt(edu.id)) && parseInt(edu.id) > 0
            )
            .map((edu) => [parseInt(edu.id), edu])
        );
        // Filter new educations: those without id, null id, or negative id (temporary IDs)
        const newEducations = educationsArray.filter((edu) => {
          if (!edu.id || edu.id === null || edu.id === undefined) return true;
          const eduId = parseInt(edu.id);
          if (isNaN(eduId)) return true;
          // Negative IDs are temporary IDs for new entries
          if (eduId < 0) return true;
          // Positive IDs that don't exist in DB are also new
          return !existingEduMap.has(eduId);
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
            const startYear =
              incomingEdu.start_date &&
              typeof incomingEdu.start_date === "string"
                ? incomingEdu.start_date.trim()
                : null;
            const levelId = incomingEdu.education_level_id
              ? parseInt(incomingEdu.education_level_id)
              : null;

            // Ensure both required fields have valid values (preserve existing if not provided)
            const existingEdu = existingEduMap.get(eduId);
            const finalEducationLevel =
              incomingEdu.education_level &&
              incomingEdu.education_level.trim() !== ""
                ? incomingEdu.education_level.trim()
                : existingEdu?.education_level || "";
            const finalInstitutionName =
              incomingEdu.institution_name &&
              incomingEdu.institution_name.trim() !== ""
                ? incomingEdu.institution_name.trim()
                : existingEdu?.institution_name || "";

            const eduUpdateData = {
              education_level: finalEducationLevel,
              institution_name: finalInstitutionName,
              year_of_completion: completionDate,
              marks_gpa: incomingEdu.marks_gpa || "",
              roll_no: incomingEdu.roll_no ?? undefined,
              registration_number: incomingEdu.registration_number ?? undefined,
              certificate_number: incomingEdu.certificate_number ?? undefined,
              start_date: startYear || null,
            };
            if (typeof levelId === "number" && !isNaN(levelId)) {
              eduUpdateData.education_level_id = levelId;
            }
            await tx.educationQualification.update({
              where: { id: eduId },
              data: eduUpdateData,
            });
            existingEduMap.delete(eduId);
            console.log(`Updated education ID ${eduId}`);
          }
        }

        // Create new educations and store ID mappings
        for (const edu of newEducations) {
          // Both education_level and institution_name are REQUIRED fields in the schema
          // Ensure we have valid values for both
          const hasValidInstitutionName =
            edu.institution_name && edu.institution_name.trim() !== "";
          const hasValidEducationLevel =
            edu.education_level && edu.education_level.trim() !== "";

          // Always create education entries, even if fields are missing (use placeholders)
          // This ensures documents can be associated even if education data is incomplete
          const finalInstitutionName = hasValidInstitutionName
            ? edu.institution_name.trim()
            : "N/A";
          const finalEducationLevel = hasValidEducationLevel
            ? edu.education_level.trim()
            : "N/A";

          console.log(
            `Creating education with institution: "${finalInstitutionName}", level: "${finalEducationLevel}"`,
            JSON.stringify(edu, null, 2)
          );
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
          const startYear =
            edu.start_date && typeof edu.start_date === "string"
              ? edu.start_date.trim()
              : null;
          const levelId = edu.education_level_id
            ? parseInt(edu.education_level_id)
            : null;
          try {
            const eduCreateData2 = {
              employee: { connect: { id: employee.id } },
              education_level: finalEducationLevel,
              institution_name: finalInstitutionName,
              year_of_completion: completionDate,
              marks_gpa: edu.marks_gpa || "",
              roll_no: edu.roll_no || null,
              registration_number: edu.registration_number || null,
              certificate_number: edu.certificate_number || null,
              start_date: startYear || null,
            };
            if (typeof levelId === "number" && !isNaN(levelId)) {
              eduCreateData2.education_level_id = levelId;
            }
            const createdEdu = await tx.educationQualification.create({
              data: eduCreateData2,
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
        // IMPORTANT: Only include positive IDs (existing DB records), exclude negative IDs (temporary IDs for new entries)
        const incomingEducationIds = educationsArray
          .map((edu) => {
            if (!edu.id) return null;
            const parsedId = parseInt(edu.id);
            // Only include positive IDs (existing records), exclude negative IDs (temporary) and invalid IDs
            return !isNaN(parsedId) && parsedId > 0 ? parsedId : null;
          })
          .filter((id) => id !== null);

        console.log(
          "Incoming education IDs from request (existing records only):",
          incomingEducationIds
        );
        console.log(
          "Existing education IDs in DB:",
          existingEducations.map((e) => e.id)
        );

        // 3. Find educations that should be deleted (not in request)
        // Only delete educations that existed in DB but are not in the incoming list
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
        // Also deduplicate documents to prevent double creation
        const seenDocuments = new Set(); // Track (file_type, associated_id, file_path) combinations
        // CRITICAL FIX: Use for loop instead of map to handle async operations properly
        const documentsToCreate = [];
        for (const doc of documentRecords) {
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
            } else if (doc.associated_id && doc.associated_id > 2147483647) {
              console.log(
                `Removing large associated_id ${doc.associated_id} for document ${doc.document_name}`
              );
              mappedAssociatedId = null;
            } else if (doc.associated_id && doc.associated_id < 0) {
              // Temporary ID (negative number) - try to map it
              // The mapping should have been created when the education/experience was created
              if (
                doc.file_type === "education" &&
                educationIdMapping[doc.associated_id]
              ) {
                mappedAssociatedId = educationIdMapping[doc.associated_id];
                console.log(
                  `Mapped negative education associated_id ${doc.associated_id} to ${mappedAssociatedId}`
                );
              } else if (
                doc.file_type === "experience" &&
                experienceIdMapping[doc.associated_id]
              ) {
                mappedAssociatedId = experienceIdMapping[doc.associated_id];
                console.log(
                  `Mapped negative experience associated_id ${doc.associated_id} to ${mappedAssociatedId}`
                );
              } else {
                // CRITICAL FIX: If no mapping found for temporary ID, try to find the education/experience
                // by checking if it's a positive ID that was incorrectly parsed as negative, or
                // if the education/experience was just created but mapping wasn't set
                console.warn(
                  `Warning: No mapping found for temporary ID ${doc.associated_id} for document ${doc.document_name}, file_type: ${doc.file_type}`
                );
                console.log(
                  `Available education mappings:`,
                  Object.keys(educationIdMapping)
                );
                console.log(
                  `Available experience mappings:`,
                  Object.keys(experienceIdMapping)
                );

                // Try to find the education/experience by checking if the ID exists in the database
                // This handles cases where the ID might be a positive number that was incorrectly treated as negative
                if (doc.file_type === "education") {
                  // Check if this might actually be a positive ID (absolute value)
                  const absId = Math.abs(doc.associated_id);
                  const existingEdu = await tx.educationQualification.findFirst(
                    {
                      where: {
                        employee_id: employee.id,
                        id: absId,
                        is_deleted: false,
                      },
                    }
                  );
                  if (existingEdu) {
                    mappedAssociatedId = existingEdu.id;
                    console.log(
                      `Found existing education by absolute ID: ${absId}, using it for document mapping`
                    );
                  } else {
                    // Last resort: try to find the most recently created education for this employee
                    // This handles edge cases where the mapping wasn't created properly
                    const recentEdu = await tx.educationQualification.findFirst(
                      {
                        where: {
                          employee_id: employee.id,
                          is_deleted: false,
                        },
                        orderBy: {
                          id: "desc",
                        },
                      }
                    );
                    if (
                      recentEdu &&
                      !Object.values(educationIdMapping).includes(recentEdu.id)
                    ) {
                      // Only use this if it's not already mapped (to avoid wrong associations)
                      console.warn(
                        `⚠️ Using fallback: associating education document with most recent education ID ${recentEdu.id} (this may be incorrect)`
                      );
                      mappedAssociatedId = recentEdu.id;
                    } else {
                      console.error(
                        `Cannot save education document ${doc.document_name}: no mapping for temporary ID ${doc.associated_id} and no fallback education found`
                      );
                      continue; // Skip this document instead of returning null
                    }
                  }
                } else if (doc.file_type === "experience") {
                  // Similar fallback for experience documents
                  const absId = Math.abs(doc.associated_id);
                  const existingExp = await tx.pastExperience.findFirst({
                    where: {
                      employee_id: employee.id,
                      id: absId,
                      is_deleted: false,
                    },
                  });
                  if (existingExp) {
                    mappedAssociatedId = existingExp.id;
                    console.log(
                      `Found existing experience by absolute ID: ${absId}, using it for document mapping`
                    );
                  } else {
                    const recentExp = await tx.pastExperience.findFirst({
                      where: {
                        employee_id: employee.id,
                        is_deleted: false,
                      },
                      orderBy: {
                        id: "desc",
                      },
                    });
                    if (
                      recentExp &&
                      !Object.values(experienceIdMapping).includes(recentExp.id)
                    ) {
                      console.warn(
                        `⚠️ Using fallback: associating experience document with most recent experience ID ${recentExp.id} (this may be incorrect)`
                      );
                      mappedAssociatedId = recentExp.id;
                    } else {
                      console.error(
                        `Cannot save experience document ${doc.document_name}: no mapping for temporary ID ${doc.associated_id} and no fallback experience found`
                      );
                      continue; // Skip this document instead of returning null
                    }
                  }
                } else {
                  // For other document types, set to null
                  mappedAssociatedId = null;
                }
              }
            }
          }

          // Deduplicate: Check if we've already seen this (file_type, associated_id, file_path) combination
          const associatedIdStr =
            mappedAssociatedId !== null && mappedAssociatedId !== undefined
              ? String(mappedAssociatedId)
              : "null";
          const docKey = `${doc.file_type}_${associatedIdStr}_${doc.file_path}`;
          if (seenDocuments.has(docKey)) {
            console.warn(
              `Skipping duplicate document: ${docKey} for document ${doc.document_name}`
            );
            continue;
          }
          seenDocuments.add(docKey);

          documentsToCreate.push({
            ...doc,
            associated_id: mappedAssociatedId,
            employee_id: employee.id,
          });
        }

        // CRITICAL FIX: Delete existing documents BEFORE creating new ones to prevent duplicates
        // Delete existing single-type document records (without deleting physical files)
        // Also delete existing education/experience documents if they're being replaced
        const processedDeletions = new Set(); // Track which deletions we've already done

        // First, collect all unique document types and associated_ids that need deletion
        const documentsToDelete = new Set();
        for (const doc of documentsToCreate) {
          if (singleDocumentTypes.includes(doc.file_type)) {
            documentsToDelete.add(`single_${doc.file_type}_null`);
          } else if (
            (doc.file_type === "education" || doc.file_type === "experience") &&
            doc.associated_id !== null &&
            doc.associated_id !== undefined
          ) {
            documentsToDelete.add(`${doc.file_type}_${doc.associated_id}`);
          }
        }

        // Now delete all documents that will be replaced
        for (const deleteKey of documentsToDelete) {
          if (processedDeletions.has(deleteKey)) continue;

          // Parse the delete key: "single_cnic_front_null" or "education_123" or "experience_-456"
          let fileType, associatedId;
          if (deleteKey.startsWith("single_")) {
            // Format: "single_cnic_front_null" -> extract "cnic_front"
            const parts = deleteKey.split("_");
            fileType = parts.slice(1, -1).join("_"); // Everything between "single" and "null"
            associatedId = null;
          } else {
            // Format: "education_123" or "experience_-456"
            const parts = deleteKey.split("_");
            fileType = parts[0];
            const associatedIdStr = parts.slice(1).join("_"); // Handle negative IDs with underscore
            associatedId =
              associatedIdStr === "null" ? null : parseInt(associatedIdStr);
          }

          if (singleDocumentTypes.includes(fileType)) {
            const whereCondition = {
              employee_id: employee.id,
              file_type: fileType,
              associated_id: null,
            };
            const deleteResult = await tx.employeeDocument.deleteMany({
              where: whereCondition,
            });
            console.log(
              `Deleted ${deleteResult.count} existing document records for ${fileType}`
            );
          } else if (fileType === "education" || fileType === "experience") {
            const whereCondition = {
              employee_id: employee.id,
              file_type: fileType,
              associated_id: associatedId,
            };
            const deleteResult = await tx.employeeDocument.deleteMany({
              where: whereCondition,
            });
            console.log(
              `Deleted ${deleteResult.count} existing ${fileType} documents for associated_id ${associatedId}`
            );
          }
          processedDeletions.add(deleteKey);
        }

        console.log(
          `Creating ${documentsToCreate.length} new document records:`,
          JSON.stringify(documentsToCreate, null, 2)
        );

        // Additional logging to help debug duplicate issues
        const docSummary = documentsToCreate.reduce((acc, doc) => {
          const key = `${doc.file_type}_${doc.associated_id || "null"}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        console.log(`Document creation summary:`, docSummary);

        if (documentsToCreate.length > 0) {
          // CRITICAL FIX: Additional safety check - verify documents don't already exist
          // (This is a backup check since we already deleted existing documents above)
          const documentsToCreateFiltered = [];
          for (const doc of documentsToCreate) {
            // Check if a document with the same file_path already exists for this employee
            const existingDoc = await tx.employeeDocument.findFirst({
              where: {
                employee_id: employee.id,
                file_path: doc.file_path,
                is_deleted: false,
              },
            });

            if (existingDoc) {
              console.warn(
                `⚠️ Skipping duplicate document: ${doc.document_name} with file_path ${doc.file_path} - already exists with ID ${existingDoc.id} (this should have been deleted above)`
              );
              continue;
            }

            // For education/experience documents, also check by associated_id and file_type
            if (
              doc.associated_id !== null &&
              doc.associated_id !== undefined &&
              (doc.file_type === "education" || doc.file_type === "experience")
            ) {
              const existingByAssociation = await tx.employeeDocument.findFirst(
                {
                  where: {
                    employee_id: employee.id,
                    file_type: doc.file_type,
                    associated_id: doc.associated_id,
                    is_deleted: false,
                  },
                }
              );

              if (existingByAssociation) {
                console.warn(
                  `⚠️ Skipping duplicate ${doc.file_type} document for associated_id ${doc.associated_id} - already exists with ID ${existingByAssociation.id} (this should have been deleted above)`
                );
                continue;
              }
            }

            documentsToCreateFiltered.push(doc);
          }

          console.log(
            `After duplicate check: ${documentsToCreateFiltered.length} documents to create (filtered from ${documentsToCreate.length})`
          );

          if (documentsToCreateFiltered.length > 0) {
            const result = await tx.employeeDocument.createMany({
              data: documentsToCreateFiltered,
              skipDuplicates: false, // We handle duplicates manually above
            });
            console.log(
              `Successfully created ${result.count} document records`
            );

            // Verify creation - check for duplicates
            if (result.count !== documentsToCreateFiltered.length) {
              console.warn(
                `Mismatch: Expected to create ${documentsToCreateFiltered.length} documents, but only ${result.count} were created`
              );
            }
          } else {
            console.log("No new documents to create after duplicate filtering");
          }
        } else {
          console.log("No documents to create");
        }
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

  // Find an active employee by CNIC (optionally excluding one id, for edit mode)
  findByCnic: async (cnic, excludeId = null) => {
    return prisma.employee.findFirst({
      where: {
        cnic: String(cnic).replace(/\D/g, ""),
        is_deleted: false,
        ...(excludeId ? { id: { not: parseInt(excludeId) } } : {}),
      },
      select: { id: true, full_name: true },
    });
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
      const validation = await validateSoftDelete("Employee", parseInt(id));
      if (!validation.canDelete) {
        throw new Error(validation.message);
      }

      // Mask unique fields to prevent unique constraint violations
      const { masked } = maskUniqueFieldsForSoftDelete("Employee", employee);

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
      const restored = restoreUniqueFieldsForUndelete("Employee", employee);

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
