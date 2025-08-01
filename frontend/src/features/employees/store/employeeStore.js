import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { employeeService } from "../services/employeeService";
import auditService from "../../../services/auditService";

/**
 * Employee Store - Using real API calls
 */

const useEmployeeStore = create(
  devtools((set, get) => ({
    // State
    employees: [],
    currentEmployee: null,
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },

    // Clear error state
    clearError: () => set({ error: null }),

    // Set loading state
    setLoading: (loading) => set({ loading }),

    // Fetch employees with pagination and search
    fetchEmployees: async (pageOrParams = 1, limit = 10, searchTerm = "") => {
      set({ loading: true, error: null });

      try {
        // Handle both object params and individual parameters
        let page, actualLimit, actualSearchTerm;

        if (typeof pageOrParams === "object") {
          // Called with params object: fetchEmployees({page: 1, pageSize: 10, search: 'term'})
          page = pageOrParams.page || 1;
          actualLimit = pageOrParams.pageSize || 10;
          actualSearchTerm = pageOrParams.search || "";
        } else {
          // Called with individual parameters: fetchEmployees(1, 10, 'term')
          page = pageOrParams;
          actualLimit = limit;
          actualSearchTerm = searchTerm;
        }

        const result = await employeeService.getAllEmployees(page, actualLimit, actualSearchTerm);

        set({
          employees: result.data,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
          loading: false,
        });

        return result;
      } catch (error) {
        set({
          error: error.message || "Failed to fetch employees",
          loading: false,
        });
        throw error;
      }
    },

    // Get single employee by ID
    getEmployee: async (id) => {
      set({ loading: true, error: null });

      try {
        const employee = await employeeService.getEmployeeById(id);
        if (!employee) {
          throw new Error("Employee not found");
        }

        console.log("🔍 EmployeeStore: Getting employee by ID:", id);
        console.log("📋 EmployeeStore: Found employee:", employee);

        set({
          currentEmployee: employee,
          loading: false,
        });

        return employee;
      } catch (error) {
        set({
          error: error.message || "Failed to fetch employee",
          loading: false,
        });
        throw error;
      }
    },

    // Create new employee
    createEmployee: async (employeeData) => {
      set({ loading: true, error: null });

      try {
        // Validate required fields
        if (!employeeData.full_name?.trim()) {
          throw new Error("Full name is required");
        }

        const newEmployee = await employeeService.createEmployee(employeeData);

        // Log audit trail
        auditService.logEmployeeCreated(newEmployee, {
          metadata: {
            creation_method: 'manual_form',
            has_past_experience: employeeData.past_experiences?.length > 0,
            experience_count: employeeData.past_experiences?.length || 0
          }
        });

        // Update the employees list
        const currentState = get();
        set({
          employees: [newEmployee, ...currentState.employees],
          loading: false,
        });

        return newEmployee;
      } catch (error) {
        set({
          error: error.message || "Failed to create employee",
          loading: false,
        });
        throw error;
      }
    },

    // Update employee
    updateEmployee: async (id, updateData) => {
      set({ loading: true, error: null });

      try {
        // Get old values for audit logging
        const oldEmployee = await employeeService.getEmployeeById(id);
        if (!oldEmployee) {
          throw new Error("Employee not found");
        }

        const updatedEmployee = await employeeService.updateEmployee(id, updateData);
        if (!updatedEmployee) {
          throw new Error("Failed to update employee");
        }

        // Log audit trail
        auditService.logEmployeeUpdated(id, oldEmployee, updatedEmployee, {
          metadata: {
            update_method: 'manual_form',
            fields_updated: Object.keys(updateData)
          }
        });

        // Update the employees list
        const currentState = get();
        const updatedEmployees = currentState.employees.map((emp) =>
          emp.id === parseInt(id) ? updatedEmployee : emp
        );

        set({
          employees: updatedEmployees,
          currentEmployee: updatedEmployee,
          loading: false,
        });

        return updatedEmployee;
      } catch (error) {
        set({
          error: error.message || "Failed to update employee",
          loading: false,
        });
        throw error;
      }
    },

    // Delete employee
    deleteEmployee: async (id) => {
      set({ loading: true, error: null });

      try {
        // Get employee data before deletion for audit logging
        const employeeToDelete = await employeeService.getEmployeeById(id);
        if (!employeeToDelete) {
          throw new Error("Employee not found");
        }

        const success = await employeeService.deleteEmployee(id);
        if (!success) {
          throw new Error("Failed to delete employee");
        }

        // Log audit trail
        auditService.logEmployeeDeleted(employeeToDelete, {
          metadata: {
            deletion_method: 'manual_action',
            had_employment_records: employeeToDelete.employmentRecords?.length > 0
          }
        });

        // Update the employees list
        const currentState = get();
        const filteredEmployees = currentState.employees.filter(
          (emp) => emp.id !== parseInt(id)
        );

        set({
          employees: filteredEmployees,
          loading: false,
        });

        return deletedUser;
      } catch (error) {
        set({
          error: error.message || "Failed to delete employee",
          loading: false,
        });
        throw error;
      }
    },

    // Employment Record Methods
    addEmploymentRecord: async (recordData) => {
      set({ loading: true, error: null });

      try {
        await simulateApiDelay();

        // Validate required fields
        if (!recordData.organization?.trim()) {
          throw new Error("Organization is required");
        }
        if (!recordData.designation?.trim()) {
          throw new Error("Designation is required");
        }
        if (!recordData.effective_from) {
          throw new Error("Effective from date is required");
        }
        if (!recordData.role_tag?.trim()) {
          throw new Error("Role tag is required");
        }

        const newRecord = createEmploymentRecord(recordData);

        // Log audit trail
        auditService.logEmploymentRecordCreated(newRecord, {
          metadata: {
            creation_method: 'tabbed_form',
            organization: recordData.organization,
            designation: recordData.designation
          }
        });

        set({ loading: false });
        return newRecord;
      } catch (error) {
        set({
          error: error.message || "Failed to add employment record",
          loading: false,
        });
        throw error;
      }
    },

    // Get employment history for an employee
    getEmploymentHistory: async (employeeId) => {
      set({ loading: true, error: null });

      try {
        await simulateApiDelay();

        const history = getEmploymentByUserId(employeeId);

        set({ loading: false });
        return history;
      } catch (error) {
        set({
          error: error.message || "Failed to fetch employment history",
          loading: false,
        });
        throw error;
      }
    },

    // Update employment record
    updateEmploymentRecord: async (recordId, updateData) => {
      set({ loading: true, error: null });

      try {
        await simulateApiDelay();

        // Get old record for audit logging
        const oldRecord = getEmploymentByUserId(recordId); // This might need adjustment based on actual data structure

        const updatedRecord = updateEmploymentRecord(recordId, updateData);
        if (!updatedRecord) {
          throw new Error("Employment record not found");
        }

        // Log audit trail
        auditService.logEmploymentRecordUpdated(recordId, oldRecord, updatedRecord, {
          metadata: {
            update_method: 'tabbed_form',
            fields_updated: Object.keys(updateData)
          }
        });

        set({ loading: false });
        return updatedRecord;
      } catch (error) {
        set({
          error: error.message || "Failed to update employment record",
          loading: false,
        });
        throw error;
      }
    },

    // Delete employment record
    deleteEmploymentRecord: async (recordId) => {
      set({ loading: true, error: null });

      try {
        await simulateApiDelay();

        // Get record data before deletion for audit logging
        const recordToDelete = getEmploymentByUserId(recordId); // This might need adjustment

        const deletedRecord = deleteEmploymentRecord(recordId);
        if (!deletedRecord) {
          throw new Error("Employment record not found");
        }

        // Log audit trail
        auditService.logEmploymentRecordDeleted(recordToDelete || deletedRecord, {
          metadata: {
            deletion_method: 'manual_action'
          }
        });

        set({ loading: false });
        return deletedRecord;
      } catch (error) {
        set({
          error: error.message || "Failed to delete employment record",
          loading: false,
        });
        throw error;
      }
    },

    // Search employees
    searchEmployees: async (searchTerm) => {
      set({ loading: true, error: null });

      try {
        const results = await employeeService.searchEmployees(searchTerm);

        set({
          employees: results,
          loading: false,
        });

        return results;
      } catch (error) {
        set({
          error: error.message || "Failed to search employees",
          loading: false,
        });
        throw error;
      }
    },

    // Additional methods for compatibility with existing components
    preloadEmployees: async (queryParams = {}) => {
      // For dummy data, we don't need preloading, but keep for compatibility
      return Promise.resolve();
    },

    clearCache: () => {
      // For dummy data, we don't have cache, but keep for compatibility
      set({ employees: [], currentEmployee: null });
    },

    // Fetch employee (alias for getEmployee for compatibility)
    fetchEmployee: async (id) => {
      return get().getEmployee(id);
    },
  }))
);

export { useEmployeeStore };
