import http from "../../../shared/services/http.js";

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

// Visitor follow-ups — shared outreach follow-up engine, subject = visitor.
// Update/delete reuse the outreach follow-up endpoints (same collection).
export const getVisitorFollowUps = async (visitorId, config = {}) => {
  return await http.get(`/attendance/visitors/${visitorId}/follow-ups`, config || {});
};

export const createVisitorFollowUp = async (visitorId, payload, config = {}) => {
  return await http.post(`/attendance/visitors/${visitorId}/follow-ups`, payload, config || {});
};

export const updateFollowUp = async (followUpId, payload, config = {}) => {
  return await http.put(`/outreach/follow-ups/${followUpId}`, payload, config || {});
};

export const deleteFollowUp = async (followUpId, config = {}) => {
  return await http.delete(`/outreach/follow-ups/${followUpId}`, config || {});
};

export const getServiceIndividualAttendances = async (params, config = {}) => {
  return await http.get("/attendance/individual-attendances", { params, ...(config || {}) });
};

// Absentees — members on a consecutive missed-services streak
export const getAbsentees = async (params, config = {}) => {
  return await http.get("/attendance/absentees", { params, ...(config || {}) });
};

// The specific services a member was marked absent for
export const getMemberMissedServices = async (memberId, params, config = {}) => {
  return await http.get(`/attendance/absentees/${memberId}/missed-services`, { params, ...(config || {}) });
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

export const getAttendanceCheckInLink = async () => {
  return await http.get("/attendance/checkin-link");
};

export const generateAttendanceCheckInLink = async () => {
  return await http.post("/attendance/checkin-link/generate", {});
};

export const revokeAttendanceCheckInLink = async () => {
  return await http.delete("/attendance/checkin-link/revoke");
};

export const getAttendanceQrCheckIn = async () => {
  return await http.get("/attendance/checkin-qr");
};

export const generateAttendanceQrCheckIn = async () => {
  return await http.post("/attendance/checkin-qr/generate", {});
};

export const revokeAttendanceQrCheckIn = async () => {
  return await http.delete("/attendance/checkin-qr/revoke");
};

export const getProgramGuests = async (params, config = {}) => {
  return await http.get(`/program/program-guests/search`, { params, ...config });
};
