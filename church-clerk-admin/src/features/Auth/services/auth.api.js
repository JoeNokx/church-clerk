import http from "../../../Shared/Services/http.js";

export const loginUser = async (payload) => {
  return await http.post("/admin/login", payload);
};

export const logoutUser = async () => {
  return await http.post("/admin/logout");
};

export const getMyProfile = async () => {
  return await http.get("/admin/me");
};

export const updateMyProfile = async (payload) => {
  return await http.put("/user/me/profile", payload);
};

export const updateMyPassword = async (payload) => {
  return await http.put("/user/me/password", payload);
};
