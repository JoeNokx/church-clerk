import http from "../../../shared/services/http.js";

export const getCells = async (params) => {
  return await http.get("/organisations/cells", { params });
};

export const getCell = async (id) => {
  return await http.get(`/organisations/cells/${id}`);
};

export const createCell = async (payload) => {
  return await http.post("/organisations/cells", payload);
};

export const updateCell = async (id, payload) => {
  return await http.put(`/organisations/cells/${id}`, payload);
};

export const deleteCell = async (id) => {
  return await http.delete(`/organisations/cells/${id}`);
};

export const addCellMember = async (id, payload) => {
  return await http.post(`/organisations/cells/${id}/members`, payload);
};

export const searchCellMembersToAdd = async (id, params) => {
  return await http.get(`/organisations/cells/${id}/members/search`, { params });
};

export const getCellMembers = async (id, params) => {
  return await http.get(`/organisations/cells/${id}/members`, { params });
};

export const updateCellMemberRole = async (id, memberId, payload) => {
  return await http.put(`/organisations/cells/${id}/members/${memberId}`, payload);
};

export const removeCellMember = async (id, memberId) => {
  return await http.delete(`/organisations/cells/${id}/members/${memberId}`);
};

export const addCellMeeting = async (id, payload) => {
  return await http.post(`/organisations/cells/${id}/meetings`, payload);
};

export const getCellMeetings = async (id, params) => {
  return await http.get(`/organisations/cells/${id}/meetings`, { params });
};

export const updateCellMeeting = async (id, meetingId, payload) => {
  return await http.put(`/organisations/cells/${id}/meetings/${meetingId}`, payload);
};

export const deleteCellMeeting = async (id, meetingId) => {
  return await http.delete(`/organisations/cells/${id}/meetings/${meetingId}`);
};

export const createCellAttendance = async (cellId, payload) => {
  return await http.post(`/organisations/cells/${cellId}/attendances`, payload);
};

export const getCellAttendances = async (cellId, params) => {
  return await http.get(`/organisations/cells/${cellId}/attendances`, { params });
};

export const updateCellAttendance = async (cellId, attendanceId, payload) => {
  return await http.put(`/organisations/cells/${cellId}/attendances/${attendanceId}`, payload);
};

export const deleteCellAttendance = async (cellId, attendanceId) => {
  return await http.delete(`/organisations/cells/${cellId}/attendances/${attendanceId}`);
};

export const createCellIndividualAttendance = async (cellId, payload) => {
  return await http.post(`/organisations/cells/${cellId}/individual-attendances`, payload);
};

export const getCellIndividualAttendances = async (cellId, params) => {
  return await http.get(`/organisations/cells/${cellId}/individual-attendances`, { params });
};

export const getCellIndividualAttendance = async (cellId, attendanceId) => {
  return await http.get(`/organisations/cells/${cellId}/individual-attendances/${attendanceId}`);
};

export const updateCellIndividualAttendance = async (cellId, attendanceId, payload) => {
  return await http.put(`/organisations/cells/${cellId}/individual-attendances/${attendanceId}`, payload);
};

export const deleteCellIndividualAttendance = async (cellId, attendanceId) => {
  return await http.delete(`/organisations/cells/${cellId}/individual-attendances/${attendanceId}`);
};

export const createCellOffering = async (cellId, payload) => {
  return await http.post(`/organisations/cells/${cellId}/offerings`, payload);
};

export const getCellOfferings = async (cellId, params) => {
  return await http.get(`/organisations/cells/${cellId}/offerings`, { params });
};

export const updateCellOffering = async (cellId, offeringId, payload) => {
  return await http.put(`/organisations/cells/${cellId}/offerings/${offeringId}`, payload);
};

export const getCellKPI = async () => {
  return await http.get("/organisations/cells/stats/kpi");
};
