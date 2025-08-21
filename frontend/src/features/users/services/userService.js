import axios from '../../../lib/axios';

const API_BASE_URL = '/users';

export const userService = {
  async getAllUsers() {
    try {
      const response = await axios.get(API_BASE_URL);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch users');
    }
  },

  async getUserById(id) {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch user');
    }
  },

  async createUser(userData) {
    try {
      const response = await axios.post(API_BASE_URL, userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create user');
    }
  },

  async updateUser(id, userData) {
    try {
      const response = await axios.put(`${API_BASE_URL}/${id}`, userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update user');
    }
  },

  async deleteUser(id) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete user');
    }
  },

  async getAvailableEmployees() {
    try {
      console.log('Fetching available employees from:', `${API_BASE_URL}/available/employees`);
      const response = await axios.get(`${API_BASE_URL}/available/employees`);
      console.log('Available employees response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching available employees:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch available employees');
    }
  }
};
