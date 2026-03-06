import http from "../../../../shared/services/http.js";

export const createGroupAttendance = async (groupId, payload) => {
  return await http.post(`/group/groups/${groupId}/attendances`, payload);
};

export const getGroupAttendances = async (groupId, params) => {
  return await http.get(`/group/groups/${groupId}/attendances`, { params });
};

export const updateGroupAttendance = async (groupId, attendanceId, payload) => {
  return await http.put(`/group/groups/${groupId}/attendances/${attendanceId}`, payload);
};

export const deleteGroupAttendance = async (groupId, attendanceId) => {
  return await http.delete(`/group/groups/${groupId}/attendances/${attendanceId}`);
};

export const createGroupIndividualAttendance = async (groupId, payload) => {
  return await http.post(`/group/groups/${groupId}/individual-attendances`, payload);
};

export const getGroupIndividualAttendances = async (groupId, params) => {
  return await http.get(`/group/groups/${groupId}/individual-attendances`, { params });
};

export const getGroupIndividualAttendance = async (groupId, attendanceId) => {
  return await http.get(`/group/groups/${groupId}/individual-attendances/${attendanceId}`);
};

export const updateGroupIndividualAttendance = async (groupId, attendanceId, payload) => {
  return await http.put(`/group/groups/${groupId}/individual-attendances/${attendanceId}`, payload);
};

export const deleteGroupIndividualAttendance = async (groupId, attendanceId) => {
  return await http.delete(`/group/groups/${groupId}/individual-attendances/${attendanceId}`);
};
