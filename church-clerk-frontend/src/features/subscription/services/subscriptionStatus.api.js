import http from "../../../shared/services/http.js";

export const getMySubscriptionStatus = async () => {
  return await http.get("/subscription/subscriptions/me");
};
