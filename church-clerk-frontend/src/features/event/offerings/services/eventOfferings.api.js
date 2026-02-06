import http from "../../../../shared/services/http.js";

export const createEventOffering = async (eventId, payload) => {
  if (!eventId) throw new Error("Event id is required");
  return await http.post(`/event/events/${eventId}/offerings`, payload);
};

export const getEventOfferings = async (eventId, params) => {
  if (!eventId) throw new Error("Event id is required");
  return await http.get(`/event/events/${eventId}/offerings`, { params });
};

export const updateEventOffering = async (eventId, offeringId, payload) => {
  if (!eventId) throw new Error("Event id is required");
  if (!offeringId) throw new Error("Offering id is required");
  return await http.put(`/event/events/${eventId}/offerings/${offeringId}`, payload);
};

export const deleteEventOffering = async (eventId, offeringId) => {
  if (!eventId) throw new Error("Event id is required");
  if (!offeringId) throw new Error("Offering id is required");
  return await http.delete(`/event/events/${eventId}/offerings/${offeringId}`);
};
