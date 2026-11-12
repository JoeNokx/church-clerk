import http from "../../../shared/services/http.js";

export const getRolePermissions = async () => {
  return await http.get("/user/role-permissions");
};

export const getChurchUsers = async (params) => {
  return await http.get("/user/church-users", { params });
};

export const createChurchUser = async (payload) => {
  return await http.post("/user/church-users", payload);
};

export const updateChurchUser = async (id, payload) => {
  return await http.put(`/user/church-users/${id}`, payload);
};

export const setChurchUserStatus = async (id, isActive) => {
  return await http.patch(`/user/church-users/${id}/status`, { isActive });
};

export const canCreateChurchUser = async () => {
  return await http.get("/user/church-users/can-create");
};

// Church custom roles (same logic as the system admin custom roles, but
// church-scoped and managed by the ChurchClerk admin only)
export const listChurchCustomRoles = async () => {
  return await http.get("/user/custom-roles");
};

export const createChurchCustomRole = async (payload) => {
  return await http.post("/user/custom-roles", payload);
};

export const getChurchCustomRole = async (id) => {
  return await http.get(`/user/custom-roles/${id}`);
};

export const updateChurchCustomRole = async (id, payload) => {
  return await http.patch(`/user/custom-roles/${id}`, payload);
};

export const deleteChurchCustomRole = async (id) => {
  return await http.delete(`/user/custom-roles/${id}`);
};

// Financial governance flags
export const getGovernanceFlagsSnapshot = async () => {
  return await http.get("/system-admin/governance/flags/snapshot");
};

export const toggleGovernanceFlags = async (payload) => {
  return await http.post("/system-admin/governance/flags/toggle", payload);
};

// System settings (admin)
export const getSystemSettingsAdmin = async () => {
  return await http.get("/system-admin/settings");
};

export const updateSystemSettingsAdmin = async (payload) => {
  return await http.patch("/system-admin/settings", payload);
};
