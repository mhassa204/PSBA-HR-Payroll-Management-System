import axiosInstance from '../../../lib/axios';

class CityService {
  async getAllCities(params = {}) {
    const { data } = await axiosInstance.get('/cities', { params });
    return data.cities || data;
  }

  async getCityById(id) {
    const { data } = await axiosInstance.get(`/cities/${id}`);
    return data.city || data;
  }

  async createCity(payload) {
    const { data } = await axiosInstance.post('/cities', payload);
    return data.city || data;
  }

  async updateCity(id, payload) {
    const { data } = await axiosInstance.put(`/cities/${id}`, payload);
    return data.city || data;
  }

  async deleteCity(id) {
    const { data } = await axiosInstance.delete(`/cities/${id}`);
    return data;
  }
}

export const cityService = new CityService();
