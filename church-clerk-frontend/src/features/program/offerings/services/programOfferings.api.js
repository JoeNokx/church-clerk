import http from "../../../../shared/services/http.js";

export const createProgramOffering = async (programId, payload) => {
  if (!programId) throw new Error("Program id is required");
  return await http.post(`/program/programs/${programId}/offerings`, payload);
};

export const getProgramOfferings = async (programId, params) => {
  if (!programId) throw new Error("Program id is required");
  return await http.get(`/program/programs/${programId}/offerings`, { params });
};

export const updateProgramOffering = async (programId, offeringId, payload) => {
  if (!programId) throw new Error("Program id is required");
  if (!offeringId) throw new Error("Offering id is required");
  return await http.put(`/program/programs/${programId}/offerings/${offeringId}`, payload);
};

