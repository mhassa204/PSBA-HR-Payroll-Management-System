import api from "../lib/axios";

// Travel Requests
export const getTravelRequests = () => api.get("/travel/requests").then(r => r.data.requests);
export const getMyTravelRequests = () => api.get("/travel/requests/mine").then(r => r.data.requests);
export const getTravelRequest = (id) => api.get(`/travel/requests/${id}`).then(r => r.data.request);
export const createTravelRequest = (payload) => api.post("/travel/requests", payload).then(r => r.data.request);
export const updateTravelRequest = (id, payload) => api.put(`/travel/requests/${id}`, payload).then(r => r.data.request);
export const deleteTravelRequest = (id) => api.delete(`/travel/requests/${id}`).then(r => r.data);
export const getTravelReportees = () => api.get('/travel/employees/reportees').then(r => r.data.employees);
export const decideTravelRequest = (id, action) => api.post(`/travel/requests/${id}/decision`, { action }).then(r => r.data.request);
export const getPendingTravelApprovals = () => api.get('/travel/requests/pending-approvals').then(r => r.data.requests);
export const getTravelCapabilities = () => api.get('/travel/me/capabilities').then(r => r.data.capabilities);
export const updateTravelRequestStatus = (id, status) => api.patch(`/travel/requests/${id}/status`, { status }).then(r => r.data.request);

// ================= New Travel Expense Claims (replaces legacy item-based claims) =================
// Eligible approved travel requests (last 15 days) for which current user can file claims
export const getEligibleExpenseClaimRequests = () => api.get('/travel/expense-claims/eligible').then(r => r.data.requests);
// List existing claims accessible to user
export const listExpenseClaims = () => api.get('/travel/expense-claims').then(r => r.data.claims);

// Create a claim (one per travel_request + attendee employee)
export const createExpenseClaim = (payload) => api.post('/travel/expense-claims', payload).then(r => r.data.claim);
// Fetch / update / delete claim
export const getExpenseClaim = (id) => api.get(`/travel/expense-claims/${id}`).then(r => r.data.claim);
export const updateExpenseClaim = (id, payload) => api.put(`/travel/expense-claims/${id}`, payload).then(r => r.data.claim);
export const deleteExpenseClaim = (id) => api.delete(`/travel/expense-claims/${id}`).then(r => r.data);

// Segments CRUD
export const addExpenseClaimSegment = (claimId, payload) => api.post(`/travel/expense-claims/${claimId}/segments`, payload).then(r => r.data.claim);
export const updateExpenseClaimSegment = (claimId, segmentId, payload) => api.put(`/travel/expense-claims/${claimId}/segments/${segmentId}`, payload).then(r => r.data.claim);
export const deleteExpenseClaimSegment = (claimId, segmentId) => api.delete(`/travel/expense-claims/${claimId}/segments/${segmentId}`).then(r => r.data.claim);

// Documents (categories: FUEL, TOLL, PICTURE, REPORT) - REPORT is single & mandatory
// rate_per_km & per_diem_rate now auto-fetched from TravelRate per employee scale grade
export const uploadExpenseClaimDocuments = async (claimId, category, files) => {
  const fd = new FormData();
  [...files].forEach(f => fd.append('files', f));
  const r = await api.post(`/travel/expense-claims/${claimId}/documents?category=${encodeURIComponent(category)}`, fd);
  return r.data.claim;
};
export const deleteExpenseClaimDocument = (claimId, docId) => api.delete(`/travel/expense-claims/${claimId}/documents/${docId}`).then(r => r.data.claim);

// Utility: compute totals client-side (mirrors backend logic) (A-G mapping)
export const computeExpenseClaimTotals = (claim) => {
  if (!claim) return {};
  const A = Number(claim.total_distance_km || 0);
  const B = Number(claim.rate_per_km || 0);
  const C = +(A * B).toFixed(2);
  const D = Number(claim.toll_tax_total || 0);
  const E = +(C + D).toFixed(2);
  const perDiemDays = Number(claim.per_diem_days || 0);
  const perDiemRate = Number(claim.per_diem_rate || 0);
  const F = +(perDiemDays * perDiemRate).toFixed(2);
  const G = +(E + F).toFixed(2);
  return { A, B, C, D, E, F, G };
};

export const submitExpenseClaim = (id) => api.post(`/travel/expense-claims/${id}/submit`).then(r => r.data.claim);

// List pending expense claim approvals for current user
export const listPendingExpenseClaimApprovals = () => api.get('/travel/expense-claims/pending-approvals').then(r => r.data.claims);
// Decide (approve/reject) an expense claim
export const decideExpenseClaim = (id, action, remarks) => api.post(`/travel/expense-claims/${id}/decision`, { action, remarks }).then(r => r.data.claim);

// ===== Legacy Travel Claims API (deprecated) stubs to prevent import errors =====
// These map to no-ops so old components no longer break the build. Remove old pages to clean up.
export const getTravelClaims = async () => [];
export const getTravelClaim = async () => null;
export const createTravelClaim = async () => { throw new Error('Legacy travel claim API removed. Use new Expense Claims page.'); };
export const updateTravelClaim = async () => { throw new Error('Legacy travel claim API removed.'); };
export const updateClaimItem = async () => { throw new Error('Legacy travel claim items removed.'); };
export const deleteClaimItem = async () => { throw new Error('Legacy travel claim items removed.'); };
export const uploadClaimItemReceipts = async () => { throw new Error('Legacy travel claim receipts removed.'); };
export const deleteClaimItemReceipt = async () => { throw new Error('Legacy travel claim receipts removed.'); };
// ===============================================================================
