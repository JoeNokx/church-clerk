import http from "../../../Shared/Services/http.js";

export const adminGetPlans = async () => {
  return await http.get("/admin/billing/plans");
};

export const adminCreatePlan = async (payload) => {
  return await http.post("/admin/billing/plans", payload);
};

export const adminUpdatePlan = async (id, payload) => {
  return await http.put(`/admin/billing/plans/${id}`, payload);
};

export const adminDeletePlan = async (id) => {
  return await http.delete(`/admin/billing/plans/${id}`);
};

export const adminGetSubscriptions = async () => {
  return await http.get("/admin/billing/subscriptions");
};

export const adminUpdateSubscription = async (id, payload) => {
  return await http.put(`/admin/billing/subscriptions/${id}`, payload);
};

export const adminGetPayments = async (params) => {
  return await http.get("/admin/billing/payments", { params });
};

export const adminVerifyPayment = async (id) => {
  return await http.post(`/admin/billing/payments/${id}/verify`);
};

export const adminGetRevenue = async () => {
  return await http.get("/admin/billing/revenue");
};

export const adminGetInvoices = async (params) => {
  return await http.get("/admin/billing/invoices", { params });
};

export const adminCreateInvoice = async (payload) => {
  return await http.post("/admin/billing/invoices", payload);
};

export const adminMarkInvoiceStatus = async (id, payload) => {
  return await http.put(`/admin/billing/invoices/${id}/status`, payload);
};

export const adminGetInvoiceDownloadUrl = (id) => {
  if (!id) return "";
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}/admin/billing/invoices/${id}/download`;
  return `/api/v1/admin/billing/invoices/${id}/download`;
};

export const adminGetWebhookLogs = async (params) => {
  return await http.get("/admin/billing/webhook-logs", { params });
};
