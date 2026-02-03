import http from "../../../shared/services/http.js";

export const getSystemChurches = async (params) => {
  return await http.get("/system-admin/churches", { params });
};

export const getSystemUsers = async (params) => {
  return await http.get("/system-admin/users", { params });
};

export const getSystemDashboardStats = async (params) => {
  return await http.get("/system-admin/dashboard/stats", { params });
};
