import http from "../../../shared/services/http.js";

export const loginUser = async (payload) => {
  return await http.post("/admin/login", payload);
};

export const logoutUser = async () => {
  return await http.post("/admin/logout");
};

export const getMyProfile = async () => {
  return await http.get("/admin/me", { toastError: false });
};

export const updateMyProfile = async (payload) => {
  return await http.put("/user/me/profile", payload);
};

export const updateMyPassword = async (payload) => {
  return await http.put("/user/me/password", payload);
};

export const registerSystemAdmin = async (payload) => {
  return await http.post("/admin/register", payload);
};

export const changeAdminEmail = async (payload) => {
  return await http.put("/admin/me/email", payload);
};

export const forgotAdminPassword = async (email) => {
  return await http.post("/admin/forgot-password", { email });
};

export const resetAdminPassword = async (payload) => {
  return await http.post("/admin/reset-password", payload);
};
