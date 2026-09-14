import http from "../../../shared/services/http.js";

export const getMinistries = async (params) => {
  return await http.get("/organisations/ministries", { params });
};

export const getMinistry = async (id) => {
  return await http.get(`/organisations/ministries/${id}`);
};

export const createMinistry = async (payload) => {
  return await http.post("/organisations/ministries", payload);
};

export const updateMinistry = async (id, payload) => {
  return await http.put(`/organisations/ministries/${id}`, payload);
};

export const deleteMinistry = async (id) => {
  return await http.delete(`/organisations/ministries/${id}`);
};

export const addMinistryMember = async (id, payload) => {
  return await http.post(`/organisations/ministries/${id}/members`, payload);
};

export const searchMinistryMembersToAdd = async (id, params) => {
  return await http.get(`/organisations/ministries/${id}/members/search`, { params });
};

export const getMinistryMembers = async (id, params) => {
  return await http.get(`/organisations/ministries/${id}/members`, { params });
};

export const updateMinistryMemberRole = async (id, memberId, payload) => {
  return await http.put(`/organisations/ministries/${id}/members/${memberId}`, payload);
};

export const removeMinistryMember = async (id, memberId) => {
  return await http.delete(`/organisations/ministries/${id}/members/${memberId}`);
};

export const addMinistryMeeting = async (id, payload) => {
  return await http.post(`/organisations/ministries/${id}/meetings`, payload);
};

export const getMinistryMeetings = async (id, params) => {
  return await http.get(`/organisations/ministries/${id}/meetings`, { params });
};

export const updateMinistryMeeting = async (id, meetingId, payload) => {
  return await http.put(`/organisations/ministries/${id}/meetings/${meetingId}`, payload);
};

export const deleteMinistryMeeting = async (id, meetingId) => {
  return await http.delete(`/organisations/ministries/${id}/meetings/${meetingId}`);
};

export const createMinistryAttendance = async (ministryId, payload) => {
  return await http.post(`/organisations/ministries/${ministryId}/attendances`, payload);
};

export const getMinistryAttendances = async (ministryId, params) => {
  return await http.get(`/organisations/ministries/${ministryId}/attendances`, { params });
};

export const updateMinistryAttendance = async (ministryId, attendanceId, payload) => {
  return await http.put(`/organisations/ministries/${ministryId}/attendances/${attendanceId}`, payload);
};

export const deleteMinistryAttendance = async (ministryId, attendanceId) => {
  return await http.delete(`/organisations/ministries/${ministryId}/attendances/${attendanceId}`);
};

export const createMinistryIndividualAttendance = async (ministryId, payload) => {
  return await http.post(`/organisations/ministries/${ministryId}/individual-attendances`, payload);
};

export const getMinistryIndividualAttendances = async (ministryId, params) => {
  return await http.get(`/organisations/ministries/${ministryId}/individual-attendances`, { params });
};

export const getMinistryIndividualAttendance = async (ministryId, attendanceId) => {
  return await http.get(`/organisations/ministries/${ministryId}/individual-attendances/${attendanceId}`);
};

export const updateMinistryIndividualAttendance = async (ministryId, attendanceId, payload) => {
  return await http.put(`/organisations/ministries/${ministryId}/individual-attendances/${attendanceId}`, payload);
};

export const deleteMinistryIndividualAttendance = async (ministryId, attendanceId) => {
  return await http.delete(`/organisations/ministries/${ministryId}/individual-attendances/${attendanceId}`);
};

export const createMinistryOffering = async (ministryId, payload) => {
  return await http.post(`/organisations/ministries/${ministryId}/offerings`, payload);
};

export const getMinistryOfferings = async (ministryId, params) => {
  return await http.get(`/organisations/ministries/${ministryId}/offerings`, { params });
};

export const updateMinistryOffering = async (ministryId, offeringId, payload) => {
  return await http.put(`/organisations/ministries/${ministryId}/offerings/${offeringId}`, payload);
};

export const deleteMinistryOffering = async (ministryId, offeringId) => {
  return await http.delete(`/organisations/ministries/${ministryId}/offerings/${offeringId}`);
};

export const getMinistryKPI = async () => {
  return await http.get("/organisations/ministries/stats/kpi");
};
