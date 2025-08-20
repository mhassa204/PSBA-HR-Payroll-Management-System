class RoleTagService {
  constructor() {
    this.apiBaseUrl = this.getApiBaseUrl();
  }

  getApiBaseUrl() {
    if (typeof process !== "undefined" && process.env) {
      return process.env.REACT_APP_API_BASE_URL || "http://localhost:3000/api";
    }
    return "http://localhost:3000/api";
  }

  async getAllRoleTags() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/role-tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching role tags:", error);
      throw new Error("Failed to fetch role tags");
    }
  }

  async getRoleTagById(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/role-tags/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.roleTag || result;
    } catch (error) {
      console.error("Error fetching role tag:", error);
      throw new Error("Failed to fetch role tag");
    }
  }

  async createRoleTag(data) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/role-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.roleTag || result;
    } catch (error) {
      console.error("Error creating role tag:", error);
      throw error;
    }
  }

  async updateRoleTag(id, data) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/role-tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.roleTag || result;
    } catch (error) {
      console.error("Error updating role tag:", error);
      throw error;
    }
  }

  async deleteRoleTag(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/role-tags/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error deleting role tag:", error);
      throw error;
    }
  }

  async getRoleTagStatistics() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/role-tags/statistics`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching role tag statistics:", error);
      throw new Error("Failed to fetch role tag statistics");
    }
  }
}

// Export singleton instance
export const roleTagService = new RoleTagService();

// Export class for testing
export { RoleTagService };

// Export default
export default roleTagService;
