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
// New recommender APIs
export const recommendTravelRequest = (id) => api.post(`/travel/requests/${id}/recommend`).then(r => r.data.request);
export const clearTravelRecommendation = (id) => api.post(`/travel/requests/${id}/recommend/clear`).then(r => r.data.request);

// ================= New Travel Expense Claims (replaces legacy item-based claims) =================
// Eligible approved travel requests (last 15 days) for which current user can file claims
export const getEligibleExpenseClaimRequests = () => api.get('/travel/expense-claims/eligible').then(r => r.data.requests);
// List existing claims accessible to user
export const listExpenseClaims = () => api.get('/travel/expense-claims').then(r => r.data.claims);

// Create a claim (one per travel_request + attendee employee)
export const createExpenseClaim = (payload) => api.post('/travel/expense-claims', payload).then(r => r.data.claim);
export const updateExpenseClaim = (id, payload) => api.put(`/travel/expense-claims/${id}`, payload).then(r => r.data.claim);
// Fetch a specific claim (with segments/documents)
export const getExpenseClaim = (id) => api.get(`/travel/expense-claims/${id}`).then(r => r.data.claim);
// Delete a claim (only in DRAFT)
export const deleteExpenseClaim = (id) => api.delete(`/travel/expense-claims/${id}`).then(r => r.data);

// Segment operations
export const addExpenseClaimSegment = (id, payload) => api.post(`/travel/expense-claims/${id}/segments`, payload).then(r => r.data.claim);
export const updateExpenseClaimSegment = (id, segmentId, payload) => api.put(`/travel/expense-claims/${id}/segments/${segmentId}`, payload).then(r => r.data.claim);
export const deleteExpenseClaimSegment = (id, segmentId) => api.delete(`/travel/expense-claims/${id}/segments/${segmentId}`).then(r => r.data.claim);

// Document operations
export const uploadExpenseClaimDocuments = (id, category, files) => {
  const fd = new FormData();
  // Ensure files is iterable (FileList or Array<File>)
  Array.from(files).forEach(f => fd.append('files', f));
  return api.post(`/travel/expense-claims/${id}/documents?category=${encodeURIComponent(category)}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data.claim);
};
export const deleteExpenseClaimDocument = (id, docId) => api.delete(`/travel/expense-claims/${id}/documents/${docId}`).then(r => r.data.claim);

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
// New: list all claims (for approvers history view)
export const listAllExpenseClaimApprovals = () => api.get('/travel/expense-claims/all').then(r => r.data.claims);
// Decide (approve/reject/recommend) an expense claim
export const decideExpenseClaim = (id, action, remarks) => api.post(`/travel/expense-claims/${id}/decision`, { action, remarks }).then(r => r.data.claim);

// Export helper: transform claims to CSV rows (minimal) (id,status,employee_id,travel_request_id,grand_total)
export const exportExpenseClaimsToCsv = (claims) => {
  if(!claims||!claims.length) return '';
  const header = ['id','status','employee_id','travel_request_id','grand_total'];
  const rows = claims.map(c=> [c.id, c.status, c.employee_id, c.travel_request_id, c.grand_total||0]);
  return [header.join(','), ...rows.map(r=>r.join(','))].join('\n');
};

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
