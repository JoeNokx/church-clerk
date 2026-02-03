import http from "../../../../shared/services/http.js";

export const createWelfareDisbursement = async (payload) => {
  return await http.post("/welfare/welfare-disbursements", payload);
};

export const getWelfareDisbursements = async (params) => {
  return await http.get("/welfare/welfare-disbursements", { params });
};

export const updateWelfareDisbursement = async (id, payload) => {
  return await http.put(`/welfare/welfare-disbursements/${id}`, payload);
};

export const deleteWelfareDisbursement = async (id) => {
  return await http.delete(`/welfare/welfare-disbursements/${id}`);
};
