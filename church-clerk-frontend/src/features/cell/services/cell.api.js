import http from "../../../shared/services/http.js";

export const getCells = async (params) => {
  return await http.get("/cell/cells", { params });
};

export const getCell = async (id) => {
  return await http.get(`/cell/cells/${id}`);
};

export const createCell = async (payload) => {
  return await http.post("/cell/cells", payload);
};

export const updateCell = async (id, payload) => {
  return await http.put(`/cell/cells/${id}`, payload);
};

export const deleteCell = async (id) => {
  return await http.delete(`/cell/cells/${id}`);
};
