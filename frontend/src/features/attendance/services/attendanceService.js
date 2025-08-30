import axiosInstance from '../../../lib/axios';

class AttendanceService {
  async listDevices() {
    const { data } = await axiosInstance.get('/attendance/devices');
    return data.devices || [];
  }
  async fetchForDevice(id) {
    const { data } = await axiosInstance.post(`/attendance/devices/${id}/fetch`);
    return data;
  }
  async fetchAll() {
    const { data } = await axiosInstance.post('/attendance/fetch-all');
    return data;
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
