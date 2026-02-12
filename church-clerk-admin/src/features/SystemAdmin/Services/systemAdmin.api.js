import http from "../../../Shared/Services/http.js";

export const getSystemChurches = async (params) => {
  return await http.get("/system-admin/churches", { params });
};

export const getSystemChurch = async (id) => {
  return await http.get(`/system-admin/churches/${id}`);
};

export const getSystemUsers = async (params) => {
  return await http.get("/system-admin/users", { params });
};

export const getSystemRoles = async () => {
  return await http.get("/system-admin/roles");
};

export const getSystemSettings = async () => {
  return await http.get("/system-admin/settings");
};

export const updateSystemSettings = async (payload) => {
  return await http.patch("/system-admin/settings", payload);
};
