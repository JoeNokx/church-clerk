import http from "../../../shared/services/http.js";

export const getBudgets = async (params) => {
  return await http.get("/budgeting/budgets", { params });
};

export const getBudget = async (id) => {
  return await http.get(`/budgeting/budgets/${id}`);
};

export const getBudgetSummary = async (id) => {
  return await http.get(`/budgeting/budgets/${id}/summary`);
};

export const createBudget = async (payload) => {
  return await http.post("/budgeting/budgets", payload);
};

export const updateBudget = async (id, payload) => {
  return await http.put(`/budgeting/budgets/${id}`, payload);
};

export const deleteBudget = async (id) => {
  return await http.delete(`/budgeting/budgets/${id}`);
};
