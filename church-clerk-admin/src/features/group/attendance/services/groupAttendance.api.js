import http from "../../../../shared/services/http.js";

export const createGroupAttendance = async (groupId, payload) => {
  return await http.post(`/organisations/groups/${groupId}/attendances`, payload);
};

export const getGroupAttendances = async (groupId, params) => {
  return await http.get(`/organisations/groups/${groupId}/attendances`, { params });
};

export const updateGroupAttendance = async (groupId, attendanceId, payload) => {
  return await http.put(`/organisations/groups/${groupId}/attendances/${attendanceId}`, payload);
};

export const deleteGroupAttendance = async (groupId, attendanceId) => {
  return await http.delete(`/organisations/groups/${groupId}/attendances/${attendanceId}`);
};
