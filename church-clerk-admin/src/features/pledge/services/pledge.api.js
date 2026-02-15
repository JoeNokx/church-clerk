import http from "../../../shared/services/http.js";

export const createPledge = async (payload) => {
  return await http.post("/pledge/pledges", payload);
};

export const getPledges = async (params) => {
  return await http.get("/pledge/pledges", { params });
};

export const getPledge = async (id) => {
  return await http.get(`/pledge/pledges/${id}`);
};

export const updatePledge = async (id, payload) => {
  return await http.put(`/pledge/pledges/${id}`, payload);
};

export const deletePledge = async (id) => {
  return await http.delete(`/pledge/pledges/${id}`);
};
