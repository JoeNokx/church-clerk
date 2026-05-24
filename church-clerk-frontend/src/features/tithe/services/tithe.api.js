import http from "../../../shared/services/http.js";

const ensureChurch = (churchId, argsLength) => {
  if (argsLength > 1 && !churchId) throw new Error("Active church not selected");
};

export async function getTitheIndividuals(params, churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/tithe-individuals", { params, ...(config || {}) });
}

export async function createTitheIndividual(payload, churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.post("/tithe/tithe-individuals", payload, config || {});
}

export async function updateTitheIndividual(id, payload, churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.put(`/tithe/tithe-individuals/${id}`, payload, config || {});
}

export async function deleteTitheIndividual(id, churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.delete(`/tithe/tithe-individuals/${id}`, config || {});
}

export async function getTitheIndividualKPI(churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/tithe-individuals/stats/kpi", config || {});
}

export async function getTitheAggregates(params, churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/tithe-aggregates", { params, ...(config || {}) });
}

export async function createTitheAggregate(payload, churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.post("/tithe/tithe-aggregates", payload, config || {});
}

export async function updateTitheAggregate(id, payload, churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.put(`/tithe/tithe-aggregates/${id}`, payload, config || {});
}

export async function deleteTitheAggregate(id, churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.delete(`/tithe/tithe-aggregates/${id}`, config || {});
}

export async function getTitheAggregateKPI(churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/tithe-aggregates/stats/kpi", config || {});
}

export async function searchTitheMembers(search, churchId, config = {}) {
  ensureChurch(churchId, arguments.length);
  return await http.get("/tithe/members/search", { params: { search }, ...(config || {}) });
}
