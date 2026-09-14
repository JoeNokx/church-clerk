import http from "../../../shared/services/http.js";

export const getDepartments = async (params) => {
  return await http.get("/organisations/departments", { params });
};

export const getDepartment = async (id) => {
  return await http.get(`/organisations/departments/${id}`);
};

export const createDepartment = async (payload) => {
  return await http.post("/organisations/departments", payload);
};

export const updateDepartment = async (id, payload) => {
  return await http.put(`/organisations/departments/${id}`, payload);
};

export const deleteDepartment = async (id) => {
  return await http.delete(`/organisations/departments/${id}`);
};

export const addDepartmentMember = async (id, payload) => {
  return await http.post(`/organisations/departments/${id}/members`, payload);
};

export const searchDepartmentMembersToAdd = async (id, params) => {
  return await http.get(`/organisations/departments/${id}/members/search`, { params });
};

export const getDepartmentMembers = async (id, params) => {
  return await http.get(`/organisations/departments/${id}/members`, { params });
};

export const updateDepartmentMemberRole = async (id, memberId, payload) => {
  return await http.put(`/organisations/departments/${id}/members/${memberId}`, payload);
};

export const removeDepartmentMember = async (id, memberId) => {
  return await http.delete(`/organisations/departments/${id}/members/${memberId}`);
};

export const addDepartmentMeeting = async (id, payload) => {
  return await http.post(`/organisations/departments/${id}/meetings`, payload);
};

export const getDepartmentMeetings = async (id, params) => {
  return await http.get(`/organisations/departments/${id}/meetings`, { params });
};

export const updateDepartmentMeeting = async (id, meetingId, payload) => {
  return await http.put(`/organisations/departments/${id}/meetings/${meetingId}`, payload);
};

export const deleteDepartmentMeeting = async (id, meetingId) => {
  return await http.delete(`/organisations/departments/${id}/meetings/${meetingId}`);
};

export const createDepartmentAttendance = async (departmentId, payload) => {
  return await http.post(`/organisations/departments/${departmentId}/attendances`, payload);
};

export const getDepartmentAttendances = async (departmentId, params) => {
  return await http.get(`/organisations/departments/${departmentId}/attendances`, { params });
};

export const updateDepartmentAttendance = async (departmentId, attendanceId, payload) => {
  return await http.put(`/organisations/departments/${departmentId}/attendances/${attendanceId}`, payload);
};

export const deleteDepartmentAttendance = async (departmentId, attendanceId) => {
  return await http.delete(`/organisations/departments/${departmentId}/attendances/${attendanceId}`);
};

export const createDepartmentOffering = async (departmentId, payload) => {
  return await http.post(`/organisations/departments/${departmentId}/offerings`, payload);
};

export const getDepartmentOfferings = async (departmentId, params) => {
  return await http.get(`/organisations/departments/${departmentId}/offerings`, { params });
};

export const updateDepartmentOffering = async (departmentId, offeringId, payload) => {
  return await http.put(`/organisations/departments/${departmentId}/offerings/${offeringId}`, payload);
};

export const deleteDepartmentOffering = async (departmentId, offeringId) => {
  return await http.delete(`/organisations/departments/${departmentId}/offerings/${offeringId}`);
};

export const getDepartmentKPI = async () => {
  return await http.get("/organisations/departments/stats/kpi");
};
