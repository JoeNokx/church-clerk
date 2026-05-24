import http from "../../../shared/services/http.js";

export const getLookupValues = async (kind, config = {}) => {
  return await http.get(`/lookups/${kind}`, { ...config });
};

export const createLookupValue = async ({ kind, value }) => {
  return await http.post("/lookups", { kind, value });
};
