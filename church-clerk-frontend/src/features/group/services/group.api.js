import http from "../../../shared/services/http.js";

export const getGroups = async (params) => {
  return await http.get("/group/groups", { params });
};

export const getGroup = async (id) => {
  return await http.get(`/group/groups/${id}`);
};

export const createGroup = async (payload) => {
  return await http.post("/group/groups", payload);
};

export const updateGroup = async (id, payload) => {
  return await http.put(`/group/groups/${id}`, payload);
};

export const deleteGroup = async (id) => {
  return await http.delete(`/group/groups/${id}`);
};

export const addGroupMember = async (id, payload) => {
  return await http.post(`/group/groups/${id}/members`, payload);
};

export const getGroupMembers = async (id, params) => {
  return await http.get(`/group/groups/${id}/members`, { params });
};

export const updateGroupMemberRole = async (id, memberId, payload) => {
  return await http.put(`/group/groups/${id}/members/${memberId}`, payload);
};

export const removeGroupMember = async (id, memberId) => {
  return await http.delete(`/group/groups/${id}/members/${memberId}`);
};

export const addGroupMeeting = async (id, payload) => {
  return await http.post(`/group/groups/${id}/meetings`, payload);
};

export const getGroupMeetings = async (id, params) => {
  return await http.get(`/group/groups/${id}/meetings`, { params });
};

export const updateGroupMeeting = async (id, meetingId, payload) => {
  return await http.put(`/group/groups/${id}/meetings/${meetingId}`, payload);
};

export const deleteGroupMeeting = async (id, meetingId) => {
  return await http.delete(`/group/groups/${id}/meetings/${meetingId}`);
};

export const getGroupKPI = async () => {
  return await http.get("/group/groups/stats/kpi");
};
