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
  // New: list employees with device user ids
  async listEmployees(search = '') {
    const { data } = await axiosInstance.get('/attendance/employees', { params: search ? { search } : {} });
    return data.employees || [];
  }
  // New: set or clear device user id for an employee
  async setEmployeeDeviceUserId(employeeId, deviceUserId) {
    const { data } = await axiosInstance.put(`/attendance/employees/${employeeId}/device-user`, { deviceUserId });
    return data.employee;
  }
  // New: list locations for attendance overview
  async listLocations() {
    const { data } = await axiosInstance.get('/locations');
    return data.locations || [];
  }
  async getLocationLSR(locationId, month) {
    const { data } = await axiosInstance.get(`/attendance/locations/${locationId}/lsr`, { params: month? { month } : {} });
    return data;
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
