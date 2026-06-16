/**
 * Utility functions for validating soft delete operations
 * Checks if parent records have active (non-deleted) child records
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check if a parent record has active child records
 * @param {string} parentModel - The parent model name (e.g., 'District')
 * @param {number} parentId - The parent record ID
 * @param {Array} childChecks - Array of child check configurations
 * @returns {Promise<{hasActiveChildren: boolean, message: string, children: Array}>}
 */
async function checkActiveChildren(parentModel, parentId, childChecks) {
  const results = [];
  let hasActiveChildren = false;
  let message = '';

  for (const check of childChecks) {
    const { model, foreignKey, label, optional = false, hasIsDeleted = true } = check;
    
    // Build where clause - check if model has is_deleted field
    const whereClause = {
      [foreignKey]: parentId,
    };
    
    // Only add is_deleted check if the model has this field
    if (hasIsDeleted) {
      whereClause.is_deleted = false;
    }
    
    // Count active (non-deleted) child records
    // Prisma client uses camelCase for model names
    // Try camelCase first, fallback to PascalCase if needed
    let count = 0;
    try {
      count = await prisma[model].count({
        where: whereClause,
      });
    } catch (error) {
      // If camelCase fails, try PascalCase (first letter uppercase)
      const pascalModel = model.charAt(0).toUpperCase() + model.slice(1);
      try {
        count = await prisma[pascalModel].count({
          where: whereClause,
        });
      } catch (err) {
        console.error(`Error counting ${model} records for ${parentModel} (ID: ${parentId}):`, err.message);
        // Don't throw - just log and continue, treating as 0 count
        count = 0;
      }
    }

    if (count > 0) {
      // Only block deletion if the child is not optional
      if (!optional) {
        hasActiveChildren = true;
      }
      results.push({
        model,
        label,
        count,
        optional,
      });
    }
  }

  if (hasActiveChildren) {
    // Only show non-optional children in error message (they're the ones blocking deletion)
    const childList = results
      .filter(r => !r.optional && r.count > 0) // Only non-optional children block deletion
      .map(r => `${r.count} ${r.label}${r.count > 1 ? 's' : ''}`)
      .join(', ');
    message = `Cannot delete ${parentModel.toLowerCase()}. It has active ${childList}. Please delete or soft-delete all associated records first.`;
  }

  return {
    hasActiveChildren,
    message,
    children: results,
  };
}

/**
 * Predefined child checks for each parent model
 */
const CHILD_CHECKS = {
  District: [
    { model: 'city', foreignKey: 'district_id', label: 'city' },
    { model: 'employee', foreignKey: 'district_id', label: 'employee', optional: true },
    { model: 'location', foreignKey: 'district_id', label: 'location', optional: true },
  ],
  City: [
    { model: 'employee', foreignKey: 'city_id', label: 'employee', optional: true },
    { model: 'location', foreignKey: 'city_id', label: 'location', optional: true },
  ],
  Department: [
    { model: 'designation', foreignKey: 'department_id', label: 'designation' },
    { model: 'employment', foreignKey: 'department_id', label: 'employment record', optional: true },
    { model: 'user', foreignKey: 'department_id', label: 'user', optional: true },
    { model: 'travelClaim', foreignKey: 'created_by_department_id', label: 'travel claim', optional: true },
  ],
  Designation: [
    { model: 'employment', foreignKey: 'designation_id', label: 'employment record', optional: true },
  ],
  Employee: [
    { model: 'employment', foreignKey: 'employee_id', label: 'employment record' },
    { model: 'user', foreignKey: 'employee_id', label: 'user', optional: true },
    { model: 'leave', foreignKey: 'employee_id', label: 'leave record', optional: true },
    { model: 'travelRequest', foreignKey: 'applicant_id', label: 'travel request', optional: true },
    { model: 'travelClaim', foreignKey: 'employee_id', label: 'travel claim', optional: true },
    { model: 'payroll', foreignKey: 'employee_id', label: 'payroll record', optional: true },
    { model: 'leaveBankAllocation', foreignKey: 'employee_id', label: 'leave bank allocation', optional: true, hasIsDeleted: false },
  ],
  Role: [
    { model: 'user', foreignKey: 'role_id', label: 'user' },
  ],
  RoleTag: [
    { model: 'employment', foreignKey: 'role_tag_id', label: 'employment record', optional: true },
  ],
  ScaleGrade: [
    { model: 'employment', foreignKey: 'scale_grade_id', label: 'employment record', optional: true },
    { model: 'travelRate', foreignKey: 'scale_grade_id', label: 'travel rate', optional: true, hasIsDeleted: false },
  ],
  EducationLevel: [
    { model: 'educationQualification', foreignKey: 'education_level_id', label: 'education qualification', optional: true },
  ],
  LeaveType: [
    { model: 'leaveBankDefault', foreignKey: 'leave_type_id', label: 'leave bank default', hasIsDeleted: false },
    { model: 'leaveBankAllocation', foreignKey: 'leave_type_id', label: 'leave bank allocation', hasIsDeleted: false },
  ],
  LeaveBank: [
    { model: 'leaveBankDefault', foreignKey: 'leave_bank_id', label: 'leave bank default', hasIsDeleted: false },
    { model: 'leaveBankAllocation', foreignKey: 'leave_bank_id', label: 'leave bank allocation', hasIsDeleted: false },
  ],
  TravelRequest: [
    { model: 'travelClaim', foreignKey: 'travel_request_id', label: 'travel claim', optional: true },
    { model: 'travelRequestEmployee', foreignKey: 'request_id', label: 'travel request attendee', hasIsDeleted: false },
  ],
  Location: [
    { model: 'employment', foreignKey: 'location_id', label: 'employment record', optional: true },
    { model: 'device', foreignKey: 'location_id', label: 'device', optional: true },
    { model: 'user', foreignKey: 'location_id', label: 'user', optional: true },
    { model: 'dutyRoster', foreignKey: 'bazaar_id', label: 'duty roster', optional: true },
    { model: 'travelClaim', foreignKey: 'created_by_location_id', label: 'travel claim', optional: true },
  ],
  DutyRoster: [
    { model: 'dutyRosterEntry', foreignKey: 'roster_id', label: 'duty roster entry', hasIsDeleted: false },
  ],
};

/**
 * Validate if a parent record can be soft-deleted
 * @param {string} parentModel - The parent model name
 * @param {number} parentId - The parent record ID
 * @returns {Promise<{canDelete: boolean, message: string, children: Array}>}
 */
async function validateSoftDelete(parentModel, parentId) {
  const childChecks = CHILD_CHECKS[parentModel];
  
  if (!childChecks || childChecks.length === 0) {
    // No child checks defined, allow deletion
    return {
      canDelete: true,
      message: '',
      children: [],
    };
  }

  const result = await checkActiveChildren(parentModel, parentId, childChecks);
  
  return {
    canDelete: !result.hasActiveChildren,
    message: result.message,
    children: result.children,
  };
}

module.exports = {
  validateSoftDelete,
  checkActiveChildren,
  CHILD_CHECKS,
};

