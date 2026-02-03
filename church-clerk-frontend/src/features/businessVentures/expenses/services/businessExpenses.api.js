import http from "../../../../shared/services/http.js";

export const createBusinessExpense = async (businessId, payload) => {
  return await http.post(`/business-ventures/business-ventures/${businessId}/expenses`, payload);
};

export const getBusinessExpenses = async (businessId, params) => {
  return await http.get(`/business-ventures/business-ventures/${businessId}/expenses`, { params });
};

export const updateBusinessExpense = async (businessId, expensesId, payload) => {
  return await http.put(
    `/business-ventures/business-ventures/${businessId}/expenses/${expensesId}`,
    payload
  );
};

export const deleteBusinessExpense = async (businessId, expensesId) => {
  return await http.delete(
    `/business-ventures/business-ventures/${businessId}/expenses/${expensesId}`
  );
};
