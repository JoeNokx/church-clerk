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

export const addCellMember = async (id, payload) => {
  return await http.post(`/cell/cells/${id}/members`, payload);
};

export const searchCellMembersToAdd = async (id, params) => {
  return await http.get(`/cell/cells/${id}/members/search`, { params });
};

export const getCellMembers = async (id, params) => {
  return await http.get(`/cell/cells/${id}/members`, { params });
};

export const updateCellMemberRole = async (id, memberId, payload) => {
  return await http.put(`/cell/cells/${id}/members/${memberId}`, payload);
};

export const removeCellMember = async (id, memberId) => {
  return await http.delete(`/cell/cells/${id}/members/${memberId}`);
};

export const addCellMeeting = async (id, payload) => {
  return await http.post(`/cell/cells/${id}/meetings`, payload);
};

export const getCellMeetings = async (id, params) => {
  return await http.get(`/cell/cells/${id}/meetings`, { params });
};

export const updateCellMeeting = async (id, meetingId, payload) => {
  return await http.put(`/cell/cells/${id}/meetings/${meetingId}`, payload);
};

export const deleteCellMeeting = async (id, meetingId) => {
  return await http.delete(`/cell/cells/${id}/meetings/${meetingId}`);
};

export const createCellAttendance = async (cellId, payload) => {
  return await http.post(`/cell/cells/${cellId}/attendances`, payload);
};

export const getCellAttendances = async (cellId, params) => {
  return await http.get(`/cell/cells/${cellId}/attendances`, { params });
};

export const updateCellAttendance = async (cellId, attendanceId, payload) => {
  return await http.put(`/cell/cells/${cellId}/attendances/${attendanceId}`, payload);
};

export const deleteCellAttendance = async (cellId, attendanceId) => {
  return await http.delete(`/cell/cells/${cellId}/attendances/${attendanceId}`);
};

export const createCellOffering = async (cellId, payload) => {
  return await http.post(`/cell/cells/${cellId}/offerings`, payload);
};

export const getCellOfferings = async (cellId, params) => {
  return await http.get(`/cell/cells/${cellId}/offerings`, { params });
};

export const updateCellOffering = async (cellId, offeringId, payload) => {
  return await http.put(`/cell/cells/${cellId}/offerings/${offeringId}`, payload);
};

export const deleteCellOffering = async (cellId, offeringId) => {
  return await http.delete(`/cell/cells/${cellId}/offerings/${offeringId}`);
};

export const getCellKPI = async () => {
  return await http.get("/cell/cells/stats/kpi");
};
