import http from "../../../shared/services/http.js";

export const getApprovals = (params) =>
  http.get("/church-governance", { params, toastError: false });

export const getApprovalStats = () =>
  http.get("/church-governance/stats", { toastError: false });

export const approveRequest = (id) =>
  http.post(`/church-governance/${id}/approve`);

export const rejectRequest = (id, reason) =>
  http.post(`/church-governance/${id}/reject`, { reason });

export const submitAdjustment = (resourceUrl, patch, reason, impactLevel = "MINOR") =>
  http.post(`${resourceUrl}/adjustments`, { patch, reason, impactLevel });

export const getGovernanceFlags = () =>
  http.get("/church-governance/flags");

export const updateGovernanceFlags = (payload) =>
  http.patch("/church-governance/flags", payload);
