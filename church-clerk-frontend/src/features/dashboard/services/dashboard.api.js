import http from "../../../shared/services/http.js";

export const getDashboardKPI = async ({ churchId } = {}) => {
  return await http.get("/dashboard/kpi", churchId ? { headers: { "x-active-church": churchId } } : undefined);
};

export const getDashboardAnalytics = async (params, { churchId } = {}) => {
  return await http.get("/dashboard/analytics", {
    params,
    ...(churchId ? { headers: { "x-active-church": churchId } } : {})
  });
};

export const getDashboardWidgets = async ({ churchId } = {}) => {
  return await http.get("/dashboard/widgets", churchId ? { headers: { "x-active-church": churchId } } : undefined);
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
