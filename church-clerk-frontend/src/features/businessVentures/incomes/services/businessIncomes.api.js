import http from "../../../../shared/services/http.js";

const toFormData = (payload) => {
  const { receiptFile, removeReceipt, ...fields } = payload || {};
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, value);
  });
  if (receiptFile) formData.append("receipt", receiptFile);
  if (removeReceipt) formData.append("removeReceipt", "true");
  return formData;
};

export const createBusinessIncome = async (businessId, payload) => {
  return await http.post(`/business-ventures/business-ventures/${businessId}/incomes`, toFormData(payload));
};

export const getBusinessIncomes = async (businessId, params) => {
  return await http.get(`/business-ventures/business-ventures/${businessId}/incomes`, { params });
};

export const updateBusinessIncome = async (businessId, incomeId, payload) => {
  return await http.put(
    `/business-ventures/business-ventures/${businessId}/incomes/${incomeId}`,
    toFormData(payload)
  );
};

export const getIncomeReceiptDownloadUrl = (businessId, incomeId) => {
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/business-ventures/business-ventures/${businessId}/incomes/${incomeId}/receipt/download`;
};

