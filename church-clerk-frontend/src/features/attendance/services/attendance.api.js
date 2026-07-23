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

export const getServiceIndividualAttendances = async (params, config = {}) => {
  return await http.get("/attendance/individual-attendances", { params, ...(config || {}) });
};

export const createServiceIndividualAttendance = async (payload, config = {}) => {
  return await http.post("/attendance/individual-attendances", payload, config || {});
};

export const getServiceIndividualAttendance = async (id, config = {}) => {
  return await http.get(`/attendance/individual-attendances/${id}`, config || {});
};

export const updateServiceIndividualAttendance = async (id, payload, config = {}) => {
  return await http.put(`/attendance/individual-attendances/${id}`, payload, config || {});
};

export const deleteServiceIndividualAttendance = async (id, config = {}) => {
  return await http.delete(`/attendance/individual-attendances/${id}`, config || {});
};

export const getAttendanceCheckInLink = async (id) => {
  return await http.get(`/attendance/individual-attendances/${id}/checkin-link`);
};

export const generateAttendanceCheckInLink = async (id) => {
  return await http.post(`/attendance/individual-attendances/${id}/checkin-link/generate`, {});
};

export const revokeAttendanceCheckInLink = async (id) => {
  return await http.delete(`/attendance/individual-attendances/${id}/checkin-link/revoke`);
};
