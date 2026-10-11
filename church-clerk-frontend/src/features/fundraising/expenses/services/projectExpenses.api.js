import http from "../../../../shared/services/http.js";

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

export const createProjectExpense = async (projectId, payload) => {
  return await http.post(`/church-project/church-projects/${projectId}/expenses`, toFormData(payload));
};

export const getProjectExpenses = async (projectId, params) => {
  return await http.get(`/church-project/church-projects/${projectId}/expenses`, { params });
};

export const updateProjectExpense = async (projectId, expensesId, payload) => {
  return await http.put(
    `/church-project/church-projects/${projectId}/expenses/${expensesId}`,
    toFormData(payload)
  );
};

export const getProjectExpenseReceiptDownloadUrl = (projectId, expensesId) => {
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/church-project/church-projects/${projectId}/expenses/${expensesId}/receipt/download`;
};
