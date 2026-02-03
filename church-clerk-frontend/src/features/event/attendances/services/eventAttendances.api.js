import http from "../../../../shared/services/http.js";

export const createTotalEventAttendance = async (eventId, payload) => {
  return await http.post(`/event/events/${eventId}/attendances`, payload);
};

export const getAllTotalEventAttendances = async (eventId, params) => {
  return await http.get(`/event/events/${eventId}/attendances`, { params });
};

export const updateTotalEventAttendance = async (eventId, attendanceId, payload) => {
  return await http.put(`/event/events/${eventId}/attendances/${attendanceId}`, payload);
};

export const deleteTotalEventAttendance = async (eventId, attendanceId) => {
  return await http.delete(`/event/events/${eventId}/attendances/${attendanceId}`);
};
