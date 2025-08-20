class ScaleGradeService {
  constructor() {
    this.apiBaseUrl = this.getApiBaseUrl();
  }

  getApiBaseUrl() {
    if (typeof process !== "undefined" && process.env) {
      return process.env.REACT_APP_API_BASE_URL || "http://localhost:3000/api";
    }
    return "http://localhost:3000/api";
  }

  async getAllScaleGrades() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/scale-grades`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching scale grades:", error);
      throw new Error("Failed to fetch scale grades");
    }
  }

  async getScaleGradeById(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/scale-grades/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.scaleGrade || result;
    } catch (error) {
      console.error("Error fetching scale grade:", error);
      throw new Error("Failed to fetch scale grade");
    }
  }

  async createScaleGrade(data) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/scale-grades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.scaleGrade || result;
    } catch (error) {
      console.error("Error creating scale grade:", error);
      throw error;
    }
  }

  async updateScaleGrade(id, data) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/scale-grades/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.scaleGrade || result;
    } catch (error) {
      console.error("Error updating scale grade:", error);
      throw error;
    }
  }

  async deleteScaleGrade(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/scale-grades/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error deleting scale grade:", error);
      throw error;
    }
  }

  async getScaleGradeStatistics() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/scale-grades/statistics`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching scale grade statistics:", error);
      throw new Error("Failed to fetch scale grade statistics");
    }
  }
}

// Export singleton instance
export const scaleGradeService = new ScaleGradeService();

// Export class for testing
export { ScaleGradeService };

// Export default
export default scaleGradeService;
