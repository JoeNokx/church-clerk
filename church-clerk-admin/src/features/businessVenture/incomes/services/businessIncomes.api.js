import http from "../../../../shared/services/http.js";

export const createBusinessIncome = async (businessId, payload) => {
  return await http.post(`/business-ventures/business-ventures/${businessId}/incomes`, payload);
};

export const getBusinessIncomes = async (businessId, params) => {
  return await http.get(`/business-ventures/business-ventures/${businessId}/incomes`, { params });
};

export const updateBusinessIncome = async (businessId, incomeId, payload) => {
  return await http.put(`/business-ventures/business-ventures/${businessId}/incomes/${incomeId}`, payload);
};

export const deleteBusinessIncome = async (businessId, incomeId) => {
  return await http.delete(`/business-ventures/business-ventures/${businessId}/incomes/${incomeId}`);
};
