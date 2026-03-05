import http from "../../../shared/services/http.js";

export const getDashboardKPI = async () => {
  return await http.get("/dashboard/kpi");
};

export const getDashboardAnalytics = async (params) => {
  return await http.get("/dashboard/analytics", { params });
};

export const getDashboardWidgets = async () => {
  return await http.get("/dashboard/widgets");
};

export const getDashboardWidgetsWithParams = async (params) => {
  return await http.get("/dashboard/widgets", { params });
};

export const getDashboardSummary = async () => {
  return await http.get("/dashboard/summary");
};

export const getDashboardChart = async (params) => {
  return await http.get("/dashboard/chart", { params });
};

export const getDashboardRecentOfferings = async () => {
  return await http.get("/dashboard/recent-offerings");
};
