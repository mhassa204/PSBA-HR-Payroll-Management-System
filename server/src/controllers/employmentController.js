// src/controllers/employmentController.js
const employmentService = require("../services/employmentService");
const path = require("path");
const { DOCUMENT_TYPES } = require("../config/multer");

// Prisma client is now handled by employmentService

// Helper function to process uploaded files for employment
// const processEmploymentFiles = (files, req) => {
//   const processedFiles = {};
//   const documentRecords = [];

//   if (!files || files.length === 0) {
//     console.log('📁 No employment files uploaded');
//     return { processedFiles, documentRecords };
//   }

//   console.log(`📁 Processing ${files.length} employment files`);
//   console.log(`📁 Request filePathMap:`, req.filePathMap);
//   console.log(`📁 Files received:`, files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, size: f.size })));

//   files.forEach(file => {
//     const fieldName = file.fieldname;
    
//     // Handle array indices in field names (e.g., medical_fitness_report_pdf_0)
//     const baseFieldName = fieldName.replace(/_\d+$/, ''); // Remove array index
//     let documentType = DOCUMENT_TYPES[baseFieldName] || 'other';

//     // Use the filePathMap from multer storage if available, otherwise construct manually
//     let relativePath;
//     if (req.filePathMap && req.filePathMap[file.filename]) {
//       // Use the path stored by multer storage
//       relativePath = req.filePathMap[file.filename];
//       console.log(`📁 Using filePathMap path: ${relativePath}`);
//     } else {
//       // Fallback: construct relative path manually
//       const fullPath = file.path.replace(/\\/g, '/');
//       const uploadsIndex = fullPath.indexOf('uploads');
//       relativePath = uploadsIndex !== -1
//         ? fullPath.substring(uploadsIndex)
//         : path.join('uploads', file.filename).replace(/\\/g, '/');
//       console.log(`📁 Using fallback path: ${relativePath}`);
//     }

//     console.log(`📁 Processing employment file: ${file.originalname}`);
//     console.log(`  📄 Fieldname: ${fieldName}`);
//     console.log(`  📄 Base fieldname: ${baseFieldName}`);
//     console.log(`  📄 Document type: ${documentType}`);
//     console.log(`  🗂️ Final relative path: ${relativePath}`);

//     // Map employment-specific fields (handle both with and without array indices)
//     if (baseFieldName === 'medical_fitness_report_pdf' || baseFieldName === 'medical_fitness_report_pdf_file') {
//       processedFiles.medical_fitness_report_pdf = relativePath;
//       documentRecords.push({
//         file_path: relativePath,
//         file_type: 'medical_fitness',
//         document_name: file.originalname,
//         file_size: file.size,
//         mime_type: file.mimetype,
//       });
//     } else if (baseFieldName === 'police_character_certificate' || baseFieldName === 'police_character_certificate_file') {
//       processedFiles.police_character_certificate = relativePath;
//       documentRecords.push({
//         file_path: relativePath,
//         file_type: 'police_character',
//         document_name: file.originalname,
//         file_size: file.size,
//         mime_type: file.mimetype,
//       });
//     } else if (baseFieldName === 'renewal_report' || baseFieldName === 'renewal_report_file') {
//       console.log("🔍 Processing renewal_report file:", file.originalname);
//       processedFiles.renewal_report = relativePath;
//       documentRecords.push({
//         file_path: relativePath,
//         file_type: 'renewal_report',
//         document_name: file.originalname,
//         file_size: file.size,
//         mime_type: file.mimetype,
//       });
//       console.log("✅ Added renewal_report to processedFiles:", relativePath);
//     } else if (baseFieldName === 'contract_renewal_report' || baseFieldName === 'contract_renewal_report_file') {
//       console.log("🔍 Processing contract_renewal_report file:", file.originalname);
//       processedFiles.renewal_report = relativePath;
//       documentRecords.push({
//         file_path: relativePath,
//         file_type: 'renewal_report',
//         document_name: file.originalname,
//         file_size: file.size,
//         mime_type: file.mimetype,
//       });
//       console.log("✅ Added contract_renewal_report to processedFiles:", relativePath);
//     } else {
//       // Handle other employment documents
//       documentRecords.push({
//         file_path: relativePath,
//         file_type: documentType,
//         document_name: file.originalname,
//         file_size: file.size,
//         mime_type: file.mimetype,
//       });
//     }
//   });

//   console.log(`📄 Created ${documentRecords.length} employment document records`);
//   return { processedFiles, documentRecords };
// };

// src/controllers/employmentController.js
// ... (rest unchanged)

const processEmploymentFiles = (files, req) => {
  const processedFiles = {};
  const documentRecords = [];
  const seenTypes = new Set();  // Add this to prevent duplicate records for same type

  if (!files || files.length === 0) {
    
    return { processedFiles, documentRecords };
  }

  

  files.forEach(file => {
    const fieldName = file.fieldname;
    
    // Handle array indices in field names (e.g., medical_fitness_report_pdf_0)
    const baseFieldName = fieldName.replace(/_\d+$/, ''); // Remove array index
    let documentType = DOCUMENT_TYPES[baseFieldName] || 'other';

    // Use the filePathMap from multer storage if available, otherwise construct manually
    let relativePath;
    if (req.filePathMap && req.filePathMap[file.filename]) {
      // Use the path stored by multer storage
      relativePath = req.filePathMap[file.filename];
      
    } else {
      // Fallback: construct relative path manually
      const fullPath = file.path.replace(/\\/g, '/');
      const uploadsIndex = fullPath.indexOf('uploads');
      relativePath = uploadsIndex !== -1
        ? fullPath.substring(uploadsIndex)
        : path.join('uploads', file.filename).replace(/\\/g, '/');
      
    }

    

    // Map employment-specific fields (handle both with and without array indices)
    // Removed setting processedFiles for removed schema fields; only push to documentRecords if not seen
    if (baseFieldName === 'medical_fitness_report_pdf' || baseFieldName === 'medical_fitness_report_pdf_file') {
      // processedFiles.medical_fitness_report_pdf = relativePath;  // REMOVED: Field gone from schema
      if (!seenTypes.has('medical_fitness')) {
        documentRecords.push({
          file_path: relativePath,
          file_type: 'medical_fitness',
          document_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
        });
        seenTypes.add('medical_fitness');
      }
    } else if (baseFieldName === 'police_character_certificate' || baseFieldName === 'police_character_certificate_file') {
      // processedFiles.police_character_certificate = relativePath;  // REMOVED: Field gone from schema
      if (!seenTypes.has('police_character')) {
        documentRecords.push({
          file_path: relativePath,
          file_type: 'police_character',
          document_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
        });
        seenTypes.add('police_character');
      }
    } else if (baseFieldName === 'renewal_report' || baseFieldName === 'renewal_report_file' ||
               baseFieldName === 'contract_renewal_report' || baseFieldName === 'contract_renewal_report_file') {  // MERGED blocks to avoid double-push
      
      // processedFiles.renewal_report = relativePath;  // REMOVED: Field gone from schema
      if (!seenTypes.has('renewal_report')) {
        documentRecords.push({
          file_path: relativePath,
          file_type: 'renewal_report',
          document_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
        });
        seenTypes.add('renewal_report');
      }
      console.log("✅ Added renewal_report to documentRecords:", relativePath);
    } else {
      // Handle other employment documents
      if (!seenTypes.has(documentType)) {
        documentRecords.push({
          file_path: relativePath,
          file_type: documentType,
          document_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
        });
        seenTypes.add(documentType);
      }
    }
  });

  
  return { processedFiles, documentRecords };
};

// ... (rest of file unchanged)


const employmentController = {
  // Organization-specific validation rules
  getOrganizationValidationRules: (organization) => {
    const rules = {
      MBWO: {
        required: ['employee_id', 'organization', 'designation', 'effective_from'],
        optional: ['effective_till', 'remarks', 'gross_salary'],
        hidden: ['department', 'employment_type', 'role_tag', 'reporting_officer_id', 'office_location', 'scale_grade', 'medical_fitness_report_pdf', 'filer_status', 'filer_active_status', 'employment_status', 'is_current', 'is_on_probation', 'probation_end_date']
      },
      PMBMC: {
        required: ['employee_id', 'organization', 'department', 'designation', 'employment_type', 'role_tag', 'effective_from', 'filer_status', 'is_current'],
        optional: ['effective_till', 'remarks', 'filer_active_status', 'basic_salary', 'medical_allowance', 'house_rent', 'conveyance_allowance', 'other_allowances', 'scale_grade', 'reporting_officer_id', 'office_location', 'employment_status'],
        hidden: []
      },
      PSBA: {
        required: ['employee_id', 'organization', 'department', 'designation', 'employment_type', 'role_tag', 'effective_from', 'filer_status', 'is_current'],
        optional: ['effective_till', 'remarks', 'filer_active_status', 'scale_grade', 'employment_status', 'is_on_probation', 'probation_end_date', 'reporting_officer_id', 'office_location'],
        hidden: []
      }
    };
    
    return rules[organization] || rules.PSBA; // Default to PSBA rules
  },

  // Validate employment data based on organization
  // validateEmploymentData: (data, uploadedFiles = []) => {
  //   const { organization, user_id, employee_id, ...employmentData } = data;
  //   const rules = employmentController.getOrganizationValidationRules(organization);
    
  //   console.log("🔍 Backend validation - Received data:", {
  //     organization,
  //     employee_id,
  //     user_id,
  //     employmentDataKeys: Object.keys(employmentData),
  //     designation: employmentData.designation,
  //     designation_id: employmentData.designation_id
  //   });
    
  //   const errors = [];
    
  //   // Check if we have employee_id or user_id
  //   const actualEmployeeId = employee_id || user_id;
  //   if (!actualEmployeeId) {
  //     errors.push("Employee ID is required");
  //   }
    
  //   // Check required fields (excluding employee_id and organization as they're handled above)
  //   const requiredFields = rules.required.filter(field => field !== 'employee_id' && field !== 'organization');
  //   requiredFields.forEach(field => {
  //     // Handle field name variations
  //     let fieldValue;
  //     if (field === 'designation') {
  //       fieldValue = employmentData.designation || employmentData.designation_id;
  //       console.log(`🔍 Backend validating designation field:`, {
  //         designation: employmentData.designation,
  //         designation_id: employmentData.designation_id,
  //         finalValue: fieldValue
  //       });
  //     } else if (field === 'department') {
  //       fieldValue = employmentData.department || employmentData.department_id;
  //       console.log(`🔍 Backend validating department field:`, {
  //         department: employmentData.department,
  //         department_id: employmentData.department_id,
  //         finalValue: fieldValue
  //       });
  //     } else if (field === 'medical_fitness_report_pdf') {
  //       // Check if file was uploaded in req.files
  //       const uploadedFile = uploadedFiles.find(f => f.fieldname === 'medical_fitness_report_pdf');
  //       fieldValue = uploadedFile || employmentData.medical_fitness_report_pdf;
  //       console.log(`🔍 Backend validating medical_fitness_report_pdf field:`, {
  //         hasFile: !!fieldValue,
  //         fieldValue: fieldValue,
  //         isFile: fieldValue instanceof File,
  //         isString: typeof fieldValue === 'string',
  //         uploadedFileFound: !!uploadedFile,
  //         uploadedFilesCount: uploadedFiles.length,
  //         uploadedFileNames: uploadedFiles.map(f => f.fieldname)
  //       });
  //     } else if (field === 'police_character_certificate') {
  //       // Check if file was uploaded in req.files
  //       const uploadedFile = uploadedFiles.find(f => f.fieldname === 'police_character_certificate');
  //       fieldValue = uploadedFile || employmentData.police_character_certificate;
  //       console.log(`🔍 Backend validating police_character_certificate field:`, {
  //         hasFile: !!fieldValue,
  //         fieldValue: fieldValue,
  //         isFile: fieldValue instanceof File,
  //         isString: typeof fieldValue === 'string',
  //         uploadedFileFound: !!uploadedFile,
  //         uploadedFilesCount: uploadedFiles.length,
  //         uploadedFileNames: uploadedFiles.map(f => f.fieldname)
  //       });
  //     } else if (field === 'renewal_report') {
  //       // Check if file was uploaded in req.files - handle both field names
  //       const uploadedFile = uploadedFiles.find(f => 
  //         f.fieldname === 'renewal_report' || f.fieldname === 'contract_renewal_report'
  //       );
  //       fieldValue = uploadedFile || employmentData.renewal_report || employmentData.contract_renewal_report;
  //       console.log(`🔍 Backend validating renewal_report field:`, {
  //         hasFile: !!fieldValue,
  //         fieldValue: fieldValue,
  //         isFile: fieldValue instanceof File,
  //         isString: typeof fieldValue === 'string',
  //         uploadedFileFound: !!uploadedFile,
  //         uploadedFilesCount: uploadedFiles.length,
  //         uploadedFileNames: uploadedFiles.map(f => f.fieldname)
  //       });
  //     } else {
  //       fieldValue = employmentData[field];
  //     }
      
  //     // Special handling for file fields - they are objects, not strings
  //     if (field === 'medical_fitness_report_pdf' || field === 'police_character_certificate' || field === 'renewal_report') {
  //       if (!fieldValue) {
  //         errors.push(`${field} is required for ${organization} organization`);
  //       }
  //     } else {
  //       // Regular field validation for non-file fields
  //       if (!fieldValue || (typeof fieldValue === 'string' && !fieldValue.trim())) {
  //         errors.push(`${field} is required for ${organization} organization`);
  //       }
  //     }
  //   });
    
  //   // Additional validation for contract renewal report when contract is marked as renewed
  //   if (employmentData.is_renewed === true || employmentData.is_renewed === 'true') {
  //     const renewalReportFile = uploadedFiles.find(f => 
  //       f.fieldname === 'renewal_report' || f.fieldname === 'contract_renewal_report'
  //     );
  //     const renewalReportValue = renewalReportFile || employmentData.renewal_report || employmentData.contract_renewal_report;
      
  //     if (!renewalReportValue) {
  //       errors.push("Contract renewal report is required when contract is marked as renewed");
  //     }
  //   }
    
  //   // Validate specific field types
  //   if (employmentData.effective_from) {
  //     const effectiveFrom = new Date(employmentData.effective_from);
  //     if (isNaN(effectiveFrom.getTime())) {
  //       errors.push('effective_from must be a valid date');
  //     }
  //   }
    
  //   if (employmentData.effective_till && employmentData.effective_from) {
  //     const effectiveFrom = new Date(employmentData.effective_from);
  //     const effectiveTill = new Date(employmentData.effective_till);
  //     if (effectiveTill <= effectiveFrom) {
  //       errors.push('effective_till must be after effective_from');
  //     }
  //   }
    
  //   // File validation is now handled in the main validation loop above
    
  //   console.log(`🔍 Backend validation result for ${organization}:`, {
  //     isValid: errors.length === 0,
  //     errors,
  //     requiredFields
  //   });
    
  //   return {
  //     isValid: errors.length === 0,
  //     errors
  //   };
  // },

// src/controllers/employmentController.js
validateEmploymentData: async (data, uploadedFiles = [], employmentId = null) => {
  const { organization, user_id, employee_id, ...employmentData } = data;
  const rules = employmentController.getOrganizationValidationRules(organization);
  
  console.log("🔍 Backend validation - Received data:", {
    organization,
    employee_id,
    user_id,
    employmentDataKeys: Object.keys(employmentData),
    designation: employmentData.designation,
    designation_id: employmentData.designation_id,
    designation_name: employmentData.designation_name,
    allData: data
  });
  
  const errors = [];
  
  const actualEmployeeId = employee_id || user_id;
  if (!actualEmployeeId) {
    errors.push("Employee ID is required");
  }
  
  const requiredFields = rules.required.filter(field => field !== 'employee_id' && field !== 'organization');
  console.log("🔍 Backend validation - Required fields for", organization, ":", requiredFields);
  
  requiredFields.forEach(field => {
    let fieldValue;
    if (field === 'designation') {
      fieldValue = employmentData.designation || employmentData.designation_id || employmentData.designation_name;
      console.log("🔍 Backend validating designation field:", {
        designation: employmentData.designation,
        designation_id: employmentData.designation_id,
        designation_name: employmentData.designation_name,
        finalValue: fieldValue
      });
    } else if (field === 'department') {
      fieldValue = employmentData.department || employmentData.department_id || employmentData.department_name;
      console.log("🔍 Backend validating department field:", {
        department: employmentData.department,
        department_id: employmentData.department_id,
        department_name: employmentData.department_name,
        finalValue: fieldValue
      });
    } else if (field === 'role_tag') {
      fieldValue = employmentData.role_tag || employmentData.role_tag_id || employmentData.role_tag_name;
    } else if (field === 'scale_grade') {
      fieldValue = employmentData.scale_grade || employmentData.scale_grade_id || employmentData.scale_grade_name;
    } else if (field === 'reporting_officer_id') {
      fieldValue = employmentData.reporting_officer_id || employmentData.reporting_officer || employmentData.reporting_officer_name;
    } else if (field === 'medical_fitness_report_pdf' || field === 'police_character_certificate') {
      // These employment-level documents are no longer required; skip validation
      fieldValue = true;

    } else if (field === 'renewal_report') {
      // Check for new file upload OR existing document in database
      const uploadedFile = uploadedFiles.find(f => 
        f.fieldname === 'renewal_report' || 
        f.fieldname === 'contract_renewal_report' ||
        f.fieldname.startsWith('renewal_report_') ||
        f.fieldname.startsWith('contract_renewal_report_')
      );
      
      // Check if document already exists in database (for edit operations)
      // Handle both object format and flattened format
      let existingDocument = employmentData.renewal_report;
      
      // If we have flattened fields, reconstruct the document object
      if (!existingDocument && employmentData.renewal_report_id) {
        existingDocument = {
          id: employmentData.renewal_report_id,
          url: employmentData.renewal_report_url,
          file_path: employmentData.renewal_report_file_path,
          document_name: employmentData.renewal_report_document_name,
          file_type: employmentData.renewal_report_file_type,
          file_size: employmentData.renewal_report_file_size,
          mime_type: employmentData.renewal_report_mime_type
        };
      }
      
      const hasExistingDocument = existingDocument && (
        existingDocument.id || 
        existingDocument.url || 
        existingDocument.file_path || 
        existingDocument.document_name
      );
      
      fieldValue = uploadedFile || hasExistingDocument;

    } else if (field === 'role_tag') {
      // Handle role_tag field - check both role_tag and role_tag_id
      fieldValue = employmentData.role_tag || employmentData.role_tag_id;
      
    } else if (field === 'scale_grade') {
      // Handle scale_grade field - check both scale_grade and scale_grade_id
      fieldValue = employmentData.scale_grade || employmentData.scale_grade_id;
      
    } else {
      fieldValue = employmentData[field];
    }
    
    if (!fieldValue) {
      console.log("❌ Backend validation failed for field:", field, "in organization:", organization);
      errors.push(`${field} is required for ${organization} organization`);
    } else {
      console.log("✅ Backend validation passed for field:", field, "value:", fieldValue);
    }
  });
  
  // Check for is_renewed in multiple possible locations
  const isRenewed = employmentData.is_renewed === true || employmentData.is_renewed === 'true' || 
                    employmentData.contract_is_renewed === true || employmentData.contract_is_renewed === 'true';
  

  
  if (isRenewed) {

    
    // Check for new file upload OR existing document in database
    const renewalReportFile = uploadedFiles.find(f => 
      f.fieldname === 'renewal_report' || 
      f.fieldname === 'contract_renewal_report' ||
      f.fieldname.startsWith('renewal_report_') ||
      f.fieldname.startsWith('contract_renewal_report_')
    );
    
    // Check if renewal report already exists in database (for edit operations)
    let existingRenewalReport = employmentData.renewal_report;
    
    // If we have flattened fields, reconstruct the document object
    if (!existingRenewalReport && employmentData.renewal_report_id) {
      existingRenewalReport = {
        id: employmentData.renewal_report_id,
        url: employmentData.renewal_report_url,
        file_path: employmentData.renewal_report_file_path,
        document_name: employmentData.renewal_report_document_name,
        file_type: employmentData.renewal_report_file_type,
        file_size: employmentData.renewal_report_file_size,
        mime_type: employmentData.renewal_report_mime_type
      };
    }
    
    // Also check for renewal_report field directly
    if (!existingRenewalReport && employmentData.renewal_report) {
      existingRenewalReport = employmentData.renewal_report;
    }
    
    // Check for renewal_report in the flattened contract fields
    if (!existingRenewalReport && employmentData.renewal_report) {
      existingRenewalReport = employmentData.renewal_report;
    }
    
    // Check for renewal_report in the contract object if it exists
    if (!existingRenewalReport && employmentData.contract && employmentData.contract.renewal_report) {
      existingRenewalReport = employmentData.contract.renewal_report;
    }
    
    // If we still don't have a renewal report and we have an employment ID, query the database
    if (!existingRenewalReport && employmentId) {
      try {
        
        
        // Use the existing working getEmploymentById method to get documents
        const employmentRecord = await employmentService.getEmploymentById(employmentId);
        
        if (employmentRecord && employmentRecord.documents) {
  
          
          // Look for renewal report documents
          const renewalDocuments = employmentRecord.documents.filter(doc => 
            doc.file_type === 'renewal_report'
          );
          
          
          
          if (renewalDocuments.length > 0) {
            existingRenewalReport = renewalDocuments[0];
            
          } else {
            console.log(`⚠️ Backend: No renewal report documents found in database for employment ID: ${employmentId}`);
          }
        } else {
          console.log(`⚠️ Backend: No employment record or documents found for employment ID: ${employmentId}`);
        }
      } catch (error) {
        console.error(`❌ Backend: Error querying database for renewal report documents:`, error);
        // Don't fail validation due to database query error, continue with other checks
      }
    } else {
      console.log(`🔍 Backend: Skipping database query - existingRenewalReport: ${!!existingRenewalReport}, employmentId: ${employmentId}`);
    }
    
    const hasExistingRenewalReport = existingRenewalReport && (
      existingRenewalReport.id || 
      existingRenewalReport.url || 
      existingRenewalReport.file_path || 
      existingRenewalReport.document_name
    );
    
    console.log(`🔍 Backend: Renewal report validation details:`, {
      hasNewFile: !!renewalReportFile,
      hasExistingDocument: !!hasExistingRenewalReport,
      existingDocument: existingRenewalReport,
      renewalReportField: employmentData.renewal_report,
      renewalReportId: employmentData.renewal_report_id,
      renewalReportUrl: employmentData.renewal_report_url,
      renewalReportFilePath: employmentData.renewal_report_file_path,
      renewalReportDocumentName: employmentData.renewal_report_document_name,
      contractObject: employmentData.contract,
      contractRenewalReport: employmentData.contract?.renewal_report,
      allRenewalReportFields: Object.keys(employmentData).filter(key => key.includes('renewal')),
      flattenedFields: {
        id: employmentData.renewal_report_id,
        url: employmentData.renewal_report_url,
        file_path: employmentData.renewal_report_file_path,
        document_name: employmentData.renewal_report_document_name
      },
      uploadedFileFound: !!renewalReportFile,
      uploadedFilesCount: uploadedFiles.length,
      uploadedFileNames: uploadedFiles.map(f => f.fieldname),
      // Add debugging for all fields that might contain renewal info
      allFieldsWithRenewal: Object.keys(employmentData).filter(key => key.includes('renewal')),
      allFieldsWithContract: Object.keys(employmentData).filter(key => key.includes('contract')),
      employmentId: employmentId
    });
    
    if (!renewalReportFile && !hasExistingRenewalReport) {
      console.log(`❌ Backend: Renewal report validation failed - no new file and no existing document`);
      errors.push("Contract renewal report is required when contract is marked as renewed");
    } else {
      console.log(`✅ Backend: Renewal report validation passed`);
    }
  }
  
  if (employmentData.effective_from) {
    const effectiveFrom = new Date(employmentData.effective_from);
    if (isNaN(effectiveFrom.getTime())) {
      errors.push('effective_from must be a valid date');
    }
  }
  
  if (employmentData.effective_till && employmentData.effective_from) {
    const effectiveFrom = new Date(employmentData.effective_from);
    const effectiveTill = new Date(employmentData.effective_till);
    if (effectiveTill <= effectiveFrom) {
      errors.push('effective_till must be after effective_from');
    }
  }
  
  console.log(`🔍 Backend validation result for ${organization}:`, {
    isValid: errors.length === 0,
    errors,
    requiredFields
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
},


  // Create new employment record
  createEmployment: async (req, res) => {
    try {


      const { user_id, employee_id, organization, department_id, designation_id, effective_from } = req.body;
      const actualEmployeeId = employee_id || user_id;

      // Basic required field validation
      const missingFields = [];
      if (!actualEmployeeId) missingFields.push("employee_id");
      if (!organization) missingFields.push("organization");
      if (!effective_from) missingFields.push("effective_from");

      if (missingFields.length > 0) {
        console.error(`❌ Missing fields: ${missingFields.join(", ")}`);
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      // Organization-specific validation
      const validation = await employmentController.validateEmploymentData(req.body, req.files || []);
      if (!validation.isValid) {
        console.error(`❌ Validation errors: ${validation.errors.join(", ")}`);
        return res.status(400).json({
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        });
      }

      // Process uploaded files
      const { processedFiles, documentRecords } = processEmploymentFiles(req.files, req);

      // Reconstruct nested objects from flattened FormData
      const salary = {};
      const location = {};
      const contract = {};

      // Extract salary fields - check if field exists in request body
      if ('salary_basic_salary' in req.body) salary.basic_salary = req.body.salary_basic_salary;
      if ('salary_gross_salary' in req.body) salary.gross_salary = req.body.salary_gross_salary;
      if ('salary_medical_allowance' in req.body) salary.medical_allowance = req.body.salary_medical_allowance;
      if ('salary_house_rent' in req.body) salary.house_rent = req.body.salary_house_rent;
      if ('salary_conveyance_allowance' in req.body) salary.conveyance_allowance = req.body.salary_conveyance_allowance;
      if ('salary_other_allowances' in req.body) salary.other_allowances = req.body.salary_other_allowances;
      if ('salary_daily_wage_rate' in req.body) salary.daily_wage_rate = req.body.salary_daily_wage_rate;
      if ('salary_bank_account_primary' in req.body) salary.bank_account_primary = req.body.salary_bank_account_primary;
      if ('salary_bank_name_primary' in req.body) salary.bank_name_primary = req.body.salary_bank_name_primary;
      if ('salary_bank_branch_code' in req.body) salary.bank_branch_code = req.body.salary_bank_branch_code;
      if ('salary_payment_mode' in req.body) salary.payment_mode = req.body.salary_payment_mode;
      if ('salary_salary_effective_from' in req.body) salary.salary_effective_from = req.body.salary_salary_effective_from;
      if ('salary_salary_effective_till' in req.body) salary.salary_effective_till = req.body.salary_salary_effective_till;
      if ('salary_payroll_status' in req.body) salary.payroll_status = req.body.salary_payroll_status;

      // Extract location fields - check if field exists in request body
      if ('location_district' in req.body) location.district = req.body.location_district;
      if ('location_city' in req.body) location.city = req.body.location_city;
      if ('location_bazaar_name' in req.body) location.bazaar_name = req.body.location_bazaar_name;
      if ('location_type' in req.body) location.type = req.body.location_type;
      if ('location_full_address' in req.body) location.full_address = req.body.location_full_address;

      // Extract contract fields - check if field exists in request body
      if ('contract_contract_type' in req.body) contract.contract_type = req.body.contract_contract_type;
      if ('contract_contract_number' in req.body) contract.contract_number = req.body.contract_contract_number;
      if ('contract_start_date' in req.body) contract.start_date = req.body.contract_start_date;
      if ('contract_end_date' in req.body) contract.end_date = req.body.contract_end_date;
      if ('contract_renewal_count' in req.body) contract.renewal_count = req.body.contract_renewal_count;
      if ('contract_probation_start' in req.body) contract.probation_start = req.body.contract_probation_start;
      if ('contract_probation_end' in req.body) contract.probation_end = req.body.contract_probation_end;
      if ('contract_confirmation_status' in req.body) contract.confirmation_status = req.body.contract_confirmation_status;
      if ('contract_confirmation_date' in req.body) contract.confirmation_date = req.body.contract_confirmation_date;
      if ('contract_is_renewed' in req.body) contract.is_renewed = req.body.contract_is_renewed;
      // Use processed file path if available, otherwise fall back to request body
      
      if (processedFiles.renewal_report) {
        contract.renewal_report = processedFiles.renewal_report;

      } else if ('renewal_report' in req.body) {
        contract.renewal_report = req.body.renewal_report;

      } else if ('contract_renewal_report' in req.body) {
        contract.renewal_report = req.body.contract_renewal_report;

      } else {

      }



      // Combine form data with processed files and nested objects
      const employmentData = {
        ...req.body,
        employee_id: actualEmployeeId, // Ensure employee_id is set
        // Map field names for consistency - handle both ID and text fields
        department_id: req.body.department || req.body.department_id || req.body.department_name,
        designation_id: req.body.designation || req.body.designation_id || req.body.designation_name,
        role_tag_id: req.body.role_tag || req.body.role_tag_id || req.body.role_tag_name,
        scale_grade_id: req.body.scale_grade || req.body.scale_grade_id || req.body.scale_grade_name,
        reporting_officer_id: req.body.reporting_officer_id || req.body.reporting_officer || req.body.reporting_officer_name,
        ...processedFiles,
        documentRecords,
        salary: Object.keys(salary).length > 0 ? salary : null,
        location: Object.keys(location).length > 0 ? location : null,
        contract: Object.keys(contract).length > 0 ? contract : null
      };

      const employment = await employmentService.createEmployment(employmentData);
      res.status(201).json({ success: true, employment });
    } catch (error) {
      console.error("Error creating employment:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get all employment records with pagination and filters
  getAllEmployments: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        employee_id: req.query.employee_id,
        organization: req.query.organization,
        department_id: req.query.department_id,
        is_current: req.query.is_current
      };

      const result = await employmentService.getAllEmployments(page, limit, filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Error fetching employments:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get employment record by ID
  getEmploymentById: async (req, res) => {
    try {
      const employment = await employmentService.getEmploymentById(req.params.id);
      if (!employment) {
        return res.status(404).json({
          success: false,
          error: "Employment record not found"
        });
      }
      res.status(200).json({ success: true, employment });
    } catch (error) {
      console.error("Error fetching employment:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get employment records by employee ID
  getEmploymentsByEmployeeId: async (req, res) => {
    try {
      const employments = await employmentService.getEmploymentsByEmployeeId(req.params.employeeId);
      res.status(200).json({ success: true, employments });
    } catch (error) {
      console.error("Error fetching employee employments:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update employment record
  updateEmployment: async (req, res) => {
    try {
      console.log("🔍 Backend updateEmployment - Received data:")

      console.log("Hello Salary Effective Till:",req.body.salary_salary_effective_till==="")
      // Parse documents_to_remove if it's a JSON string
      let documentsToRemove = req.body.documents_to_remove;
      if (typeof documentsToRemove === 'string') {
        try {
          documentsToRemove = JSON.parse(documentsToRemove);
        } catch (error) {
          // If it's not JSON, it might be comma-separated
          documentsToRemove = documentsToRemove.split(',').map(id => id.trim());
        }
      }

      // Organization-specific validation
      const validation = await employmentController.validateEmploymentData(req.body, req.files || [], req.params.id);
      if (!validation.isValid) {
        console.error(`❌ Validation errors: ${validation.errors.join(", ")}`);
        return res.status(400).json({
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        });
      }

      // Process uploaded files
      const { processedFiles, documentRecords } = processEmploymentFiles(req.files, req);

      // Reconstruct nested objects from flattened FormData
      const salary = {};
      const location = {};
      const contract = {};

      // Extract salary fields - check if field exists in request body
      if ('salary_basic_salary' in req.body) salary.basic_salary = req.body.salary_basic_salary;
      if ('salary_gross_salary' in req.body) salary.gross_salary = req.body.salary_gross_salary;
      if ('salary_medical_allowance' in req.body) salary.medical_allowance = req.body.salary_medical_allowance;
      if ('salary_house_rent' in req.body) salary.house_rent = req.body.salary_house_rent;
      if ('salary_conveyance_allowance' in req.body) salary.conveyance_allowance = req.body.salary_conveyance_allowance;
      if ('salary_other_allowances' in req.body) salary.other_allowances = req.body.salary_other_allowances;
      if ('salary_daily_wage_rate' in req.body) salary.daily_wage_rate = req.body.salary_daily_wage_rate;
      if ('salary_bank_account_primary' in req.body) salary.bank_account_primary = req.body.salary_bank_account_primary;
      if ('salary_bank_name_primary' in req.body) salary.bank_name_primary = req.body.salary_bank_name_primary;
      if ('salary_bank_branch_code' in req.body) salary.bank_branch_code = req.body.salary_bank_branch_code;
      if ('salary_payment_mode' in req.body) salary.payment_mode = req.body.salary_payment_mode;
      if ('salary_salary_effective_from' in req.body) salary.salary_effective_from = req.body.salary_salary_effective_from;
      if ('salary_salary_effective_till' in req.body) salary.salary_effective_till = req.body.salary_salary_effective_till;
      if ('salary_payroll_status' in req.body) salary.payroll_status = req.body.salary_payroll_status;

      // Extract location fields - check if field exists in request body
      if ('location_district' in req.body) location.district = req.body.location_district;
      if ('location_city' in req.body) location.city = req.body.location_city;
      if ('location_bazaar_name' in req.body) location.bazaar_name = req.body.location_bazaar_name;
      if ('location_type' in req.body) location.type = req.body.location_type;
      if ('location_full_address' in req.body) location.full_address = req.body.location_full_address;

      // Extract contract fields - check if field exists in request body
      if ('contract_contract_type' in req.body) contract.contract_type = req.body.contract_contract_type;
      if ('contract_contract_number' in req.body) contract.contract_number = req.body.contract_contract_number;
      if ('contract_start_date' in req.body) contract.start_date = req.body.contract_start_date;
      if ('contract_end_date' in req.body) contract.end_date = req.body.contract_end_date;
      if ('renewal_count' in req.body) contract.renewal_count = req.body.renewal_count;
      if ('probation_start' in req.body) contract.probation_start = req.body.probation_start;
      if ('probation_end' in req.body) contract.probation_end = req.body.probation_end;
      if ('confirmation_status' in req.body) contract.confirmation_status = req.body.confirmation_status;
      if ('confirmation_date' in req.body) contract.confirmation_date = req.body.confirmation_date;
      // Check for both field names since frontend sends contract_is_renewed
      if ('contract_is_renewed' in req.body) contract.is_renewed = req.body.contract_is_renewed;
      if ('is_renewed' in req.body) contract.is_renewed = req.body.is_renewed;
      // Use processed file path if available, otherwise fall back to request body
      
      if (processedFiles.renewal_report) {
        contract.renewal_report = processedFiles.renewal_report;

      } else if ('renewal_report' in req.body) {
        contract.renewal_report = req.body.renewal_report;

      } else if ('contract_renewal_report' in req.body) {
        contract.renewal_report = req.body.contract_renewal_report;

      } else {

      }



      // Combine form data with processed files and nested objects
      const employmentData = {
        ...req.body,
        ...processedFiles,
        documentRecords,
        // Use parsed documents_to_remove instead of raw req.body.documents_to_remove
        documents_to_remove: documentsToRemove,
        salary: Object.keys(salary).length > 0 ? salary : null,
        location: Object.keys(location).length > 0 ? location : null,
        contract: Object.keys(contract).length > 0 ? contract : null
      };
      


      const employment = await employmentService.updateEmployment(req.params.id, employmentData);
      res.status(200).json({ success: true, employment });
    } catch (error) {
      console.error("Error updating employment:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Delete employment record
  deleteEmployment: async (req, res) => {
    try {
      const employment = await employmentService.deleteEmployment(req.params.id);
      res.status(200).json({
        success: true,
        message: "Employment record deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting employment:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Create salary record
  createSalary: async (req, res) => {
    try {
      const salary = await employmentService.createSalary(req.params.employmentId, req.body);
      res.status(201).json({ success: true, salary });
    } catch (error) {
      console.error("Error creating salary:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update salary record
  updateSalary: async (req, res) => {
    try {
      const salary = await employmentService.updateSalary(req.params.employmentId, req.body);
      res.status(200).json({ success: true, salary });
    } catch (error) {
      console.error("Error updating salary:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Delete salary record
  deleteSalary: async (req, res) => {
    try {
      await employmentService.deleteSalary(req.params.employmentId);
      res.status(200).json({
        success: true,
        message: "Salary record deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting salary:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Create location record
  createLocation: async (req, res) => {
    try {
      const location = await employmentService.createLocation(req.params.employmentId, req.body);
      res.status(201).json({ success: true, location });
    } catch (error) {
      console.error("Error creating location:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update location record
  updateLocation: async (req, res) => {
    try {
      const location = await employmentService.updateLocation(req.params.employmentId, req.body);
      res.status(200).json({ success: true, location });
    } catch (error) {
      console.error("Error updating location:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Delete location record
  deleteLocation: async (req, res) => {
    try {
      await employmentService.deleteLocation(req.params.employmentId);
      res.status(200).json({
        success: true,
        message: "Location record deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting location:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Create contract record
  createContract: async (req, res) => {
    try {


      // Process uploaded files
      const { processedFiles, documentRecords } = processEmploymentFiles(req.files, req);

      // Combine form data with processed files
      const contractData = {
        ...req.body,
        ...processedFiles,
        documentRecords
      };

      const contract = await employmentService.createContract(req.params.employmentId, contractData);
      res.status(201).json({ success: true, contract });
    } catch (error) {
      console.error("Error creating contract:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update contract record
  updateContract: async (req, res) => {
    try {


      // Process uploaded files
      const { processedFiles, documentRecords } = processEmploymentFiles(req.files, req);

      // Combine form data with processed files
      const contractData = {
        ...req.body,
        ...processedFiles,
        documentRecords
      };

      const contract = await employmentService.updateContract(req.params.employmentId, contractData);
      res.status(200).json({ success: true, contract });
    } catch (error) {
      console.error("Error updating contract:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Delete contract record
  deleteContract: async (req, res) => {
    try {
      await employmentService.deleteContract(req.params.employmentId);
      res.status(200).json({
        success: true,
        message: "Contract record deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting contract:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get employment statistics
  getEmploymentStatistics: async (req, res) => {
    try {
      const statistics = await employmentService.getEmploymentStatistics();
      res.status(200).json({ success: true, statistics });
    } catch (error) {
      console.error("Error fetching employment statistics:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get form options (departments, designations, etc.)
  getFormOptions: async (req, res) => {
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      let departments = [];
      let designations = [];
      let roleTags = [];
      let scaleGrades = [];
      let users = [];

      try {
        [departments, designations, roleTags, scaleGrades, users] = await Promise.all([
          prisma.department.findMany({
            where: { is_deleted: false },
            orderBy: { name: 'asc' }
          }),
          prisma.designation.findMany({
            where: { is_deleted: false },
            include: { department: true },
            orderBy: { title: 'asc' }
          }),
          prisma.roleTag.findMany({
            where: { is_deleted: false, is_active: true },
            orderBy: [{ category: 'asc' }, { name: 'asc' }]
          }),
          prisma.scaleGrade.findMany({
            where: { is_deleted: false, is_active: true },
            orderBy: [{ category: 'asc' }, { level: 'asc' }, { name: 'asc' }]
          }),
          prisma.employee.findMany({
            where: { 
              is_deleted: false,
              status: "Active"
            },
            select: {
              id: true,
              full_name: true,
              cnic: true,
              employee_id: true
            },
            orderBy: { full_name: 'asc' }
          })
        ]);
  
      } catch (dbError) {
        console.warn("⚠️ Database error, using fallback data:", dbError.message);
        // Fallback data if database is not available or empty
        departments = [
          { id: 1, name: "Engineering", code: "ENG", description: "Engineering and Technical Services" },
          { id: 2, name: "IT", code: "IT", description: "Information Technology" },
          { id: 3, name: "HR", code: "HR", description: "Human Resources" },
          { id: 4, name: "Administration", code: "ADMIN", description: "Administrative Services" },
          { id: 5, name: "Finance", code: "FIN", description: "Finance and Accounts" },
          { id: 6, name: "Legal", code: "LEGAL", description: "Legal Affairs" },
          { id: 7, name: "Operations", code: "OPS", description: "Operations Management" }
        ];
        
        designations = [
          { id: 1, title: "Junior Engineer", department_id: 1, level: 1 },
          { id: 2, title: "Assistant Engineer", department_id: 1, level: 2 },
          { id: 3, title: "Engineer", department_id: 1, level: 3 },
          { id: 4, title: "Senior Engineer", department_id: 1, level: 4 },
          { id: 5, title: "Software Developer", department_id: 2, level: 1 },
          { id: 6, title: "Senior Software Developer", department_id: 2, level: 2 },
          { id: 7, title: "IT Manager", department_id: 2, level: 3 },
          { id: 8, title: "HR Officer", department_id: 3, level: 1 },
          { id: 9, title: "Senior HR Officer", department_id: 3, level: 2 },
          { id: 10, title: "HR Manager", department_id: 3, level: 3 },
          { id: 11, title: "Administrative Officer", department_id: 4, level: 1 },
          { id: 12, title: "Senior Administrative Officer", department_id: 4, level: 2 },
          { id: 13, title: "Administrative Manager", department_id: 4, level: 3 },
          { id: 14, title: "Accounts Officer", department_id: 5, level: 1 },
          { id: 15, title: "Senior Accounts Officer", department_id: 5, level: 2 },
          { id: 16, title: "Finance Manager", department_id: 5, level: 3 },
          { id: 17, title: "Legal Officer", department_id: 6, level: 1 },
          { id: 18, title: "Senior Legal Officer", department_id: 6, level: 2 },
          { id: 19, title: "Legal Manager", department_id: 6, level: 3 },
          { id: 20, title: "Operations Officer", department_id: 7, level: 1 },
          { id: 21, title: "Senior Operations Officer", department_id: 7, level: 2 },
          { id: 22, title: "Operations Manager", department_id: 7, level: 3 }
        ];

        roleTags = [
          { id: 1, name: "admin", description: "Administrator", category: "Management" },
          { id: 2, name: "manager", description: "Manager", category: "Management" },
          { id: 3, name: "supervisor", description: "Supervisor", category: "Supervision" },
          { id: 4, name: "staff", description: "Staff", category: "Operations" },
          { id: 5, name: "worker", description: "Worker", category: "Operations" }
        ];

        scaleGrades = [
          { id: 1, name: "BPS-17", description: "Basic Pay Scale 17", level: 17, category: "Government" },
          { id: 2, name: "BPS-18", description: "Basic Pay Scale 18", level: 18, category: "Government" },
          { id: 3, name: "BPS-19", description: "Basic Pay Scale 19", level: 19, category: "Government" },
          { id: 4, name: "Grade-A", description: "Grade A", level: 1, category: "Private" },
          { id: 5, name: "Grade-B", description: "Grade B", level: 2, category: "Private" }
        ];

        users = [
          { id: 1, full_name: "John Doe", cnic: "12345-1234567-1", employee_id: "EMP001" },
          { id: 2, full_name: "Jane Smith", cnic: "12345-1234567-2", employee_id: "EMP002" },
          { id: 3, full_name: "Bob Johnson", cnic: "12345-1234567-3", employee_id: "EMP003" }
        ];
      }

      const organizations = [
        { id: 1, code: "MBWO", name: "Model Bazaar Welfare Organization" },
        { id: 2, code: "PMBMC", name: "Punjab Model Bazaars Management Company" },
        { id: 3, code: "PSBA", name: "Punjab Sahulat Bazaars Authority" }
      ];

      const employmentTypes = [
        { id: 1, type: "Regular", description: "Permanent employment" },
        { id: 2, type: "Contract", description: "Fixed-term contract" },
        { id: 3, type: "Probation", description: "Probationary period" },
        { id: 4, type: "Internship", description: "Training position" },
        { id: 5, type: "Daily Wager", description: "Daily wage employment" }
      ];

      const contractTypes = [
        { value: "Contractual", label: "Contractual", description: "Fixed-term contract" },
        { value: "Fixed-term", label: "Fixed-term", description: "Fixed duration contract" },
        { value: "Project-based", label: "Project-based", description: "Project-specific contract" },
        { value: "Temporary", label: "Temporary", description: "Temporary contract" }
      ];

      const response = {
        success: true,
        options: {
          departments: departments.map(dept => ({
            value: dept.id,
            label: dept.name,
            code: dept.code
          })), 
          designations: designations.map(des => ({
            value: des.id,
            label: des.title,
            department_id: des.department_id,
            level: des.level
          })),
          organizations: organizations.map(org => ({
            value: org.code,
            label: org.name
          })),
          employmentTypes: employmentTypes.map(type => ({
            value: type.type,
            label: type.type,
            description: type.description
          })),
          roleTags: roleTags.map(tag => ({
            value: tag.id,
            label: tag.name,
            description: tag.description,
            category: tag.category
          })),
          scaleGrades: scaleGrades.map(grade => ({
            value: grade.id,
            label: grade.name,
            description: grade.description,
            level: grade.level,
            category: grade.category
          })),
          users: users.map(user => ({
            value: user.id,
            label: `${user.full_name} - ${user.cnic || user.employee_id}`,
            employee_id: user.employee_id,
            cnic: user.cnic
          })),
          contractTypes: contractTypes
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("❌ Error fetching form options:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get employees for reporting officer selection
  getEmployeesForReportingOfficer: async (req, res) => {
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      const employees = await prisma.employee.findMany({
        where: { 
          is_deleted: false,
          status: "Active"
        },
        select: {
          id: true,
          full_name: true,
          cnic: true,
          employee_id: true
        },
        orderBy: { full_name: 'asc' }
      });

      const formattedEmployees = employees.map(emp => ({
        value: emp.id,
        label: `${emp.full_name} - ${emp.cnic || emp.employee_id}`,
        employee_id: emp.employee_id,
        cnic: emp.cnic
      }));

      res.status(200).json({
        success: true,
        employees: formattedEmployees
      });
    } catch (error) {
      console.error("❌ Error fetching employees for reporting officer:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get designations by department
  getDesignationsByDepartment: async (req, res) => {
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      const departmentId = parseInt(req.params.departmentId);
      const designations = await prisma.designation.findMany({
        where: { department_id: departmentId },
        orderBy: { level: 'asc' }
      });

      res.status(200).json({
        success: true,
        designations: designations.map(des => ({
          value: des.id,
          label: des.title,
          id: des.id,
          level: des.level,
          department_id: des.department_id
        }))
      });
    } catch (error) {
      console.error("Error fetching designations:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  }
};

module.exports = employmentController;
