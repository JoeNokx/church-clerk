import http from "../../../shared/services/http.js";

export const getTitheIndividuals = async (params) => {
  return await http.get("/tithe/tithe-individuals", { params });
};

export const createTitheIndividual = async (payload) => {
  return await http.post("/tithe/tithe-individuals", payload);
};

export const updateTitheIndividual = async (id, payload) => {
  return await http.put(`/tithe/tithe-individuals/${id}`, payload);
};

export const deleteTitheIndividual = async (id) => {
  return await http.delete(`/tithe/tithe-individuals/${id}`);
};

export const getTitheIndividualKPI = async () => {
  return await http.get("/tithe/tithe-individuals/stats/kpi");
};

export const getTitheAggregates = async (params) => {
  return await http.get("/tithe/tithe-aggregates", { params });
};

export const createTitheAggregate = async (payload) => {
  return await http.post("/tithe/tithe-aggregates", payload);
};

export const updateTitheAggregate = async (id, payload) => {
  return await http.put(`/tithe/tithe-aggregates/${id}`, payload);
};

export const deleteTitheAggregate = async (id) => {
  return await http.delete(`/tithe/tithe-aggregates/${id}`);
};

export const getTitheAggregateKPI = async () => {
  return await http.get("/tithe/tithe-aggregates/stats/kpi");
};
