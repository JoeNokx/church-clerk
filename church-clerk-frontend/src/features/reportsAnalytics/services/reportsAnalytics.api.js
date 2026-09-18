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

export const getReportEntities = async (params) => {
  return await http.get("/reports-analytics/report/entities", { params });
};

export const createSavedReport = async (payload) => {
  return await http.post("/reports-analytics/report/saved", payload);
};

export const getSavedReports = async (params) => {
  return await http.get("/reports-analytics/report/saved", { params });
};

export const getSavedReport = async (id) => {
  return await http.get(`/reports-analytics/report/saved/${id}`);
};

export const deleteSavedReport = async (id) => {
  return await http.delete(`/reports-analytics/report/saved/${id}`);
};

export const downloadSavedReport = async (id, params) => {
  return await http.get(`/reports-analytics/report/saved/${id}/download`, {
    params,
    responseType: "blob"
  });
};

export const getSharedReport = async (token) => {
  return await http.get(`/reports-analytics/shared/${token}`, { toastError: false });
};

export const downloadSharedReport = async (token, params) => {
  return await http.get(`/reports-analytics/shared/${token}/download`, {
    params,
    responseType: "blob",
    toastError: false
  });
};
