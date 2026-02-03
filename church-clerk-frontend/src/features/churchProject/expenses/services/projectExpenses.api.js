import http from "../../../../shared/services/http.js";

export const createProjectExpense = async (projectId, payload) => {
  return await http.post(`/church-project/church-projects/${projectId}/expenses`, payload);
};

export const getProjectExpenses = async (projectId, params) => {
  return await http.get(`/church-project/church-projects/${projectId}/expenses`, { params });
};

export const updateProjectExpense = async (projectId, expensesId, payload) => {
  return await http.put(
    `/church-project/church-projects/${projectId}/expenses/${expensesId}`,
    payload
  );
};

export const deleteProjectExpense = async (projectId, expensesId) => {
  return await http.delete(`/church-project/church-projects/${projectId}/expenses/${expensesId}`);
};
