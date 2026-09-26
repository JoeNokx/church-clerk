import http from "../../../shared/services/http.js";

export const getPrograms = async (params, config = {}) => {
  return await http.get("/program/programs", { params, ...(config || {}) });
};

export const getProgramStats = async (params, config = {}) => {
  return await http.get("/program/programs/stats", { params, ...(config || {}) });
};

export const getUpcomingPrograms = async (params, { churchId } = {}) => {
  return await getPrograms({ ...(params || {}), status: "upcoming" }, churchId ? { headers: { "x-active-church": churchId } } : {});
};

export const getOngoingPrograms = async (params) => {
  return await getPrograms({ ...(params || {}), status: "ongoing" });
};

export const getPastPrograms = async (params) => {
  return await getPrograms({ ...(params || {}), status: "past" });
};

export const getProgram = async (id) => {
  return await http.get(`/program/programs/${id}`);
};

export const createProgram = async (payload) => {
  return await http.post("/program/programs", payload);
};

export const updateProgram = async (id, payload) => {
  return await http.put(`/program/programs/${id}`, payload);
};

export const deleteProgram = async (id) => {
  return await http.delete(`/program/programs/${id}`);
};
