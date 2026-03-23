import http from "../../../shared/services/http.js";

/** Register */
export const registerUser = async (payload) => {
  return await http.post("/auth/register", payload);
};

/** Login */
export const loginUser = async (payload) => {
  return await http.post("/auth/login", payload);
};

export const verifyEmail = async (payload) => {
  return await http.post("/auth/verify-email", payload);
};

export const resendEmailVerification = async (payload) => {
  return await http.post("/auth/resend-verification", payload);
};

export const forgotPassword = async (payload) => {
  return await http.post("/auth/forgot-password", payload);
};

export const resetPassword = async (payload) => {
  return await http.post("/auth/reset-password", payload);
};

/** Logout */
export const logoutUser = async () => {
  return await http.post("/auth/logout");
};

/** Update password */
export const updatePassword = async (payload) => {
  return await http.put("/auth/password", payload);
};

export const getMyProfile = async () => {
  return await http.get("/user/me");
};

export const updateMyProfile = async (payload) => {
  return await http.put("/user/me/profile", payload);
};

export const updateMyPassword = async (payload) => {
  return await http.put("/user/me/password", payload);
};
