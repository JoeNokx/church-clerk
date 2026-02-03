import http from "../../../shared/services/http.js";

/** Register */
export const registerUser = async (payload) => {
  return await http.post("/auth/register", payload);
};

/** Login */
export const loginUser = async (payload) => {
  return await http.post("/auth/login", payload);
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
