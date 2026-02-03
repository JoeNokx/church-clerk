import http from "../../../shared/services/http.js";

export const createChurchProject = async (payload) => {
  return await http.post("/church-project/church-projects", payload);
};

export const getChurchProjects = async (params) => {
  return await http.get("/church-project/church-projects", { params });
};

export const updateChurchProject = async (id, payload) => {
  return await http.put(`/church-project/church-projects/${id}`, payload);
};

export const deleteChurchProject = async (id) => {
  return await http.delete(`/church-project/church-projects/${id}`);
};

export const getProjectContributionExpensesKPI = async (projectId) => {
  return await http.get(`/church-project/church-projects/${projectId}/contribution-expenses/kpi`);
};
