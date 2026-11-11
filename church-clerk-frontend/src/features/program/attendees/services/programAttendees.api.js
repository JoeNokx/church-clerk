import http from "../../../../shared/services/http.js";

export const createProgramAttendee = async (programId, payload) => {
  return await http.post(`/program/programs/${programId}/attendees`, payload);
};

export const getProgramAttendees = async (programId, params) => {
  return await http.get(`/program/programs/${programId}/attendees`, { params });
};

export const updateProgramAttendee = async (programId, attendeeId, payload) => {
  return await http.put(`/program/programs/${programId}/attendees/${attendeeId}`, payload);
};

export const deleteProgramAttendee = async (programId, attendeeId) => {
  return await http.delete(`/program/programs/${programId}/attendees/${attendeeId}`);
};

export const getAdvanceRegLink = async (programId) => {
  return await http.get(`/program/programs/${programId}/advance-registration/link`);
};

export const generateAdvanceRegLink = async (programId) => {
  return await http.post(`/program/programs/${programId}/advance-registration/link/generate`, {});
};

export const revokeAdvanceRegLink = async (programId) => {
  return await http.delete(`/program/programs/${programId}/advance-registration/link/revoke`);
};

export const getAdvanceRegQr = async (programId) => {
  return await http.get(`/program/programs/${programId}/advance-registration/qr`);
};

export const generateAdvanceRegQr = async (programId) => {
  return await http.post(`/program/programs/${programId}/advance-registration/qr/generate`, {});
};

export const revokeAdvanceRegQr = async (programId) => {
  return await http.delete(`/program/programs/${programId}/advance-registration/qr/revoke`);
};

export const getCheckInLink = async (programId) => {
  return await http.get(`/program/programs/${programId}/check-in/link`);
};

export const generateCheckInLink = async (programId) => {
  return await http.post(`/program/programs/${programId}/check-in/link/generate`, {});
};

export const revokeCheckInLink = async (programId) => {
  return await http.delete(`/program/programs/${programId}/check-in/link/revoke`);
};

export const getCheckInQr = async (programId) => {
  return await http.get(`/program/programs/${programId}/check-in/qr`);
};

export const generateCheckInQr = async (programId) => {
  return await http.post(`/program/programs/${programId}/check-in/qr/generate`, {});
};

export const revokeCheckInQr = async (programId) => {
  return await http.delete(`/program/programs/${programId}/check-in/qr/revoke`);
};

export const ensureGuestVisitor = async (programId, attendeeId) => {
  return await http.post(`/program/programs/${programId}/attendees/${attendeeId}/ensure-visitor`, {});
};
