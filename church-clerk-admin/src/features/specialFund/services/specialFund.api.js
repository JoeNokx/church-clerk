import http from "../../../shared/services/http.js";

export const createSpecialFund = async (payload, churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.post("/special-fund/special-funds", payload);
};

export const getSpecialFunds = async (params, churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.get("/special-fund/special-funds", { params });
};

export const updateSpecialFund = async (id, payload, churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.put(`/special-fund/special-funds/${id}`, payload);
};

export const deleteSpecialFund = async (id, churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.delete(`/special-fund/special-funds/${id}`);
};

export const getSpecialFundKPI = async (churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.get("/special-fund/special-funds/stats/kpi");
};
