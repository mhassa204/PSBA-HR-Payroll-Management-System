const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const employmentService = {
  // Helper to normalize location for backward compatibility
  mapLocationCompat(loc) {
    if (!loc) return null;
    return {
      ...loc,
      // expose canonical name (prefer existing name field if present)
      name: loc.name || loc.bazaar_name || loc.head_office_name || null,
      // compat fields expected by frontend (from old EmploymentLocation)
      bazaar_name: loc.name || loc.bazaar_name || null,
      // expose city/district names if relations are loaded; fallback null
      city: typeof loc.city === 'object' && loc.city !== null ? loc.city.name : null,
      district: typeof loc.district === 'object' && loc.district !== null ? loc.district.name : null,
    };
  },

  // Helper function to check for existing renewal report documents
  checkExistingRenewalReport: async (employmentId) => {
    try {
      // Query the EmploymentDocument table for renewal report documents
      const allDocuments = await prisma.employmentDocument.findMany({
        where: {
          employment_id: parseInt(employmentId),
          is_deleted: false
        },
        select: {
          id: true,
          file_path: true,
          document_name: true,
          file_type: true
        }
      });
      
      // Look for renewal report documents with various possible file_type values
      const renewalDocuments = allDocuments.filter(doc => 
        doc.file_type === 'renewal_report' 
      );
      
      return renewalDocuments.length > 0 ? renewalDocuments[0] : null;
    } catch (error) {
      console.error(`❌ EmploymentService: Error checking for renewal report documents:`, error);
      return null;
    }
  },

  // Helper function to filter data based on organization rules
  filterDataByOrganization : (data) => {
    const { organization, ...employmentData } = data;
    
    const hiddenFieldsByOrg = {
      MBWO: ['department', 'employment_type', 'role_tag', 'reporting_officer_id', 'office_location', 'scale_grade', 'medical_fitness_report_pdf', 'filer_status', 'filer_active_status', 'employment_status', 'is_current', 'is_on_probation', 'probation_end_date'],
      PMBMC: [],
      PSBA: []
    };
    
    const hiddenFields = hiddenFieldsByOrg[organization] || [];
    
    // Remove hidden fields from the data
    const filteredData = { ...employmentData };
    hiddenFields.forEach(field => {
      if (filteredData[field] !== undefined) {
        delete filteredData[field];
      }
    });
    
    // Add organization back
    filteredData.organization = organization;
    
    return filteredData;
  },

  // New helper: build renewal document record from provided metadata or an existing doc id
  buildRenewalDocFromMeta: async (tx, employmentId, data) => {
    try {
      // If explicit metadata provided, prefer that
      const hasMeta = data.renewal_report_file_path || data.renewal_report_document_name || data.renewal_report_url;
      const hasId = data.renewal_report_id;

      let source = null;
      if (hasMeta) {
        source = {
          file_path: data.renewal_report_file_path || (typeof data.renewal_report_url === 'string' ? data.renewal_report_url.replace(/^\/uploads\//, 'uploads/') : null),
          document_name: data.renewal_report_document_name || 'Contract Renewal Report',
          mime_type: data.renewal_report_mime_type || 'application/pdf',
          file_size: data.renewal_report_file_size ? parseInt(data.renewal_report_file_size, 10) : null
        };
      } else if (hasId) {
        const existing = await tx.employmentDocument.findFirst({
          where: { id: parseInt(data.renewal_report_id, 10), is_deleted: false }
        });
        if (existing) {
          source = {
            file_path: existing.file_path,
            document_name: existing.document_name,
            mime_type: existing.mime_type,
            file_size: existing.file_size
          };
        }
      }

      if (!source || !source.file_path) return null; // Nothing to create

      // Create a new employment document for this employment
      const created = await tx.employmentDocument.create({
        data: {
          employment_id: parseInt(employmentId, 10),
          file_path: source.file_path,
          file_type: 'renewal_report',
          document_name: source.document_name || 'Contract Renewal Report',
          file_size: source.file_size || 0,
          mime_type: source.mime_type || 'application/pdf'
        }
      });
      return created;
    } catch (e) {
      console.warn('⚠️ EmploymentService: Failed to build renewal doc from metadata:', e.message);
      return null;
    }
  },

  // Helper: resolve or create a master Location and return its id
  resolveLocationId: async (tx, loc) => {
    if (!loc) return null;
    const explicitId = loc.location_id || loc.id;
    if (explicitId !== undefined && explicitId !== null && explicitId !== '' && explicitId !== 'null' && explicitId !== 'undefined') {
      const numeric = Number(explicitId);
      if (!Number.isNaN(numeric)) {
        const existingById = await tx.location.findFirst({ where: { id: numeric, is_deleted: false } });
        return existingById ? existingById.id : null;
      }
    }

    // Backward compatibility: older payloads used bazaar_name + type to derive / create
    const rawName = loc.bazaar_name || loc.name;
    const type = loc.type || 'HEAD_OFFICE';

    // If no meaningful name provided OR name equals generic type labels, do NOT auto-create
    if (!rawName || ['BAZAAR', 'SAHULAT_BAZAAR', 'HEAD_OFFICE', 'HEAD_QUARTER', 'HEADQUARTER', 'OFFICE'].includes(String(rawName).toUpperCase())) {
      return null; // ignore incomplete placeholder
    }

    const name = String(rawName).trim();

    // Try exact match first (case-sensitive), then case-insensitive
    let existing = await tx.location.findFirst({
      where: { name, type, is_deleted: false }
    });
    if (!existing) {
      existing = await tx.location.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, type, is_deleted: false }
      });
    }
    if (existing) return existing.id;

    // LAST RESORT (legacy behaviour): only create if a real custom name (length > 2)
    if (name.length <= 2) return null;

    let district_id = null; let city_id = null;
    if (loc.district_id) district_id = parseInt(loc.district_id);
    if (loc.city_id) city_id = parseInt(loc.city_id);
    if (!district_id && loc.district) {
      const d = await tx.district.findFirst({ where: { name: loc.district, is_deleted: false } });
      district_id = d?.id || null;
    }
    if (!city_id && loc.city) {
      const c = await tx.city.findFirst({ where: { name: loc.city, is_deleted: false } });
      city_id = c?.id || null;
    }

    const created = await tx.location.create({
      data: { name, type, district_id, city_id, is_active: true, is_deleted: false }
    });
    return created.id;
  },

// src/services/employmentService.js
createEmployment: async (data) => {
  const filteredData = employmentService.filterDataByOrganization(data);
  // Normalize possible incoming location id field names (flat, nested, legacy, bracket, camelCase)
  const possibleLocId = filteredData.location_id || filteredData.location_location_id || filteredData['location_location_id'] || filteredData['location[location_id]'] || filteredData.locationId;
  if (!filteredData.location_id && possibleLocId) {
    filteredData.location_id = possibleLocId;
  }
  if (!filteredData.location && filteredData.location_id) {
    filteredData.location = { id: filteredData.location_id };
  }

  let { 
    user_id,
    employee_id,
    organization,
    department_id,
    designation_id,
    employment_type = "Regular",
    effective_from,
    effective_till,
    role_tag_id,
    reporting_officer_id,
    office_location,
    remarks,
    scale_grade_id,
    employment_status = "active",
    is_current,
    filer_status = "non_filer",
    filer_active_status,
    is_on_probation = false,
    probation_end_date,
    salary,
    location,
    location_id,
    contract,
    documentRecords = []
  } = filteredData;

  if (!location && location_id) {
    location = { id: location_id };
  }
  if (is_current === undefined) {
    is_current = organization === 'MBWO' ? false : true;
  }
  const actualEmployeeId = employee_id || user_id;
  const employee = await prisma.employee.findFirst({ where: { id: parseInt(actualEmployeeId), is_deleted: false } });
  if (!employee) throw new Error("Invalid employee_id");
  if (department_id) {
    const department = await prisma.department.findFirst({ where: { id: parseInt(department_id), is_deleted: false } });
    if (!department) throw new Error("Invalid department_id");
  }
  if (designation_id) {
    const designation = await prisma.designation.findFirst({ where: { id: parseInt(designation_id), is_deleted: false } });
    if (!designation) throw new Error("Invalid designation_id");
  }
  const toBoolean = (value) => { if (typeof value === 'boolean') return value; if (typeof value === 'string') { return value.toLowerCase() === 'true'; } return Boolean(value); };
  const cleanValue = (value) => (value === undefined || value === 'undefined' || value === 'null') ? null : value;

  return prisma.$transaction(async (tx) => {
    // Single location resolution (no duplicate post-create blocks)
    let resolvedLocationId = null;
    if (location) {
      resolvedLocationId = await employmentService.resolveLocationId(tx, location);
    }
    const employment = await tx.employment.create({
      data: {
        employee_id: parseInt(actualEmployeeId),
        organization,
        department_id: department_id ? parseInt(department_id) : null,
        designation_id: designation_id ? parseInt(designation_id) : null,
        employment_type,
        effective_from: effective_from ? new Date(effective_from) : null,
        effective_till: effective_till ? new Date(effective_till) : null,
        role_tag_id: role_tag_id ? parseInt(role_tag_id) : null,
        scale_grade_id: scale_grade_id ? parseInt(scale_grade_id) : null,
        reporting_officer_id: cleanValue(reporting_officer_id),
        office_location: cleanValue(office_location),
        remarks: cleanValue(remarks),
        employment_status,
        is_current: toBoolean(is_current),
        filer_status,
        filer_active_status: cleanValue(filer_active_status),
        is_on_probation: toBoolean(is_on_probation),
        probation_end_date: probation_end_date ? new Date(probation_end_date) : null,
        location_id: resolvedLocationId || null,
      }
    });

    if (salary) {
      await tx.employmentSalary.create({
        data: {
          employment_id: employment.id,
          basic_salary: salary.basic_salary ? parseFloat(salary.basic_salary) : 0,
          gross_salary: salary.gross_salary ? parseFloat(salary.gross_salary) : null,
          medical_allowance: salary.medical_allowance ? parseFloat(salary.medical_allowance) : 0,
          house_rent: salary.house_rent ? parseFloat(salary.house_rent) : 0,
          conveyance_allowance: salary.conveyance_allowance ? parseFloat(salary.conveyance_allowance) : 0,
          other_allowances: salary.other_allowances ? parseFloat(salary.other_allowances) : 0,
          daily_wage_rate: salary.daily_wage_rate ? parseFloat(salary.daily_wage_rate) : null,
          bank_account_primary: salary.bank_account_primary || null,
          bank_name_primary: salary.bank_name_primary || null,
          bank_branch_code: salary.bank_branch_code || null,
          payment_mode: salary.payment_mode || "Bank Transfer",
          salary_effective_from: salary.salary_effective_from ? new Date(salary.salary_effective_from) : null,
          salary_effective_till: salary.salary_effective_till ? new Date(salary.salary_effective_till) : null,
          payroll_status: salary.payroll_status || "Active"
        }
      });
    }

    if (contract) {
      await tx.employmentContract.create({
        data: {
          employment_id: employment.id,
          contract_type: cleanValue(contract.contract_type),
          contract_number: cleanValue(contract.contract_number),
            start_date: contract.start_date ? new Date(contract.start_date) : null,
            end_date: contract.end_date ? new Date(contract.end_date) : null,
            renewal_count: contract.renewal_count ? parseInt(contract.renewal_count) : 0,
            probation_start: contract.probation_start ? new Date(contract.probation_start) : null,
            probation_end: contract.probation_end ? new Date(contract.probation_end) : null,
            confirmation_status: cleanValue(contract.confirmation_status),
            confirmation_date: contract.confirmation_date ? new Date(contract.confirmation_date) : null,
            is_renewed: toBoolean(contract.is_renewed),
        }
      });
    }

    const hasUploadedRenewal = Array.isArray(documentRecords) && documentRecords.some(d => d.file_type === 'renewal_report');
    if (!hasUploadedRenewal) { await employmentService.buildRenewalDocFromMeta(tx, employment.id, filteredData); }
    if (documentRecords && documentRecords.length > 0) {
      for (const doc of documentRecords) {
        await tx.employmentDocument.create({ data: { employment_id: employment.id, file_path: doc.file_path, file_type: doc.file_type, document_name: doc.document_name, file_size: doc.file_size, mime_type: doc.mime_type, associated_id: doc.associated_id } });
      }
    }

    return tx.employment.findFirst({
      where: { id: employment.id, is_deleted: false },
      include: { employee: true, department: true, designation: true, salary: true, location: { include: { city: true, district: true } }, contract: true, documents: true }
    }).then((e) => ({ ...e, location: employmentService.mapLocationCompat(e.location) }));
  });
},



  // Get all employment records with pagination
  getAllEmployments: async (page = 1, limit = 10, filters = {}) => {
    const skip = (page - 1) * limit;
    const where = { is_deleted: false };

    // Apply filters
    if (filters.employee_id) {
      where.employee_id = parseInt(filters.employee_id);
    }
    if (filters.organization) {
      where.organization = filters.organization;
    }
    if (filters.department_id) {
      where.department_id = parseInt(filters.department_id);
    }
    if (filters.employment_type) {
      where.employment_type = filters.employment_type;
    }
    if (filters.is_current !== undefined) {
      where.is_current = filters.is_current === 'true';
    }

    const [employments, total] = await Promise.all([
      prisma.employment.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: true,
          department: true,
          designation: true,
          salary: true,
          location: { include: { city: true, district: true } },
          contract: true,
          documents: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employment.count({ where })
    ]);

    const data = employments.map(e => ({ ...e, location: employmentService.mapLocationCompat(e.location) }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  // Get employment record by ID
  getEmploymentById: async (id) => {
    const employment = await prisma.employment.findFirst({
      where: { 
        id: parseInt(id),
        is_deleted: false
      },
              include: {
          employee: true,
          department: true,
          designation: true,
          role_tag: true,
          scale_grade: true,
          salary: true,
          location: { include: { city: true, district: true } },
          contract: true,
          documents: true
        }
    });

    if (!employment) return null;

    // Process documents to add URL and metadata
    const processedDocuments = employment.documents.map(doc => {
      const normalizedPath = doc.file_path.replace(/\\/g, '/');
      const cleanPath = normalizedPath.startsWith('uploads/') ? normalizedPath.substring(8) : normalizedPath;
      return {
        ...doc,
        url: `/uploads/${cleanPath}`,
        isImage: /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.file_path),
        isPdf: /\.pdf$/i.test(doc.file_path),
        fileExtension: doc.file_path.substring(doc.file_path.lastIndexOf('.') + 1).toLowerCase()
      };
    });

    return {
      ...employment,
      location: employmentService.mapLocationCompat(employment.location),
      documents: processedDocuments
    };
  },

  // Get employment records by employee ID
  getEmploymentsByEmployeeId: async (employeeId) => {
    const employments = await prisma.employment.findMany({
      where: { 
        employee_id: parseInt(employeeId),
        is_deleted: false
      },
      include: {
        department: true,
        designation: true,
        role_tag: true,
        scale_grade: true,
        salary: true,
        location: { include: { city: true, district: true } },
        contract: true,
        documents: true
      },
      orderBy: { effective_from: 'asc' }
    });

    // Process documents for each employment record
    return employments.map(employment => {
      const processedDocuments = employment.documents.map(doc => {
        const normalizedPath = doc.file_path.replace(/\\/g, '/');
        const cleanPath = normalizedPath.startsWith('uploads/') ? normalizedPath.substring(8) : normalizedPath;
        return {
          ...doc,
          url: `/uploads/${cleanPath}`,
          isImage: /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.file_path),
          isPdf: /\.pdf$/i.test(doc.file_path),
          fileExtension: doc.file_path.substring(doc.file_path.lastIndexOf('.') + 1).toLowerCase()
        };
      });

      return {
        ...employment,
        location: employmentService.mapLocationCompat(employment.location),
        documents: processedDocuments
      };
    });
  },

  // Clone an employment record (including renewal_report and other documents)
  cloneEmployment: async (sourceEmploymentId, overrides = {}) => {
    const src = await prisma.employment.findFirst({
      where: { id: parseInt(sourceEmploymentId), is_deleted: false },
      include: { salary: true, contract: true, documents: { where: { is_deleted: false } } }
    });
    if (!src) throw new Error('Source employment not found');

    return prisma.$transaction(async (tx) => {
      const cloned = await tx.employment.create({
        data: {
          employee_id: src.employee_id,
          organization: src.organization,
          department_id: src.department_id,
          designation_id: src.designation_id,
          employment_type: src.employment_type,
          effective_from: overrides.effective_from ? new Date(overrides.effective_from) : src.effective_from,
          effective_till: overrides.effective_till ? new Date(overrides.effective_till) : src.effective_till,
          role_tag_id: src.role_tag_id,
          scale_grade_id: src.scale_grade_id,
          reporting_officer_id: src.reporting_officer_id,
          office_location: src.office_location,
          remarks: overrides.remarks !== undefined ? overrides.remarks : src.remarks,
          employment_status: src.employment_status,
          is_current: false,
          filer_status: src.filer_status,
          filer_active_status: src.filer_active_status,
          is_on_probation: src.is_on_probation,
          probation_end_date: src.probation_end_date,
          location_id: src.location_id
        }
      });

      if (src.salary) {
        await tx.employmentSalary.create({ data: { employment_id: cloned.id, basic_salary: src.salary.basic_salary, gross_salary: src.salary.gross_salary, medical_allowance: src.salary.medical_allowance, house_rent: src.salary.house_rent, conveyance_allowance: src.salary.conveyance_allowance, other_allowances: src.salary.other_allowances, daily_wage_rate: src.salary.daily_wage_rate, bank_account_primary: src.salary.bank_account_primary, bank_name_primary: src.salary.bank_name_primary, bank_branch_code: src.salary.bank_branch_code, payment_mode: src.salary.payment_mode, salary_effective_from: src.salary.salary_effective_from, salary_effective_till: src.salary.salary_effective_till, payroll_status: src.salary.payroll_status } });
      }

      if (src.contract) {
        await tx.employmentContract.create({ data: { employment_id: cloned.id, contract_type: src.contract.contract_type, contract_number: src.contract.contract_number, start_date: src.contract.start_date, end_date: src.contract.end_date, renewal_count: src.contract.renewal_count, probation_start: src.contract.probation_start, probation_end: src.contract.probation_end, confirmation_status: src.contract.confirmation_status, confirmation_date: src.contract.confirmation_date, is_renewed: src.contract.is_renewed } });
      }

      if (src.documents && src.documents.length) {
        for (const doc of src.documents) {
          await tx.employmentDocument.create({ data: { employment_id: cloned.id, file_path: doc.file_path, file_type: doc.file_type, document_name: doc.document_name, file_size: doc.file_size, mime_type: doc.mime_type, associated_id: doc.associated_id } });
        }
      } else if (src.contract) {
        const renewalDoc = await tx.employmentDocument.findFirst({ where: { employment_id: src.id, file_type: 'renewal_report', is_deleted: false } });
        if (renewalDoc) {
          await tx.employmentDocument.create({ data: { employment_id: cloned.id, file_path: renewalDoc.file_path, file_type: renewalDoc.file_type, document_name: renewalDoc.document_name, file_size: renewalDoc.file_size, mime_type: renewalDoc.mime_type, associated_id: renewalDoc.associated_id } });
        }
      }

      const full = await tx.employment.findFirst({
        where: { id: cloned.id },
        include: { salary: true, contract: true, documents: { where: { is_deleted: false } }, location: { include: { city: true, district: true } } }
      });

      const processedDocuments = full.documents.map(doc => {
        const normalizedPath = doc.file_path.replace(/\\/g, '/');
        const cleanPath = normalizedPath.startsWith('uploads/') ? normalizedPath.substring(8) : normalizedPath;
        return { ...doc, url: `/uploads/${cleanPath}`, isImage: /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.file_path), isPdf: /\.pdf$/i.test(doc.file_path), fileExtension: doc.file_path.substring(doc.file_path.lastIndexOf('.') + 1).toLowerCase() };
      });

      return { ...full, location: employmentService.mapLocationCompat(full.location), documents: processedDocuments };
    });
  },


  // Update employment record
  updateEmployment: async (id, data) => {
    const filteredData = employmentService.filterDataByOrganization(data);
    // Normalize location id patterns
    const possibleLocId = filteredData.location_id || filteredData.location_location_id || filteredData['location_location_id'] || filteredData['location[location_id]'] || filteredData.locationId;
    if (!filteredData.location_id && possibleLocId) filteredData.location_id = possibleLocId;
    if (!filteredData.location && filteredData.location_id) {
      filteredData.location = { id: filteredData.location_id };
    }
    
    let { organization, department_id, designation_id, employment_type, effective_from, effective_till, role_tag_id, reporting_officer_id, office_location, remarks, scale_grade_id, employment_status, is_current, filer_status, filer_active_status, is_on_probation, probation_end_date, salary, location, location_id, contract, documentRecords = [] } = filteredData;

    if (!location && location_id) { location = { id: location_id }; }
    if (is_current === undefined) { is_current = organization === 'MBWO' ? false : true; }

    if (department_id) { const department = await prisma.department.findFirst({ where: { id: parseInt(department_id), is_deleted: false } }); if (!department) throw new Error("Invalid department_id"); }
    if (designation_id) { const designation = await prisma.designation.findFirst({ where: { id: parseInt(designation_id), is_deleted: false } }); if (!designation) throw new Error("Invalid designation_id"); }

    const currentEmployment = await prisma.employment.findFirst({ where: { id: parseInt(id), is_deleted: false } });
    if (!currentEmployment) throw new Error("Employment record not found");

    const toBoolean = (value) => { if (typeof value === 'boolean') return value; if (typeof value === 'string') { return value.toLowerCase() === 'true'; } return Boolean(value); };
    const cleanValue = (value) => (value === undefined || value === 'undefined') ? null : value;

    return prisma.$transaction(async (tx) => {
      let resolvedLocId = null;
      if (location) { resolvedLocId = await employmentService.resolveLocationId(tx, location); }
      const employmentUpdateData = {};
      if (organization !== undefined) employmentUpdateData.organization = organization;
      if (department_id !== undefined) employmentUpdateData.department_id = department_id ? parseInt(department_id) : null;
      if (designation_id !== undefined) employmentUpdateData.designation_id = designation_id ? parseInt(designation_id) : null;
      if (employment_type !== undefined) employmentUpdateData.employment_type = employment_type;
      if (effective_from !== undefined) employmentUpdateData.effective_from = effective_from !== 'null' ? new Date(effective_from) : null;
      if (effective_till !== undefined) employmentUpdateData.effective_till = effective_till !== 'null' ? new Date(effective_till) : null;
      if (role_tag_id !== undefined) employmentUpdateData.role_tag_id = role_tag_id ? parseInt(role_tag_id) : null;
      if (scale_grade_id !== undefined) employmentUpdateData.scale_grade_id = scale_grade_id ? parseInt(scale_grade_id) : null;
      if (reporting_officer_id !== undefined) employmentUpdateData.reporting_officer_id = cleanValue(reporting_officer_id);
      if (office_location !== undefined) employmentUpdateData.office_location = cleanValue(office_location);
      if (remarks !== undefined) employmentUpdateData.remarks = cleanValue(remarks);
      if (employment_status !== undefined) employmentUpdateData.employment_status = employment_status;
      if (is_current !== undefined) employmentUpdateData.is_current = toBoolean(is_current);
      if (filer_status !== undefined) employmentUpdateData.filer_status = filer_status;
      if (filer_active_status !== undefined) employmentUpdateData.filer_active_status = cleanValue(filer_active_status);
      if (is_on_probation !== undefined) employmentUpdateData.is_on_probation = toBoolean(is_on_probation);
      if (probation_end_date !== undefined) employmentUpdateData.probation_end_date = probation_end_date !== 'null' ? new Date(probation_end_date) : null;
      if (resolvedLocId !== null) employmentUpdateData.location_id = resolvedLocId;

      const employment = await tx.employment.update({ where: { id: parseInt(id) }, data: employmentUpdateData });

      if (salary) {
        const salaryData = { basic_salary: salary.basic_salary ? parseFloat(salary.basic_salary) : 0, gross_salary: salary.gross_salary ? parseFloat(salary.gross_salary) : null, medical_allowance: salary.medical_allowance ? parseFloat(salary.medical_allowance) : 0, house_rent: salary.house_rent ? parseFloat(salary.house_rent) : 0, conveyance_allowance: salary.conveyance_allowance ? parseFloat(salary.conveyance_allowance) : 0, other_allowances: salary.other_allowances ? parseFloat(salary.other_allowances) : 0, daily_wage_rate: salary.daily_wage_rate ? parseFloat(salary.daily_wage_rate) : null, bank_account_primary: salary.bank_account_primary || null, bank_name_primary: salary.bank_name_primary || null, bank_branch_code: salary.bank_branch_code || null, payment_mode: salary.payment_mode || "Bank Transfer", salary_effective_from: salary.salary_effective_from ? new Date(salary.salary_effective_from) : null, salary_effective_till: salary.salary_effective_till ? new Date(salary.salary_effective_till) : null, payroll_status: salary.payroll_status || "Active" };
        await tx.employmentSalary.upsert({ where: { employment_id: employment.id }, update: salaryData, create: { employment_id: employment.id, ...salaryData } });
      }

      if (contract) {
        const contractData = { contract_type: cleanValue(contract.contract_type), contract_number: cleanValue(contract.contract_number), start_date: contract.start_date ? new Date(contract.start_date) : null, end_date: contract.end_date ? new Date(contract.end_date) : null, renewal_count: contract.renewal_count ? parseInt(contract.renewal_count) : 0, probation_start: contract.probation_start ? new Date(contract.probation_start) : null, probation_end: contract.probation_end ? new Date(contract.probation_end) : null, confirmation_status: cleanValue(contract.confirmation_status), confirmation_date: contract.confirmation_date ? new Date(contract.confirmation_date) : null, is_renewed: toBoolean(contract.is_renewed) };
        await tx.employmentContract.upsert({ where: { employment_id: employment.id }, update: contractData, create: { employment_id: employment.id, ...contractData } });
      }

      // Handle document updates (add new, remove old)
      if (data.documents_to_remove && data.documents_to_remove.length > 0) {
        // Delete document records specified in documents_to_remove
        await tx.employmentDocument.deleteMany({
          where: {
            id: { in: data.documents_to_remove.map(id => parseInt(id)) },
            employment_id: employment.id,
          },
        });
      }

      if (documentRecords && documentRecords.length > 0) {
        for (const doc of documentRecords) {
          // Check if a document of this type already exists for this employment
          const existingDoc = await tx.employmentDocument.findFirst({
            where: {
              employment_id: employment.id,
              file_type: doc.file_type,
            },
          });

          if (existingDoc) {
            // Update existing document
            await tx.employmentDocument.update({
              where: { id: existingDoc.id },
              data: {
                file_path: doc.file_path,
                document_name: doc.document_name,
                file_size: doc.file_size,
                mime_type: doc.mime_type,
              },
            });
            // Document updated
          } else {
            // Create new document
            await tx.employmentDocument.create({
              data: {
                employment_id: employment.id,
                file_path: doc.file_path,
                file_type: doc.file_type,
                document_name: doc.document_name,
                file_size: doc.file_size,
                mime_type: doc.mime_type,
                associated_id: doc.associated_id,
              },
            });
          }
        }
      }

      // If still no renewal_report document and metadata provided, create it now
      const alreadyHasRenewal = await tx.employmentDocument.findFirst({
        where: { employment_id: employment.id, file_type: 'renewal_report', is_deleted: false }
      });
      if (!alreadyHasRenewal) {
        await employmentService.buildRenewalDocFromMeta(tx, employment.id, filteredData);
      }

      return tx.employment.findFirst({
        where: { 
          id: employment.id,
          is_deleted: false
        },
        include: {
          employee: true,
          department: true,
          designation: true,
          salary: true,
          location: { include: { city: true, district: true } },
          contract: true,
          documents: true
        }
      }).then((e) => ({
        ...e,
        location: employmentService.mapLocationCompat(e.location)
      }));
    });
  },


  // Delete employment record
  deleteEmployment: async (id) => {
    return await prisma.$transaction(async (tx) => {
      // Soft delete the employment record and all related records
      
      // 1. Soft delete employment documents
      await tx.employmentDocument.updateMany({
        where: { employment_id: parseInt(id) },
        data: { is_deleted: true }
      });

      // 2. Soft delete employment contract
      await tx.employmentContract.updateMany({
        where: { employment_id: parseInt(id) },
        data: { is_deleted: true }
      });

      // 3. Soft delete employment salary
      await tx.employmentSalary.updateMany({
        where: { employment_id: parseInt(id) },
        data: { is_deleted: true }
      });

      // 4. Finally soft delete the employment record
      const deletedEmployment = await tx.employment.update({
        where: { id: parseInt(id) },
        data: { is_deleted: true }
      });

      return {
        success: true,
        message: `Employment record ${deletedEmployment.id} and all related records soft deleted successfully`,
        deletedEmployment
      };
    });
  },

  // Restore a soft-deleted employment record
  restoreEmployment: async (id) => {
    return await prisma.$transaction(async (tx) => {
      // Restore the employment record and all related records
      
      // 1. Restore the employment record
      const restoredEmployment = await tx.employment.update({
        where: { id: parseInt(id) },
        data: { is_deleted: false }
      });

      // 2. Restore employment salary
      await tx.employmentSalary.updateMany({
        where: { employment_id: parseInt(id) },
        data: { is_deleted: false }
      });

      // 3. Restore employment contract
      await tx.employmentContract.updateMany({
        where: { employment_id: parseInt(id) },
        data: { is_deleted: false }
      });

      // 4. Restore employment documents
      await tx.employmentDocument.updateMany({
        where: { employment_id: parseInt(id) },
        data: { is_deleted: false }
      });

      return {
        success: true,
        message: `Employment record ${restoredEmployment.id} and all related records restored successfully`,
        restoredEmployment
      };
    });
  },

  // Create salary record
  createSalary: async (employmentId, salaryData) => {
    const employment = await prisma.employment.findFirst({
      where: { 
        id: parseInt(employmentId),
        is_deleted: false
      }
    });
    if (!employment) throw new Error("Employment record not found");

    return prisma.employmentSalary.create({
      data: {
        employment_id: parseInt(employmentId),
        basic_salary: salaryData.basic_salary ? parseFloat(salaryData.basic_salary) : 0,
        medical_allowance: salaryData.medical_allowance ? parseFloat(salaryData.medical_allowance) : 0,
        house_rent: salaryData.house_rent ? parseFloat(salaryData.house_rent) : 0,
        conveyance_allowance: salaryData.conveyance_allowance ? parseFloat(salaryData.conveyance_allowance) : 0,
        other_allowances: salaryData.other_allowances ? parseFloat(salaryData.other_allowances) : 0,
        daily_wage_rate: salaryData.daily_wage_rate ? parseFloat(salaryData.daily_wage_rate) : null,
        bank_account_primary: salaryData.bank_account_primary || null,
        bank_name_primary: salaryData.bank_name_primary || null,
        bank_branch_code: salaryData.bank_branch_code || null,
        payment_mode: salaryData.payment_mode || "Bank Transfer",
        salary_effective_from: salaryData.salary_effective_from ? new Date(salaryData.salary_effective_from) : null,
        salary_effective_till: salaryData.salary_effective_till ? new Date(salaryData.salary_effective_till) : null,
        payroll_status: salaryData.payroll_status || "Active"
      }
    });
  },

  // Update salary record
  updateSalary: async (employmentId, salaryData) => {
    const employment = await prisma.employment.findFirst({
      where: { 
        id: parseInt(employmentId),
        is_deleted: false
      }
    });
    if (!employment) throw new Error("Employment record not found");

    return prisma.employmentSalary.update({
      where: { employment_id: parseInt(employmentId) },
      data: {
        basic_salary: salaryData.basic_salary ? parseFloat(salaryData.basic_salary) : 0,
        medical_allowance: salaryData.medical_allowance ? parseFloat(salaryData.medical_allowance) : 0,
        house_rent: salaryData.house_rent ? parseFloat(salaryData.house_rent) : 0,
        conveyance_allowance: salaryData.conveyance_allowance ? parseFloat(salaryData.conveyance_allowance) : 0,
        other_allowances: salaryData.other_allowances ? parseFloat(salaryData.other_allowances) : 0,
        daily_wage_rate: salaryData.daily_wage_rate ? parseFloat(salaryData.daily_wage_rate) : null,
        bank_account_primary: salaryData.bank_account_primary || null,
        bank_name_primary: salaryData.bank_name_primary || null,
        bank_branch_code: salaryData.bank_branch_code || null,
        payment_mode: salaryData.payment_mode || "Bank Transfer",
        salary_effective_from: salaryData.salary_effective_from ? new Date(salaryData.salary_effective_from) : null,
        salary_effective_till: salaryData.salary_effective_till ? new Date(salaryData.salary_effective_till) : null,
        payroll_status: salaryData.payroll_status || "Active"
      }
    });
  },

  // Delete salary record
  deleteSalary: async (employmentId) => {
    const deletedSalary = await prisma.employmentSalary.update({
      where: { employment_id: parseInt(employmentId) },
      data: { is_deleted: true }
    });

    return {
      success: true,
      message: `Salary record for employment ${employmentId} soft deleted successfully`,
      deletedSalary
    };
  },

  // Restore a soft-deleted salary record
  restoreSalary: async (employmentId) => {
    const restoredSalary = await prisma.employmentSalary.update({
      where: { employment_id: parseInt(employmentId) },
      data: { is_deleted: false }
    });

    return {
      success: true,
      message: `Salary record for employment ${employmentId} restored successfully`,
      restoredSalary
    };
  },

  // Create location record
  createLocation: async (employmentId, locationData) => {
    const employment = await prisma.employment.findFirst({
      where: { 
        id: parseInt(employmentId),
        is_deleted: false
      }
    });
    if (!employment) throw new Error("Employment record not found");

    return prisma.$transaction(async (tx) => {
      // NEW: accept direct id/location_id
      let locId = null;
      if (locationData.location_id || locationData.id) {
        const existing = await tx.location.findFirst({ where: { id: Number(locationData.location_id || locationData.id), is_deleted: false } });
        if (!existing) throw new Error("Invalid location_id");
        locId = existing.id;
      } else {
        locId = await employmentService.resolveLocationId(tx, locationData);
      }
      const updated = await tx.employment.update({
        where: { id: parseInt(employmentId) },
        data: { location_id: locId }
      });
      return updated;
    });
  },

  // Update location record
  updateLocation: async (employmentId, locationData) => {
    const employment = await prisma.employment.findFirst({
      where: { 
        id: parseInt(employmentId),
        is_deleted: false
      }
    });
    if (!employment) throw new Error("Employment record not found");

    return prisma.$transaction(async (tx) => {
      let locId = null;
      if (locationData.location_id || locationData.id) {
        const existing = await tx.location.findFirst({ where: { id: Number(locationData.location_id || locationData.id), is_deleted: false } });
        if (!existing) throw new Error("Invalid location_id");
        locId = existing.id;
      } else {
        locId = await employmentService.resolveLocationId(tx, locationData);
      }
      const updated = await tx.employment.update({
        where: { id: parseInt(employmentId) },
        data: { location_id: locId }
      });
      return updated;
    });
  },

  // Delete location record
  deleteLocation: async (employmentId) => {
    const updated = await prisma.employment.update({
      where: { id: parseInt(employmentId) },
      data: { location_id: null }
    });

    return {
      success: true,
      message: `Location cleared for employment ${employmentId}`,
      deletedLocation: updated
    };
  },

  // Restore a soft-deleted location record
  restoreLocation: async (employmentId) => {
    // No-op: locations are not soft-deleted per employment anymore
    return {
      success: true,
      message: `Nothing to restore for employment ${employmentId}`,
      restoredLocation: null
    };
  },

  // Create contract record
  createContract: async (employmentId, contractData) => {
    const employment = await prisma.employment.findFirst({
      where: { 
        id: parseInt(employmentId),
        is_deleted: false
      }
    });
    if (!employment) throw new Error("Employment record not found");

    const { documentRecords = [], ...contractFields } = contractData;

    // Helpers to normalize incoming values (can be strings from the UI)
    const toBoolean = (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      return Boolean(value);
    };
    const toIntOrDefault = (value, def = 0) => {
      if (value === undefined || value === null || value === '') return def;
      const n = parseInt(value, 10);
      return Number.isNaN(n) ? def : n;
    };
    const cleanDate = (value) => (value && value !== 'null' && value !== 'undefined') ? new Date(value) : null;
    const cleanText = (value) => (value === undefined || value === null || value === 'null' || value === 'undefined') ? null : value;

    return prisma.$transaction(async (tx) => {
      const contract = await tx.employmentContract.create({
        data: {
          employment_id: parseInt(employmentId),
          contract_type: cleanText(contractFields.contract_type),
          contract_number: cleanText(contractFields.contract_number),
          start_date: cleanDate(contractFields.start_date),
          end_date: cleanDate(contractFields.end_date),
          renewal_count: toIntOrDefault(contractFields.renewal_count, 0),
          probation_start: cleanDate(contractFields.probation_start),
          probation_end: cleanDate(contractFields.probation_end),
          confirmation_status: cleanText(contractFields.confirmation_status),
          confirmation_date: cleanDate(contractFields.confirmation_date),
          is_renewed: toBoolean(contractFields.is_renewed)
          // Note: renewal_report is stored as an EmploymentDocument, not a field on EmploymentContract
        }
      });

      // If no uploaded renewal_report doc was provided but metadata exists, create the document now
      const hasUploadedRenewal = Array.isArray(documentRecords) && documentRecords.some(d => d.file_type === 'renewal_report');
      if (!hasUploadedRenewal) {
        await employmentService.buildRenewalDocFromMeta(tx, employment.id, contractFields);
      }

      // Document records (if any uploads) are created here
      if (documentRecords && documentRecords.length > 0) {
        for (const doc of documentRecords) {
          await tx.employmentDocument.create({
            data: {
              employment_id: employment.id,
              file_path: doc.file_path,
              file_type: doc.file_type,
              document_name: doc.document_name,
              file_size: doc.file_size,
              mime_type: doc.mime_type,
              associated_id: doc.associated_id
            }
          });
        }
      }

    return contract;
    });
  },

  // Update contract record
  updateContract: async (employmentId, contractData) => {
    const employment = await prisma.employment.findFirst({
      where: { 
        id: parseInt(employmentId),
        is_deleted: false
      }
    });
    if (!employment) throw new Error("Employment record not found");

    const { documentRecords = [], ...contractFields } = contractData;

    // Helpers to normalize incoming values (can be strings from the UI)
    const toBoolean = (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      return Boolean(value);
    };
    const toIntOrDefault = (value, def = 0) => {
      if (value === undefined || value === null || value === '') return def;
      const n = parseInt(value, 10);
      return Number.isNaN(n) ? def : n;
    };
    const cleanDate = (value) => (value && value !== 'null' && value !== 'undefined') ? new Date(value) : null;
    const cleanText = (value) => (value === undefined || value === null || value === 'null' || value === 'undefined') ? null : value;

    return prisma.$transaction(async (tx) => {
      const contract = await tx.employmentContract.update({
        where: { employment_id: parseInt(employmentId) },
        data: {
          contract_type: cleanText(contractFields.contract_type),
          contract_number: cleanText(contractFields.contract_number),
          start_date: cleanDate(contractFields.start_date),
          end_date: cleanDate(contractFields.end_date),
          renewal_count: toIntOrDefault(contractFields.renewal_count, 0),
          probation_start: cleanDate(contractFields.probation_start),
          probation_end: cleanDate(contractFields.probation_end),
          confirmation_status: cleanText(contractFields.confirmation_status),
          confirmation_date: cleanDate(contractFields.confirmation_date),
          is_renewed: toBoolean(contractFields.is_renewed)
          // Note: renewal_report is stored as an EmploymentDocument, not a field on EmploymentContract
        }
      });

      // If still no renewal_report document and only metadata is provided, create it now
      const hasUploadedRenewal = Array.isArray(documentRecords) && documentRecords.some(d => d.file_type === 'renewal_report');
      if (!hasUploadedRenewal) {
        // Check if one already exists to avoid duplicates
        const alreadyHasRenewal = await tx.employmentDocument.findFirst({
          where: { employment_id: employment.id, file_type: 'renewal_report', is_deleted: false }
        });
        if (!alreadyHasRenewal) {
          await employmentService.buildRenewalDocFromMeta(tx, employment.id, contractFields);
        }
      }

      // Document records (if any uploads) are created/updated here
      if (documentRecords && documentRecords.length > 0) {
        for (const doc of documentRecords) {
          const existingDoc = await tx.employmentDocument.findFirst({
            where: { employment_id: employment.id, file_type: doc.file_type, is_deleted: false }
          });
          if (existingDoc) {
            await tx.employmentDocument.update({
              where: { id: existingDoc.id },
              data: {
                file_path: doc.file_path,
                document_name: doc.document_name,
                file_size: doc.file_size,
                mime_type: doc.mime_type
              }
            });
          } else {
            await tx.employmentDocument.create({
              data: {
                employment_id: employment.id,
                file_path: doc.file_path,
                file_type: doc.file_type,
                document_name: doc.document_name,
                file_size: doc.file_size,
                mime_type: doc.mime_type,
                associated_id: doc.associated_id
              }
            });
          }
        }
      }

      return contract;
    });
  },

  // Delete contract record
  deleteContract: async (employmentId) => {
    const deletedContract = await prisma.employmentContract.update({
      where: { employment_id: parseInt(employmentId) },
      data: { is_deleted: true }
    });

    return {
      success: true,
      message: `Contract record for employment ${employmentId} soft deleted successfully`,
      deletedContract
    };
  },

  // Restore a soft-deleted contract record
  restoreContract: async (employmentId) => {
    const restoredContract = await prisma.employmentContract.update({
      where: { employment_id: parseInt(employmentId) },
      data: { is_deleted: false }
    });

    return {
      success: true,
      message: `Contract record for employment ${employmentId} restored successfully`,
      restoredContract
    };
  },

  // Get employment statistics
  getEmploymentStatistics: async () => {
    const [
      totalRecords,
      currentEmployees,
      byOrganization,
      byDepartment
    ] = await Promise.all([
      prisma.employment.count({ where: { is_deleted: false } }),
      prisma.employment.count({ where: { is_current: true, is_deleted: false } }),
      prisma.employment.groupBy({
        by: ['organization'],
        _count: { id: true },
        where: { is_deleted: false }
      }),
      prisma.employment.groupBy({
        by: ['department_id'],
        _count: { id: true },
        where: { 
          department_id: { not: null },
          is_deleted: false
        }
      })
    ]);

    return {
      total_records: totalRecords,
      current_employees: currentEmployees,
      by_organization: byOrganization.reduce((acc, item) => {
        acc[item.organization] = item._count.id;
        return acc;
      }, {}),
      by_department: byDepartment.reduce((acc, item) => {
        acc[item.department_id] = item._count.id;
        return acc;
      }, {})
    };
  }
};

module.exports = employmentService;