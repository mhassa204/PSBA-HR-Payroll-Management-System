import axiosInstance from '../../../lib/axios';

class DepartmentService {
  async getAllDepartments() {
    const { data } = await axiosInstance.get('/departments');
    return data;
  }

  async getDepartmentById(id) {
    const { data } = await axiosInstance.get(`/departments/${id}`);
    return data.department || data;
  }

  async createDepartment(payload) {
    const { data } = await axiosInstance.post('/departments', payload);
    return data.department || data;
  }

  async updateDepartment(id, payload) {
    const { data } = await axiosInstance.put(`/departments/${id}`, payload);
    return data.department || data;
  }

  async deleteDepartment(id) {
    const { data } = await axiosInstance.delete(`/departments/${id}`);
    return data;
  }

  async getDepartmentStatistics() {
    const { data } = await axiosInstance.get('/departments/statistics');
    return data;
  }
}

export const departmentService = new DepartmentService();
