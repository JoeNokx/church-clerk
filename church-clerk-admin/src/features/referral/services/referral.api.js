import http from "../../../shared/services/http.js";

export const getMyReferralCode = async () => {
  return await http.get("/referral/my-referral-code");
};

export const getMyReferralHistory = async () => {
  return await http.get("/referral/my-referral-history");
};
