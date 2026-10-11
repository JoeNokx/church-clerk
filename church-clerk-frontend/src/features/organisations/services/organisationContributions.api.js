import http from "../../../shared/services/http.js";

const base = (type, id) => `/organisations/${type}s/${id}/contributions`;

export const getOrgContributions = async (type, id, params) => {
  return await http.get(base(type, id), { params });
};

export const createOrgContribution = async (type, id, payload) => {
  return await http.post(base(type, id), payload);
};

export const updateOrgContribution = async (type, id, contributionId, payload) => {
  return await http.put(`${base(type, id)}/${contributionId}`, payload);
};

export const deleteOrgContribution = async (type, id, contributionId) => {
  return await http.delete(`${base(type, id)}/${contributionId}`);
};
