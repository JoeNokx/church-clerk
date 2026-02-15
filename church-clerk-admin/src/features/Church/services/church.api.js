import http from "../../../shared/services/http.js";

export const getMyBranches = async (params) => {
  return await http.get("/church/branches", { params });
};

export const updateChurchProfile = async (id, payload) => {
  return await http.put(`/church/churches/${id}`, payload);
};
