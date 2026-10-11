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

export const createWelfareDisbursement = async (payload) => {
  return await http.post("/welfare/welfare-disbursements", toFormData(payload));
};

export const getWelfareDisbursements = async (params, config = {}) => {
  return await http.get("/welfare/welfare-disbursements", { params, ...(config || {}) });
};

export const updateWelfareDisbursement = async (id, payload) => {
  return await http.put(`/welfare/welfare-disbursements/${id}`, toFormData(payload));
};

export const getDisbursementReceiptDownloadUrl = (id) => {
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/welfare/welfare-disbursements/${id}/receipt/download`;
};
