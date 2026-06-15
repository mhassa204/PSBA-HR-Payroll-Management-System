import axios from '../../../lib/axios';

const API_BASE_URL = '/roles';

export const roleService = {
  async getAllRoles() {
    try {
      console.log('Fetching roles from:', API_BASE_URL);
      const response = await axios.get(API_BASE_URL);
      console.log('Roles response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch roles');
    }
  },

  async getRoleById(id) {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch role');
    }
  },

  async createRole(roleData) {
    try {
      // roleData.allowed_actions should be canonical permission keys
      const response = await axios.post(API_BASE_URL, roleData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create role');
    }
  },

  async updateRole(id, roleData) {
    try {
      const response = await axios.put(`${API_BASE_URL}/${id}`, roleData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update role');
    }
  },

  async deleteRole(id) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete role');
    }
  }
};

export const permissionsService = {
  async listAll() {
    const res = await axios.get('/permissions');
    return res.data.permissions || res.data;
  },
  async upsertMany(keys) {
    const res = await axios.post('/permissions/upsert-many', { keys });
    return res.data.permissions || res.data;
  }
};
