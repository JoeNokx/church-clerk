import http from "../../../../shared/services/http.js";

export const createWelfareContribution = async (payload) => {
  return await http.post("/welfare/welfare-contributions", payload);
};

export const getWelfareContributions = async (params) => {
  return await http.get("/welfare/welfare-contributions", { params });
};

export const updateWelfareContribution = async (id, payload) => {
  return await http.put(`/welfare/welfare-contributions/${id}`, payload);
};

export const deleteWelfareContribution = async (id) => {
  return await http.delete(`/welfare/welfare-contributions/${id}`);
};
