import publicHttp from "../../../shared/services/publicHttp.js";

export const getSelfCheckInInfo = async (token) => {
  return await publicHttp.get(`/public/attendance-self/${token}`);
};

export const submitSelfCheckIn = async (token, payload) => {
  return await publicHttp.post(`/public/attendance-self/${token}/check-in`, payload);
};

export const getOrgAttendanceInfoByToken = async (token) => {
  return await publicHttp.get(`/public/attendance/org/${token}`);
};

export const submitOrgAttendanceCheckIn = async (token, payload) => {
  return await publicHttp.post(`/public/attendance/org/${token}/check-in`, payload);
};
