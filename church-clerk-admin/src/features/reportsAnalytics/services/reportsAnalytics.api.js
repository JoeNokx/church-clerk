import http from "../../../shared/services/http.js";

export const getReportsAnalyticsKpi = async (params) => {
  return await http.get("/reports-analytics/kpi", { params });
};

export const getReportsAnalytics = async (params) => {
  return await http.get("/reports-analytics/analytics", { params });
};

export const exportReportsAnalytics = async (params) => {
  return await http.get("/reports-analytics/export", {
    params,
    responseType: "blob"
  });
};

export const getReportsAnalyticsReport = async (params) => {
  return await http.get("/reports-analytics/report", { params });
};

export const exportReportsAnalyticsReport = async (params) => {
  return await http.get("/reports-analytics/report/export", {
    params,
    responseType: "blob"
  });
};
