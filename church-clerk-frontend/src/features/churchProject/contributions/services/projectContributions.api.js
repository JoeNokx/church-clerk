import http from "../../../../shared/services/http.js";

export const createProjectContribution = async (projectId, payload) => {
  return await http.post(`/church-project/church-projects/${projectId}/contributions`, payload);
};

export const getProjectContributions = async (projectId, params) => {
  return await http.get(`/church-project/church-projects/${projectId}/contributions`, { params });
};

export const updateProjectContribution = async (projectId, contributionId, payload) => {
  return await http.put(
    `/church-project/church-projects/${projectId}/contributions/${contributionId}`,
    payload
  );
};

export const deleteProjectContribution = async (projectId, contributionId) => {
  return await http.delete(
    `/church-project/church-projects/${projectId}/contributions/${contributionId}`
  );
};
