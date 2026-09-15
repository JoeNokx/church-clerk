import http from "../../../shared/services/http.js";

export const getGeneralExpenses = async (params) => {
  return await http.get("/general-expenses/general-expenses", { params });
};

export const createGeneralExpenses = async (payload) => {
  return await http.post("/general-expenses/general-expenses", payload);
};

export const updateGeneralExpenses = async (id, payload) => {
  return await http.put(`/general-expenses/general-expenses/${id}`, payload);
};

export const getGeneralExpensesKPI = async () => {
  return await http.get("/general-expenses/general-expenses/stats/kpi");
};
