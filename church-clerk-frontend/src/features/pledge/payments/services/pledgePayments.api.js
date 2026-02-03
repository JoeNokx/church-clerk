import http from "../../../../shared/services/http.js";

export const createPledgePayment = async (pledgeId, payload) => {
  return await http.post(`/pledge/pledges/${pledgeId}/payments`, payload);
};

export const getPledgePayments = async (pledgeId, params) => {
  return await http.get(`/pledge/pledges/${pledgeId}/payments`, { params });
};

export const updatePledgePayment = async (pledgeId, id, payload) => {
  return await http.put(`/pledge/pledges/${pledgeId}/payments/${id}`, payload);
};

export const deletePledgePayment = async (pledgeId, id) => {
  return await http.delete(`/pledge/pledges/${pledgeId}/payments/${id}`);
};
