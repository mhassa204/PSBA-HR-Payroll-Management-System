class DepartmentService {
  constructor() {
    this.apiBaseUrl = this.getApiBaseUrl();
  }

  getApiBaseUrl() {
    if (typeof process !== "undefined" && process.env) {
      return process.env.REACT_APP_API_BASE_URL || "http://localhost:3000/api";
    }
    return "http://localhost:3000/api";
  }

  async getAllDepartments() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/departments`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching departments:", error);
      throw new Error("Failed to fetch departments");
    }
  }

  async getDepartmentById(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/departments/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.department || result;
    } catch (error) {
      console.error("Error fetching department:", error);
      throw new Error("Failed to fetch department");
    }
  }

  async createDepartment(data) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.department || result;
    } catch (error) {
      console.error("Error creating department:", error);
      throw error;
    }
  }

  async updateDepartment(id, data) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.department || result;
    } catch (error) {
      console.error("Error updating department:", error);
      throw error;
    }
  }

  async deleteDepartment(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/departments/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error deleting department:", error);
      throw error;
    }
  }

  async getDepartmentStatistics() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/departments/statistics`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching department statistics:", error);
      throw new Error("Failed to fetch department statistics");
    }
  }
}

export const departmentService = new DepartmentService();
