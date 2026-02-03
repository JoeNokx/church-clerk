import http from "../../../shared/services/http.js";

export const createBusinessVenture = async (payload) => {
  return await http.post("/business-ventures/business-ventures", payload);
};

export const getBusinessVentures = async (params) => {
  return await http.get("/business-ventures/business-ventures", { params });
};

export const getBusinessVenture = async (id) => {
  return await http.get(`/business-ventures/business-ventures/${id}`);
};

export const updateBusinessVenture = async (id, payload) => {
  return await http.put(`/business-ventures/business-ventures/${id}`, payload);
};

export const deleteBusinessVenture = async (id) => {
  return await http.delete(`/business-ventures/business-ventures/${id}`);
};

export const getBusinessKPI = async () => {
  return await http.get("/business-ventures/business-ventures/stats/kpi");
};

export const getBusinessIncomeExpensesKPI = async (businessId) => {
  return await http.get(`/business-ventures/business-ventures/${businessId}/income-expenses/kpi`);
};
