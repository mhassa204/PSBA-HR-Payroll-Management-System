import axiosInstance from '../../../lib/axios';

class EducationLevelService {
  async getAllLevels() {
    const { data } = await axiosInstance.get('/education-levels');
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.educationLevels)) return data.educationLevels;
    if (Array.isArray(data.levels)) return data.levels;
    return [];
  }

  async getLevelById(id) {
    const { data } = await axiosInstance.get(`/education-levels/${id}`);
    return data.educationLevel || data.level || data;
  }

  async createLevel(payload) {
    const { data } = await axiosInstance.post('/education-levels', payload);
    return data.educationLevel || data.level || data;
  }

  async updateLevel(id, payload) {
    const { data } = await axiosInstance.put(`/education-levels/${id}`, payload);
    return data.educationLevel || data.level || data;
  }

  async deleteLevel(id) {
    const { data } = await axiosInstance.delete(`/education-levels/${id}`);
    return data;
  }
}

export const educationLevelService = new EducationLevelService();
