import http from "../../../shared/services/http.js";

export const getActivityLogs = async (params) => {
  return await http.get("/activity-log/activity-logs", { params });
};

export const getActivityLog = async (id) => {
  return await http.get(`/activity-log/activity-logs/${id}`);
};
