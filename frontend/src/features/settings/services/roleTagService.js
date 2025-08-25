import axiosInstance from '../../../lib/axios';

class RoleTagService {
  async getAllRoleTags() {
    const { data } = await axiosInstance.get('/role-tags');
    return data;
  }

  async getRoleTagById(id) {
    const { data } = await axiosInstance.get(`/role-tags/${id}`);
    return data.roleTag || data;
  }

  async createRoleTag(payload) {
    const { data } = await axiosInstance.post('/role-tags', payload);
    return data.roleTag || data;
  }

  async updateRoleTag(id, payload) {
    const { data } = await axiosInstance.put(`/role-tags/${id}`, payload);
    return data.roleTag || data;
  }

  async deleteRoleTag(id) {
    const { data } = await axiosInstance.delete(`/role-tags/${id}`);
    return data;
  }

  async getRoleTagStatistics() {
    const { data } = await axiosInstance.get('/role-tags/statistics');
    return data;
  }
}

// Export singleton instance
export const roleTagService = new RoleTagService();

// Export class for testing
export { RoleTagService };

// Export default
export default roleTagService;
