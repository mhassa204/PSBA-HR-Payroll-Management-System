import api from "../lib/axios";

// Travel Requests
export const getTravelRequests = () => api.get("/travel/requests").then(r => r.data.requests);
export const getTravelRequest = (id) => api.get(`/travel/requests/${id}`).then(r => r.data.request);
export const createTravelRequest = (payload) => api.post("/travel/requests", payload).then(r => r.data.request);
export const updateTravelRequest = (id, payload) => api.put(`/travel/requests/${id}`, payload).then(r => r.data.request);
export const submitTravelRequest = (id) => api.post(`/travel/requests/${id}/submit`).then(r => r.data.request);
export const uploadRequestDocuments = async (id, files) => {
  const fd = new FormData();
  [...files].forEach(f => fd.append('files', f));
  const r = await api.post(`/travel/requests/${id}/documents`, fd);
  return r.data.documents;
};
export const listRequestDocuments = (id) => api.get(`/travel/requests/${id}/documents`).then(r => r.data.documents);
export const deleteRequestDocument = (id, docId) => api.delete(`/travel/requests/${id}/documents/${docId}`).then(r => r.data);

// Travel Claims
export const getTravelClaims = () => api.get("/travel/claims").then(r => r.data.claims);
export const getTravelClaim = (id) => api.get(`/travel/claims/${id}`).then(r => r.data.claim);
export const createTravelClaim = (payload) => api.post("/travel/claims", payload).then(r => r.data.claim);
export const updateTravelClaim = (id, payload) => api.put(`/travel/claims/${id}`, payload).then(r => r.data.claim);
export const submitTravelClaim = (id) => api.post(`/travel/claims/${id}/submit`).then(r => r.data.claim);
export const uploadClaimReceipts = async (id, files, category = 'Misc') => {
  const fd = new FormData();
  [...files].forEach(f => fd.append('files', f));
  const r = await api.post(`/travel/claims/${id}/receipts?category=${encodeURIComponent(category)}`, fd);
  return r.data.items;
};
export const updateClaimItem = (claimId, itemId, data) => api.put(`/travel/claims/${claimId}/items/${itemId}`, data).then(r => r.data.claim);
export const deleteClaimItem = (claimId, itemId) => api.delete(`/travel/claims/${claimId}/items/${itemId}`).then(r => r.data.claim);

// Approvals
export const getMyApprovals = () => api.get("/travel/approvals/my").then(r => r.data.steps);
export const actOnApproval = (instanceId, decision, comment) => api.post(`/travel/approvals/${instanceId}/act`, { decision, comment }).then(r => r.data.result);
