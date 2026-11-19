import http from "../../../shared/services/http.js";

const B = "/member-care";

// ── Members search (pickers) ──────────────────────────────────────
export const searchCareMembers = (search) => http.get(`${B}/members/search`, { params: { search } });

// ── KPI ────────────────────────────────────────────────────────────
export const getMemberCareKPI = () => http.get(`${B}/stats/kpi`);

// ── Care cases ─────────────────────────────────────────────────────
export const getCareCases = (params = {}, config = {}) => http.get(`${B}/cases`, { params, ...config });
export const getCareCaseById = (id) => http.get(`${B}/cases/${id}`);
export const createCareCase = (data) => http.post(`${B}/cases`, data);
export const updateCareCase = (id, data) => http.put(`${B}/cases/${id}`, data);
export const deleteCareCase = (id) => http.delete(`${B}/cases/${id}`);

// ── Care visits ────────────────────────────────────────────────────
export const getCareVisits = (params = {}, config = {}) => http.get(`${B}/visits`, { params, ...config });
export const getVisitsByCase = (caseId) => http.get(`${B}/cases/${caseId}/visits`);
export const createCareVisit = (caseId, data) => http.post(`${B}/cases/${caseId}/visits`, data);
export const createVisit = (data) => http.post(`${B}/visits`, data);
export const updateCareVisit = (id, data) => http.put(`${B}/visits/${id}`, data);
export const deleteCareVisit = (id) => http.delete(`${B}/visits/${id}`);

// ── Pastoral appointments ─────────────────────────────────────────
export const getPastoralAppointments = (params = {}, config = {}) => http.get(`${B}/pastoral-appointments`, { params, ...config });
export const getPastoralAppointmentStats = () => http.get(`${B}/pastoral-appointments/stats`);
export const getPastoralAppointmentById = (id) => http.get(`${B}/pastoral-appointments/${id}`);
export const createPastoralAppointment = (data) => http.post(`${B}/pastoral-appointments`, data);
export const updatePastoralAppointment = (id, data) => http.put(`${B}/pastoral-appointments/${id}`, data);
export const deletePastoralAppointment = (id) => http.delete(`${B}/pastoral-appointments/${id}`);
