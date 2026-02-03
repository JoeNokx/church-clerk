import http from "../../../../shared/services/http.js";

export const createGroupOffering = async (groupId, payload) => {
  return await http.post(`/group/groups/${groupId}/offerings`, payload);
};

export const getGroupOfferings = async (groupId, params) => {
  return await http.get(`/group/groups/${groupId}/offerings`, { params });
};

export const updateGroupOffering = async (groupId, offeringId, payload) => {
  return await http.put(`/group/groups/${groupId}/offerings/${offeringId}`, payload);
};

export const deleteGroupOffering = async (groupId, offeringId) => {
  return await http.delete(`/group/groups/${groupId}/offerings/${offeringId}`);
};
