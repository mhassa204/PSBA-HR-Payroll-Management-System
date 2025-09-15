import axiosInstance from '../../../lib/axios';

class DistrictService {
  async getAllDistricts() {
    const { data } = await axiosInstance.get('/districts');
    return data.districts || data;
  }

  async getDistrictById(id) {
    const { data } = await axiosInstance.get(`/districts/${id}`);
    return data.district || data;
  }

  async createDistrict(payload) {
    const { data } = await axiosInstance.post('/districts', payload);
    return data.district || data;
  }

  async updateDistrict(id, payload) {
    const { data } = await axiosInstance.put(`/districts/${id}`, payload);
    return data.district || data;
  }

  async deleteDistrict(id) {
    const { data } = await axiosInstance.delete(`/districts/${id}`);
    return data;
  }
}

export const districtService = new DistrictService();
