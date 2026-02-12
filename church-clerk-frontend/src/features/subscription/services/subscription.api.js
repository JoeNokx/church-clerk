import http from "../../../shared/services/http.js";

export const chooseSubscription = async (payload) => {
  return await http.post("/subscription/subscriptions", payload);
};

export const upgradeTrialToPlan = async (payload) => {
  return await http.post("/subscription/subscriptions/upgrade", payload);
};

export const getMySubscription = async () => {
  return await http.get("/subscription/subscriptions/me");
};

export const getAvailablePlans = async () => {
  return await http.get("/subscription/plans");
};

export const initializePaystackPayment = async (payload) => {
  return await http.post("/subscription/payments/paystack/initialize", payload);
};

export const chargePaystackMobileMoney = async (payload) => {
  return await http.post("/subscription/payments/paystack/mobile-money", payload);
};

export const verifyPaystackPayment = async (payload) => {
  return await http.post("/subscription/payments/paystack/verify", payload);
};

export const getMyBillingHistory = async (params) => {
  return await http.get("/subscription/billing-history", { params });
};

export const addMobileMoneyPaymentMethod = async (payload) => {
  return await http.post("/subscription/payment-methods/mobile-money", payload);
};

export const addCardPaymentMethod = async (payload) => {
  return await http.post("/subscription/payment-methods/card", payload);
};

export const removePaymentMethod = async (methodId) => {
  return await http.delete(`/subscription/payment-methods/${methodId}`);
};

export const getBillingInvoiceDownloadUrl = (id) => {
  if (!id) return "";
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/subscription/billing-history/${id}/invoice`;
};

export const cancelMySubscription = async () => {
  return await http.post("/subscription/subscriptions/cancel");
};

export const changeMyPlan = async (payload) => {
  return await http.post("/subscription/subscriptions/change-plan", payload);
};
