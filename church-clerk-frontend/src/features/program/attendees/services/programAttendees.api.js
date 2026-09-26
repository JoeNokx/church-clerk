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
