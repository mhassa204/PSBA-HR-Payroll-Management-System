import axios from "../../../lib/axios";

export const searchEmployees = (params) =>
  axios.get("/employees", { params }).then((r) => r.data);

export const getEmployee = (employeeId) =>
  axios.get(`/employees/${employeeId}`).then((r) => r.data);

export const getEmployments = (employeeId) =>
  axios.get(`/employment/employee/${employeeId}`).then((r) => r.data);

export const getTransfers = (employmentId) =>
  axios.get(`/employment/${employmentId}/transfers`).then((r) => r.data);

export const createTransfer = (employmentId, payload) =>
  axios.post(`/employment/${employmentId}/transfer`, payload).then((r) => r.data);

// Roles that can act on transfers hold locations.read; suppress the toast for
// read-only viewers so the page degrades quietly.
export const getLocations = () =>
  axios.get("/locations", { suppress403Toast: true }).then((r) => r.data);

export const getFormOptions = () =>
  axios
    .get("/employment/form-options", { suppress403Toast: true })
    .then((r) => r.data);
