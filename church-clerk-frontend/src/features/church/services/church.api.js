import http from "../../../shared/services/http.js";

/**
 * Create church (step 2 after register)
 */
export const createChurch = async (payload) => {
  return await http.post("/church/churches", payload);
};

export const getChurchProfile = async (id) => {
  return await http.get(`/church/churches/${id}`);
};

export const updateChurchProfile = async (id, payload) => {
  return await http.put(`/church/churches/${id}`, payload);
};

export const getMyBranches = async (params) => {
  return await http.get("/church/branches", { params });
};

export const getActiveChurchContext = async () => {
  return await http.get("/church/active-context");
};

export const searchHeadquartersChurches = async (params) => {
  return await http.get("/church/churches", { params });
};
