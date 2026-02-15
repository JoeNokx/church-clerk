import http from "../../../../shared/services/http.js";

export const uploadEventAttendanceFile = async (eventId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return await http.post(`/event/events/${eventId}/attendance-files`, formData, { timeout: 300000 });
};

export const getEventAttendanceFiles = async (eventId) => {
  return await http.get(`/event/events/${eventId}/attendance-files`);
};

export const updateEventAttendanceFile = async (eventId, fileId, payload) => {
  return await http.put(`/event/events/${eventId}/attendance-files/${fileId}`, payload);
};

export const getEventAttendanceFileDownloadUrl = (eventId, fileId) => {
  const base = String(import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/+$/, "");
  return `${base}/event/events/${eventId}/attendance-files/${fileId}/download`;
};

export const deleteEventAttendanceFile = async (eventId, fileId) => {
  return await http.delete(`/event/events/${eventId}/attendance-files/${fileId}`);
};
