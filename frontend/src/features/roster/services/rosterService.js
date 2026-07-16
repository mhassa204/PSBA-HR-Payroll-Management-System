import axios from "../../../lib/axios";

const rosterService = {
  list: (params = {}) => axios.get("/rosters", { params }).then((r) => r.data),
  get: (id) => axios.get(`/rosters/${id}`).then((r) => r.data),
  // Scope, eligible employees, cycle defaults, approver preview, last roster
  context: () => axios.get("/rosters/helpers/context").then((r) => r.data),
  create: (payload) => axios.post("/rosters", payload).then((r) => r.data),
  update: (id, payload) => axios.put(`/rosters/${id}`, payload).then((r) => r.data),
  remove: (id) => axios.delete(`/rosters/${id}`).then((r) => r.data),
  pendingApprovals: () => axios.get("/rosters/pending-approvals").then((r) => r.data),
  approve: (id) => axios.post(`/rosters/${id}/approve`).then((r) => r.data),
  reject: (id, reason) => axios.post(`/rosters/${id}/reject`, { reason }).then((r) => r.data),
};

export default rosterService;
