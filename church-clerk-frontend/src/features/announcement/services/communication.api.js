import http from "../../../shared/services/http.js";

export const getWallet = async () => {
  return await http.get("/announcement/wallet");
};

export const getWalletTransactions = async (params) => {
  return await http.get("/announcement/wallet/transactions", { params });
};

export const fundWalletInitiate = async (payload) => {
  return await http.post("/announcement/wallet/fund/initiate", payload);
};

export const createCommunicationMessage = async (payload) => {
  return await http.post("/announcement/messages", payload);
};

export const getCommunicationMessages = async (params) => {
  return await http.get("/announcement/messages", { params });
};

export const getMessageDeliveryReport = async (id, params) => {
  return await http.get(`/announcement/messages/${id}/report`, { params });
};

export const getMessageTemplates = async (params) => {
  return await http.get("/announcement/templates", { params });
};

export const createMessageTemplate = async (payload) => {
  return await http.post("/announcement/templates", payload);
};

export const updateMessageTemplate = async (id, payload) => {
  return await http.put(`/announcement/templates/${id}`, payload);
};

export const deleteMessageTemplate = async (id) => {
  return await http.delete(`/announcement/templates/${id}`);
};
