import axiosInstance from '../../../lib/axios';

class DesignationService {
  async getAllDesignations(departmentId = null) {
    const params = departmentId ? { department_id: departmentId } : undefined;
    const { data } = await axiosInstance.get('/designations', { params });
    return data;
  }

  async getDesignationById(id) {
    const { data } = await axiosInstance.get(`/designations/${id}`);
    return data.designation || data;
  }

  async getDesignationsByDepartment(departmentId) {
    const { data } = await axiosInstance.get(`/designations/department/${departmentId}`);
    return data;
  }

  async createDesignation(payload) {
    const { data } = await axiosInstance.post('/designations', payload);
    return data.designation || data;
  }

  async updateDesignation(id, payload) {
    const { data } = await axiosInstance.put(`/designations/${id}`, payload);
    return data.designation || data;
  }

  async deleteDesignation(id) {
    const { data } = await axiosInstance.delete(`/designations/${id}`);
    return data;
  }

  async getDesignationStatistics() {
    const { data } = await axiosInstance.get('/designations/statistics');
    return data;
  }
}

export const designationService = new DesignationService();
