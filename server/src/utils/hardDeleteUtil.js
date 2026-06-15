const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Utility for hard deleting records and their dependent children
 * This should only be used for irreversible cleanup tasks
 */
class HardDeleteUtil {
  /**
   * Hard delete an employee and all related records
   * @param {number} employeeId - The ID of the employee to delete
   * @returns {Promise<Object>} - Result of the deletion operation
   */
  static async hardDeleteEmployee(employeeId) {
    return await prisma.$transaction(async (tx) => {
      // Delete all related records in reverse dependency order

      // 0. Delete duty roster entries referencing this employee (prevents FK violations)
      await tx.dutyRosterEntry.deleteMany({
        where: { employee_id: employeeId }
      });
      
      // 1. Delete employment documents
      await tx.employmentDocument.deleteMany({
        where: {
          employment: {
            employee_id: employeeId
          }
        }
      });

      // 2. Delete employment contracts
      await tx.employmentContract.deleteMany({
        where: {
          employment: {
            employee_id: employeeId
          }
        }
      });

      // 3. Delete employment salaries
      await tx.employmentSalary.deleteMany({
        where: {
          employment: {
            employee_id: employeeId
          }
        }
      });

      // 4. Delete employment records
      await tx.employment.deleteMany({
        where: { employee_id: employeeId }
      });

      // 5. Delete employee documents
      await tx.employeeDocument.deleteMany({
        where: { employee_id: employeeId }
      });

      // 6. Delete education qualifications
      await tx.educationQualification.deleteMany({
        where: { employee_id: employeeId }
      });

      // 7. Delete past experiences
      await tx.pastExperience.deleteMany({
        where: { employee_id: employeeId }
      });

      // 8. Finally delete the employee
      const deletedEmployee = await tx.employee.delete({
        where: { id: employeeId }
      });

      return {
        success: true,
        message: `Employee ${deletedEmployee.full_name} and all related records permanently deleted`,
        deletedEmployee
      };
    });
  }

  /**
   * Hard delete an employment record and all related records
   * @param {number} employmentId - The ID of the employment record to delete
   * @returns {Promise<Object>} - Result of the deletion operation
   */
  static async hardDeleteEmployment(employmentId) {
    return await prisma.$transaction(async (tx) => {
      // Delete all related records in reverse dependency order
      
      // 1. Delete employment documents
      await tx.employmentDocument.deleteMany({
        where: { employment_id: employmentId }
      });

      // 2. Delete employment contract
      await tx.employmentContract.deleteMany({
        where: { employment_id: employmentId }
      });

      // 3. Delete employment salary
      await tx.employmentSalary.deleteMany({
        where: { employment_id: employmentId }
      });

      // 4. Finally delete the employment record
      const deletedEmployment = await tx.employment.delete({
        where: { id: employmentId }
      });

      return {
        success: true,
        message: `Employment record ${deletedEmployment.id} and all related records permanently deleted`,
        deletedEmployment
      };
    });
  }

  /**
   * Hard delete a department and all related records
   * @param {number} departmentId - The ID of the department to delete
   * @returns {Promise<Object>} - Result of the deletion operation
   */
  static async hardDeleteDepartment(departmentId) {
    return await prisma.$transaction(async (tx) => {
      // Delete all related records in reverse dependency order
      
      // 1. Delete designations in this department
      await tx.designation.deleteMany({
        where: { department_id: departmentId }
      });

      // 2. Delete employment records in this department
      await tx.employment.deleteMany({
        where: { department_id: departmentId }
      });

      // 3. Finally delete the department
      const deletedDepartment = await tx.department.delete({
        where: { id: departmentId }
      });

      return {
        success: true,
        message: `Department ${deletedDepartment.name} and all related records permanently deleted`,
        deletedDepartment
      };
    });
  }

  /**
   * Hard delete a designation and all related records
   * @param {number} designationId - The ID of the designation to delete
   * @returns {Promise<Object>} - Result of the deletion operation
   */
  static async hardDeleteDesignation(designationId) {
    return await prisma.$transaction(async (tx) => {
      // Delete all related records in reverse dependency order
      
      // 1. Delete employment records with this designation
      await tx.employment.deleteMany({
        where: { designation_id: designationId }
      });

      // 2. Finally delete the designation
      const deletedDesignation = await tx.designation.delete({
        where: { id: designationId }
      });

      return {
        success: true,
        message: `Designation ${deletedDesignation.title} and all related records permanently deleted`,
        deletedDesignation
      };
    });
  }

  /**
   * Generic hard delete function for any model
   * @param {string} modelName - The Prisma model name (e.g., 'employee', 'employment')
   * @param {number} recordId - The ID of the record to delete
   * @returns {Promise<Object>} - Result of the deletion operation
   */
  static async hardDeleteRecord(modelName, recordId) {
    try {
      const result = await prisma[modelName].delete({
        where: { id: recordId }
      });

      return {
        success: true,
        message: `${modelName} record ${recordId} permanently deleted`,
        deletedRecord: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to hard delete ${modelName} record ${recordId}: ${error.message}`,
        error
      };
    }
  }

  /**
   * Clean up all soft-deleted records older than specified days
   * @param {number} daysOld - Number of days old to consider for cleanup
   * @returns {Promise<Object>} - Result of the cleanup operation
   */
  static async cleanupSoftDeletedRecords(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      const results = await prisma.$transaction(async (tx) => {
        const cleanupResults = {};

        // Clean up soft-deleted employment documents
        const deletedEmploymentDocs = await tx.employmentDocument.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.employmentDocuments = deletedEmploymentDocs.count;

        // Clean up soft-deleted employment contracts
        const deletedContracts = await tx.employmentContract.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.employmentContracts = deletedContracts.count;

        // Clean up soft-deleted employment salaries
        const deletedSalaries = await tx.employmentSalary.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.employmentSalaries = deletedSalaries.count;

        // Clean up soft-deleted employments
        const deletedEmployments = await tx.employment.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.employments = deletedEmployments.count;

        // Clean up soft-deleted employee documents
        const deletedEmployeeDocs = await tx.employeeDocument.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.employeeDocuments = deletedEmployeeDocs.count;

        // Clean up soft-deleted education qualifications
        const deletedEducations = await tx.educationQualification.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.educationQualifications = deletedEducations.count;

        // Clean up soft-deleted past experiences
        const deletedExperiences = await tx.pastExperience.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.pastExperiences = deletedExperiences.count;

        // Clean up soft-deleted designations
        const deletedDesignations = await tx.designation.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.designations = deletedDesignations.count;

        // Clean up soft-deleted departments
        const deletedDepartments = await tx.department.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.departments = deletedDepartments.count;

        // Clean up soft-deleted employees
        const deletedEmployees = await tx.employee.deleteMany({
          where: {
            is_deleted: true,
            updatedAt: { lt: cutoffDate }
          }
        });
        cleanupResults.employees = deletedEmployees.count;

        return cleanupResults;
      });

      const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

      return {
        success: true,
        message: `Cleanup completed. Permanently deleted ${totalDeleted} soft-deleted records older than ${daysOld} days.`,
        results
      };
    } catch (error) {
      return {
        success: false,
        message: `Cleanup failed: ${error.message}`,
        error
      };
    }
  }
}

module.exports = HardDeleteUtil;
