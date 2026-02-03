import http from "../../../shared/services/http.js";

export const getAttendances = async (params) => {
  return await http.get("/attendance/attendances", { params });
};

export const createAttendance = async (payload) => {
  return await http.post("/attendance/attendances", payload);
};

export const updateAttendance = async (id, payload) => {
  return await http.put(`/attendance/attendances/${id}`, payload);
};

export const deleteAttendance = async (id) => {
  return await http.delete(`/attendance/attendances/${id}`);
};

export const createVisitor = async (payload) => {
  return await http.post("/attendance/visitors", payload);
};

export const updateVisitor = async (id, payload) => {
  return await http.put(`/attendance/visitors/${id}`, payload);
};

export const deleteVisitor = async (id) => {
  return await http.delete(`/attendance/visitors/${id}`);
};

export const getVisitor = async (id) => {
  return await http.get(`/attendance/visitors/${id}`);
};

export const getVisitors = async (params) => {
  return await http.get("/attendance/visitors", { params });
};
