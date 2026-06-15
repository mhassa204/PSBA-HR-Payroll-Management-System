import axiosInstance from '../../../lib/axios';

class DeviceService {
  async list() {
    const { data } = await axiosInstance.get('/devices');
    return data.devices || [];
  }
  async get(id) {
    const { data } = await axiosInstance.get(`/devices/${id}`);
    return data.device || data;
  }
  async create(payload) {
    const { data } = await axiosInstance.post('/devices', payload);
    return data.device || data;
  }
  async update(id, payload) {
    const { data } = await axiosInstance.put(`/devices/${id}`, payload);
    return data.device || data;
  }
  async remove(id) {
    const { data } = await axiosInstance.delete(`/devices/${id}`);
    return data;
  }
}

export const deviceService = new DeviceService();
export default deviceService;
