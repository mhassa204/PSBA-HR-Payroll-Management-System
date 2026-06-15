import axios from "../../../lib/axios";

const rosterService = {
  list: (params = {}) => axios.get("/rosters", { params }).then(r => r.data),
  get: (id) => axios.get(`/rosters/${id}`).then(r => r.data),
  create: (payload) => axios.post("/rosters", payload).then(r => r.data),
  update: (id, payload) => axios.put(`/rosters/${id}`, payload).then(r => r.data),
  remove: (id) => axios.delete(`/rosters/${id}`).then(r => r.data),
  officerEmployees: () => axios.get('/rosters/helpers/officer-employees/list').then(r => r.data),
  approve: (id) => axios.post(`/rosters/${id}/approve`).then(r => r.data),
  reject: (id) => axios.post(`/rosters/${id}/reject`).then(r => r.data),
  setStatus: (id, status) => axios.put(`/rosters/${id}/status`, { status }).then(r => r.data),
};

export default rosterService;
