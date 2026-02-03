import http from "../../../shared/services/http.js";

export const getIncomes = async (params) => {
  return await http.get("/income/incomes", { params });
};

export const getIncome = async (id) => {
  return await http.get(`/income/incomes/${id}`);
};

export const createIncome = async (payload) => {
  return await http.post("/income/incomes", payload);
};

export const updateIncome = async (id, payload) => {
  return await http.put(`/income/incomes/${id}`, payload);
};

export const deleteIncome = async (id) => {
  return await http.delete(`/income/incomes/${id}`);
};
