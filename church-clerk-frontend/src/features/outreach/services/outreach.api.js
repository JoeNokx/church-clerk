import http from "../../../shared/services/http.js";

const B = "/outreach";

// ── Events ────────────────────────────────────────────────────────
export const getOutreachKPI = () => http.get(`${B}/events/kpi`);
export const getOutreachEvents = (params = {}) => http.get(`${B}/events`, { params });
export const getOutreachEventById = (id) => http.get(`${B}/events/${id}`);
export const createOutreachEvent = (data) => http.post(`${B}/events`, data);
export const updateOutreachEvent = (id, data) => http.put(`${B}/events/${id}`, data);
export const deleteOutreachEvent = (id) => http.delete(`${B}/events/${id}`);

// ── Prospects (cross-event) ───────────────────────────────────────
export const getAllProspects = (params = {}) => http.get(`${B}/prospects`, { params });
export const getProspectById = (id) => http.get(`${B}/prospects/${id}`);
export const checkDuplicate = (params = {}) => http.get(`${B}/prospects/check-duplicate`, { params });
export const updateProspectDirect = (id, data) => http.put(`${B}/prospects/${id}`, data);
export const deleteProspectDirect = (id) => http.delete(`${B}/prospects/${id}`);
export const assignFollowUpWorker = (id, data) => http.post(`${B}/prospects/${id}/assign-worker`, data);
export const convertToMember = (id, data = {}) => http.post(`${B}/prospects/${id}/convert-to-member`, data);
export const markAsVisitor = (id, data = {}) => http.post(`${B}/prospects/${id}/mark-as-visitor`, data);

// ── Prospects (nested under events) ──────────────────────────────
export const getProspectsByEvent = (eventId, params = {}) =>
  http.get(`${B}/events/${eventId}/prospects`, { params });
export const createProspect = (eventId, data) =>
  http.post(`${B}/events/${eventId}/prospects`, data);
export const createProspectDirect = (data) =>
  http.post(`${B}/prospects`, data);
export const updateProspect = (eventId, prospectId, data) =>
  http.put(`${B}/events/${eventId}/prospects/${prospectId}`, data);
export const deleteProspect = (eventId, prospectId) =>
  http.delete(`${B}/events/${eventId}/prospects/${prospectId}`);

// ── Follow-ups ────────────────────────────────────────────────────
export const getFollowUpsStats = () => http.get(`${B}/follow-ups/stats`);
export const getAllFollowUps = (params = {}) => http.get(`${B}/follow-ups`, { params });
export const getFollowUpsByEvent = (eventId, params = {}) =>
  http.get(`${B}/events/${eventId}/follow-ups`, { params });
export const getFollowUpsByProspect = (prospectId) =>
  http.get(`${B}/prospects/${prospectId}/follow-ups`);
export const createFollowUp = (prospectId, data) =>
  http.post(`${B}/prospects/${prospectId}/follow-ups`, data);
export const updateFollowUp = (followUpId, data) =>
  http.put(`${B}/follow-ups/${followUpId}`, data);
export const deleteFollowUp = (followUpId) =>
  http.delete(`${B}/follow-ups/${followUpId}`);

// ── Analytics & Teams ─────────────────────────────────────────────
export const getOutreachAnalytics = (params = {}) => http.get(`${B}/analytics`, { params });
export const getTeamStats = () => http.get(`${B}/teams/stats`);

// ── Outreach Teams ────────────────────────────────────────────────
export const getOutreachTeams = (params = {}) => http.get(`${B}/outreach-teams`, { params });
export const createOutreachTeam = (data) => http.post(`${B}/outreach-teams`, data);
export const updateOutreachTeam = (teamId, data) => http.put(`${B}/outreach-teams/${teamId}`, data);
export const deleteOutreachTeam = (teamId) => http.delete(`${B}/outreach-teams/${teamId}`);
