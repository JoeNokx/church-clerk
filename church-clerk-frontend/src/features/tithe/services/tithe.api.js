import http from "../../../shared/services/http.js";

const ensureChurch = (churchId, argsLength) => {
  if (argsLength > 1 && !churchId) throw new Error("Active church not selected");
};

export async function getTitheIndividuals(params, churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/tithe-individuals", { params });
}

export async function createTitheIndividual(payload, churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.post("/tithe/tithe-individuals", payload);
}

export async function updateTitheIndividual(id, payload, churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.put(`/tithe/tithe-individuals/${id}`, payload);
}

export async function deleteTitheIndividual(id, churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.delete(`/tithe/tithe-individuals/${id}`);
}

export async function getTitheIndividualKPI(churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/tithe-individuals/stats/kpi");
}

export async function getTitheAggregates(params, churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/tithe-aggregates", { params });
}

export async function createTitheAggregate(payload, churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.post("/tithe/tithe-aggregates", payload);
}

export async function updateTitheAggregate(id, payload, churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.put(`/tithe/tithe-aggregates/${id}`, payload);
}

export async function deleteTitheAggregate(id, churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.delete(`/tithe/tithe-aggregates/${id}`);
}

export async function getTitheAggregateKPI(churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/tithe-aggregates/stats/kpi");
}

export async function searchTitheMembers(search, churchId) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/members/search", { params: { search } });
}
