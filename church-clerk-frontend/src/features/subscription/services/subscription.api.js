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
