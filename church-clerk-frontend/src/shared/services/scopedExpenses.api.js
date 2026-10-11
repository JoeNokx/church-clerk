import http from "./http.js";

const SCOPE_BASE = {
  group: "/organisations/groups",
  cell: "/organisations/cells",
  department: "/organisations/departments",
  ministry: "/organisations/ministries",
  program: "/program/programs"
};

const baseFor = (scope, id) => `${SCOPE_BASE[scope]}/${id}/expenses`;

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

export const getScopedExpenses = async (scope, id, params) => {
  return await http.get(baseFor(scope, id), { params });
};

export const createScopedExpense = async (scope, id, payload) => {
  return await http.post(baseFor(scope, id), toFormData(payload));
};

export const updateScopedExpense = async (scope, id, expenseId, payload) => {
  return await http.put(`${baseFor(scope, id)}/${expenseId}`, toFormData(payload));
};

export const deleteScopedExpense = async (scope, id, expenseId) => {
  return await http.delete(`${baseFor(scope, id)}/${expenseId}`);
};

export const getScopedExpenseReceiptDownloadUrl = (scope, id, expenseId) => {
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}${baseFor(scope, id)}/${expenseId}/receipt/download`;
};
