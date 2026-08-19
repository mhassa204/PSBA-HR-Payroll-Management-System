import axios from "../../../lib/axios";

const regionalInchargeService = {
  list: (params = {}) => axios.get("/regional-incharges", { params }).then((r) => r.data),
  get: (id) => axios.get(`/regional-incharges/${id}`).then((r) => r.data),
  create: (payload) => axios.post("/regional-incharges", payload).then((r) => r.data),
  update: (id, payload) => axios.put(`/regional-incharges/${id}`, payload).then((r) => r.data),
  remove: (id) => axios.delete(`/regional-incharges/${id}`).then((r) => r.data),
  // Every bazaar with its current incharge — drives both assignment directions
  bazaars: () => axios.get("/regional-incharges/helpers/bazaars").then((r) => r.data),
  // Replace one incharge's whole bazaar list
  setBazaars: (id, location_ids) =>
    axios.put(`/regional-incharges/${id}/bazaars`, { location_ids }).then((r) => r.data),
  // Set/clear the incharge on a single bazaar (null clears)
  setBazaarIncharge: (locationId, regional_incharge_id) =>
    axios
      .patch(`/regional-incharges/bazaar/${locationId}`, { regional_incharge_id })
      .then((r) => r.data),
};

export default regionalInchargeService;
