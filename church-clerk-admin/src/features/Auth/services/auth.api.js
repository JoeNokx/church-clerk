import http from "../../../Shared/Services/http.js";

export const loginUser = async (payload) => {
  return await http.post("/admin/login", payload);
};

export const logoutUser = async () => {
  return await http.post("/admin/logout");
};

export const getMyProfile = async () => {
  return await http.get("/user/me");
};
