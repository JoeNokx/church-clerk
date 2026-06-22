import http from "../../../shared/services/http.js";

export const getAdminDashboardStats = async () => {
  return await http.get("/system-admin/dashboard/stats");
};

export const getSystemChurches = async (params) => {
  return await http.get("/system-admin/churches", { params });
};

export const getSystemChurch = async (id) => {
  return await http.get(`/system-admin/churches/${id}`);
};

export const suspendSystemChurch = async (id, payload) => {
  return await http.patch(`/system-admin/churches/${id}/suspend`, payload);
};

export const unsuspendSystemChurch = async (id) => {
  return await http.patch(`/system-admin/churches/${id}/unsuspend`);
};

export const deleteSystemChurch = async (id) => {
  return await http.delete(`/system-admin/churches/${id}`);
};

export const getSystemUsers = async (params) => {
  return await http.get("/system-admin/users", { params });
};

export const getSystemRoles = async () => {
  return await http.get("/system-admin/roles");
};

export const getPermissionCatalog = async () => {
  return await http.get("/system-admin/permission-catalog");
};

export const listCustomRoles = async (params) => {
  return await http.get("/system-admin/custom-roles", { params });
};

export const createCustomRole = async (payload) => {
  return await http.post("/system-admin/custom-roles", payload);
};

export const updateCustomRole = async (id, payload) => {
  return await http.patch(`/system-admin/custom-roles/${id}`, payload);
};

export const getCustomRole = async (id) => {
  return await http.get(`/system-admin/custom-roles/${id}`);
};

export const deleteCustomRole = async (id) => {
  return await http.delete(`/system-admin/custom-roles/${id}`);
};

export const updateSystemUser = async (id, payload) => {
  return await http.patch(`/system-admin/users/${id}`, payload);
};

export const deleteSystemUserApi = async (id) => {
  return await http.delete(`/system-admin/users/${id}`);
};

export const verifyUserEmailByAdminApi = async (id) => {
  return await http.patch(`/system-admin/users/${id}/verify-email`);
};

export const getSystemAuditLogs = async (params) => {
  return await http.get("/system-admin/audit-logs", { params });
};

export const getSystemReferralSummary = async () => {
  return await http.get("/system-admin/referrals/summary");
};

export const getSystemReferralHistory = async (params) => {
  return await http.get("/system-admin/referrals/history", { params });
};

export const getSystemSettings = async () => {
  return await http.get("/system-admin/settings");
};

export const updateSystemSettings = async (payload) => {
  return await http.patch("/system-admin/settings", payload);
};

// Financial governance flags (admin)
export const getGovernanceFlagsSnapshot = async () => {
  return await http.get("/system-admin/governance/flags/snapshot");
};

export const toggleGovernanceFlags = async (payload) => {
  return await http.post("/system-admin/governance/flags/toggle", payload);
};

export const listSenderIdRequests = async (params) => {
  return await http.get("/system-admin/sender-id/requests", { params });
};

export const approveChurchSenderId = async (churchId) => {
  return await http.patch(`/system-admin/churches/${churchId}/sender-id/approve`);
};

export const rejectChurchSenderId = async (churchId) => {
  return await http.patch(`/system-admin/churches/${churchId}/sender-id/reject`);
};

export const getGlobalAnnouncementWalletKpis = async () => {
  return await http.get("/system-admin/announcements/wallet-kpis");
};

export const listSystemInAppAnnouncements = async (params) => {
  return await http.get("/system-admin/announcements/in-app", { params });
};

export const getSystemInAppAnnouncement = async (id) => {
  return await http.get(`/system-admin/announcements/in-app/${id}`);
};

export const createSystemInAppAnnouncement = async (payload) => {
  return await http.post("/system-admin/announcements/in-app", payload);
};

export const updateSystemInAppAnnouncement = async (id, payload) => {
  return await http.patch(`/system-admin/announcements/in-app/${id}`, payload);
};

export const deleteSystemInAppAnnouncement = async (id) => {
  return await http.delete(`/system-admin/announcements/in-app/${id}`);
};
