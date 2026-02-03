import http from "../../../../shared/services/http.js";

export const createEventAttendee = async (eventId, payload) => {
  return await http.post(`/event/events/${eventId}/attendees`, payload);
};

export const getEventAttendees = async (eventId, params) => {
  return await http.get(`/event/events/${eventId}/attendees`, { params });
};

export const updateEventAttendee = async (eventId, attendeeId, payload) => {
  return await http.put(`/event/events/${eventId}/attendees/${attendeeId}`, payload);
};

export const deleteEventAttendee = async (eventId, attendeeId) => {
  return await http.delete(`/event/events/${eventId}/attendees/${attendeeId}`);
};
