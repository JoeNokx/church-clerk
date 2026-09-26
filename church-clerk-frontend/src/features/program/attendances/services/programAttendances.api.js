import http from "../../../../shared/services/http.js";

export const createTotalProgramAttendance = async (programId, payload) => {
  return await http.post(`/program/programs/${programId}/attendances`, payload);
};

export const getAllTotalProgramAttendances = async (programId, params) => {
  return await http.get(`/program/programs/${programId}/attendances`, { params });
};

export const updateTotalProgramAttendance = async (programId, attendanceId, payload) => {
  return await http.put(`/program/programs/${programId}/attendances/${attendanceId}`, payload);
};

export const deleteTotalProgramAttendance = async (programId, attendanceId) => {
  return await http.delete(`/program/programs/${programId}/attendances/${attendanceId}`);
};
