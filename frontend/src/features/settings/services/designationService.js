class DesignationService {
  constructor() {
    this.apiBaseUrl = this.getApiBaseUrl();
  }

  getApiBaseUrl() {
    if (typeof process !== "undefined" && process.env) {
      return process.env.REACT_APP_API_BASE_URL || "http://localhost:3000/api";
    }
    return "http://localhost:3000/api";
  }

  async getAllDesignations(departmentId = null) {
    try {
      let url = `${this.apiBaseUrl}/designations`;
      if (departmentId) {
        url += `?department_id=${departmentId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching designations:", error);
      throw new Error("Failed to fetch designations");
    }
  }

  async getDesignationById(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/designations/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.designation || result;
    } catch (error) {
      console.error("Error fetching designation:", error);
      throw new Error("Failed to fetch designation");
    }
  }

  async getDesignationsByDepartment(departmentId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/designations/department/${departmentId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching designations by department:", error);
      throw new Error("Failed to fetch designations by department");
    }
  }

  async createDesignation(data) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/designations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.designation || result;
    } catch (error) {
      console.error("Error creating designation:", error);
      throw error;
    }
  }

  async updateDesignation(id, data) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/designations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.designation || result;
    } catch (error) {
      console.error("Error updating designation:", error);
      throw error;
    }
  }

  async deleteDesignation(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/designations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error deleting designation:", error);
      throw error;
    }
  }

  async getDesignationStatistics() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/designations/statistics`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching designation statistics:", error);
      throw new Error("Failed to fetch designation statistics");
    }
  }
}

export const designationService = new DesignationService();
