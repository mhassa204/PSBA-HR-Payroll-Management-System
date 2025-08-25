import axiosInstance from '../../../lib/axios';

class ScaleGradeService {
  async getAllScaleGrades() {
    const { data } = await axiosInstance.get('/scale-grades');
    return data;
  }

  async getScaleGradeById(id) {
    const { data } = await axiosInstance.get(`/scale-grades/${id}`);
    return data.scaleGrade || data;
  }

  async createScaleGrade(payload) {
    const { data } = await axiosInstance.post('/scale-grades', payload);
    return data.scaleGrade || data;
  }

  async updateScaleGrade(id, payload) {
    const { data } = await axiosInstance.put(`/scale-grades/${id}`, payload);
    return data.scaleGrade || data;
  }

  async deleteScaleGrade(id) {
    const { data } = await axiosInstance.delete(`/scale-grades/${id}`);
    return data;
  }

  async getScaleGradeStatistics() {
    const { data } = await axiosInstance.get('/scale-grades/statistics');
    return data;
  }
}

export const scaleGradeService = new ScaleGradeService();
export { ScaleGradeService };
export default scaleGradeService;
