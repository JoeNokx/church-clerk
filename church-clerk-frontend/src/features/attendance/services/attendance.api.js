import http from "../../../shared/services/http.js";

export const getAttendances = async (params, config = {}) => {
  return await http.get("/attendance/attendances", { params, ...(config || {}) });
};

export const createAttendance = async (payload, config = {}) => {
  return await http.post("/attendance/attendances", payload, config || {});
};

export const updateAttendance = async (id, payload, config = {}) => {
  return await http.put(`/attendance/attendances/${id}`, payload, config || {});
};

export const deleteAttendance = async (id, config = {}) => {
  return await http.delete(`/attendance/attendances/${id}`, config || {});
};

export const createVisitor = async (payload, config = {}) => {
  return await http.post("/attendance/visitors", payload, config || {});
};

export const updateVisitor = async (id, payload, config = {}) => {
  return await http.put(`/attendance/visitors/${id}`, payload, config || {});
};

export const deleteVisitor = async (id, config = {}) => {
  return await http.delete(`/attendance/visitors/${id}`, config || {});
};

export const getVisitor = async (id, config = {}) => {
  return await http.get(`/attendance/visitors/${id}`, config || {});
};

export const getVisitors = async (params, config = {}) => {
  return await http.get("/attendance/visitors", { params, ...(config || {}) });
};
