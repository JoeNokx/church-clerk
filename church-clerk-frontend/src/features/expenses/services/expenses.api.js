import http from "../../../shared/services/http.js";

const toFormData = (payload) => {
  const { receiptFile, removeReceipt, ...fields } = payload || {};
  if (!receiptFile && !removeReceipt) return fields;
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, value);
  });
  if (receiptFile) formData.append("receipt", receiptFile);
  if (removeReceipt) formData.append("removeReceipt", "true");
  return formData;
};

export const getGeneralExpenses = async (params) => {
  return await http.get("/general-expenses/general-expenses", { params });
};

export const createGeneralExpenses = async (payload) => {
  return await http.post("/general-expenses/general-expenses", toFormData(payload));
};

export const updateGeneralExpenses = async (id, payload) => {
  return await http.put(`/general-expenses/general-expenses/${id}`, toFormData(payload));
};

export const getGeneralExpensesKPI = async () => {
  return await http.get("/general-expenses/general-expenses/stats/kpi");
};

export const getGeneralExpenseReceiptDownloadUrl = (id) => {
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/general-expenses/general-expenses/${id}/receipt/download`;
};
