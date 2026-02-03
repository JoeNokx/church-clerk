import http from "../../../shared/services/http.js";

export const createOffering = async (payload, churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.post("/offering/offerings", payload);
};

export const getOfferings = async (params, churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.get("/offering/offerings", { params });
};

export const updateOffering = async (id, payload, churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.put(`/offering/offerings/${id}`, payload);
};

export const deleteOffering = async (id, churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.delete(`/offering/offerings/${id}`);
};

export const getOfferingKPI = async (churchId) => {
  if (!churchId) throw new Error("Active church not selected");
  return await http.get("/offering/offerings/stats/kpi");
};
