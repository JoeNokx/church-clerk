import http from "../../../../shared/services/http.js";

export const createGroupIndividualAttendance = async (groupId, payload) => {
  return await http.post(`/organisations/groups/${groupId}/individual-attendances`, payload);
};

export const getGroupIndividualAttendances = async (groupId, params) => {
  return await http.get(`/organisations/groups/${groupId}/individual-attendances`, { params });
};

export const getGroupIndividualAttendance = async (groupId, attendanceId) => {
  return await http.get(`/organisations/groups/${groupId}/individual-attendances/${attendanceId}`);
};

export const updateGroupIndividualAttendance = async (groupId, attendanceId, payload) => {
  return await http.put(`/organisations/groups/${groupId}/individual-attendances/${attendanceId}`, payload);
};

export const deleteGroupIndividualAttendance = async (groupId, attendanceId) => {
  return await http.delete(`/organisations/groups/${groupId}/individual-attendances/${attendanceId}`);
};
