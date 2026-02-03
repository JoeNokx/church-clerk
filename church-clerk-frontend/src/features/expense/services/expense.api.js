import http from "../../../shared/services/http.js";

export const getExpenses = async (params) => {
  return await http.get("/expense/expenses", { params });
};

export const getExpense = async (id) => {
  return await http.get(`/expense/expenses/${id}`);
};

export const createExpense = async (payload) => {
  return await http.post("/expense/expenses", payload);
};

export const updateExpense = async (id, payload) => {
  return await http.put(`/expense/expenses/${id}`, payload);
};

export const deleteExpense = async (id) => {
  return await http.delete(`/expense/expenses/${id}`);
};
