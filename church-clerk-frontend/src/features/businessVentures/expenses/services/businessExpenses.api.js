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

export const createBusinessExpense = async (businessId, payload) => {
  return await http.post(`/business-ventures/business-ventures/${businessId}/expenses`, toFormData(payload));
};

export const getBusinessExpenses = async (businessId, params) => {
  return await http.get(`/business-ventures/business-ventures/${businessId}/expenses`, { params });
};

export const updateBusinessExpense = async (businessId, expensesId, payload) => {
  return await http.put(
    `/business-ventures/business-ventures/${businessId}/expenses/${expensesId}`,
    toFormData(payload)
  );
};

export const getExpenseReceiptDownloadUrl = (businessId, expensesId) => {
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/business-ventures/business-ventures/${businessId}/expenses/${expensesId}/receipt/download`;
};

