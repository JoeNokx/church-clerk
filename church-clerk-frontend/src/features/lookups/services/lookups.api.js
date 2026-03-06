import http from "../../../shared/services/http.js";

export const getLookupValues = async (kind) => {
  return await http.get("/lookups", { params: { kind } });
};

export const createLookupValue = async ({ kind, value }) => {
  return await http.post("/lookups", { kind, value });
};
