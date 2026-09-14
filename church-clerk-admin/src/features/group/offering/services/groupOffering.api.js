import http from "../../../../shared/services/http.js";

export const createGroupOffering = async (groupId, payload) => {
  return await http.post(`/organisations/groups/${groupId}/offerings`, payload);
};

export const getGroupOfferings = async (groupId, params) => {
  return await http.get(`/organisations/groups/${groupId}/offerings`, { params });
};

export const updateGroupOffering = async (groupId, offeringId, payload) => {
  return await http.put(`/organisations/groups/${groupId}/offerings/${offeringId}`, payload);
};

export const deleteGroupOffering = async (groupId, offeringId) => {
  return await http.delete(`/organisations/groups/${groupId}/offerings/${offeringId}`);
};
