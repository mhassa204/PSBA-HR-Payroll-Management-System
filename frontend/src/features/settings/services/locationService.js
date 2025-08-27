import axiosInstance from '../../../lib/axios';

class LocationService {
  async getAllLocations() {
    const { data } = await axiosInstance.get('/locations');
    return data;
  }

  async getLocationById(id) {
    const { data } = await axiosInstance.get(`/locations/${id}`);
    return data.location || data;
  }

  async createLocation(payload) {
    const { data } = await axiosInstance.post('/locations', payload);
    return data.location || data;
  }

  async updateLocation(id, payload) {
    const { data } = await axiosInstance.put(`/locations/${id}`, payload);
    return data.location || data;
  }

  async deleteLocation(id) {
    const { data } = await axiosInstance.delete(`/locations/${id}`);
    return data;
  }

  async getLocationStatistics() {
    const { data } = await axiosInstance.get('/locations/statistics');
    return data;
  }

  async getBazaars() {
    const { data } = await axiosInstance.get('/locations/bazaars');
    return data.bazaars || [];
  }
}

export const locationService = new LocationService();
export default locationService;
