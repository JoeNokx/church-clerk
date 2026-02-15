import http from "../../../shared/services/http.js";

export const getRolePermissions = async () => {
  return await http.get("/user/role-permissions");
};

export const getChurchUsers = async (params) => {
  return await http.get("/user/church-users", { params });
};

export const createChurchUser = async (payload) => {
  return await http.post("/user/church-users", payload);
};

export const updateChurchUser = async (id, payload) => {
  return await http.put(`/user/church-users/${id}`, payload);
};

export const setChurchUserStatus = async (id, isActive) => {
  return await http.patch(`/user/church-users/${id}/status`, { isActive });
};
