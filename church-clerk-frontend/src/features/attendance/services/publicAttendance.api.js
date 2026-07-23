import publicHttp from "../../../shared/services/publicHttp.js";

export const getAttendanceInfoByToken = async (token) => {
  return await publicHttp.get(`/public/attendance/${token}`);
};

export const submitAttendanceCheckIn = async (token, payload) => {
  return await publicHttp.post(`/public/attendance/${token}/check-in`, payload);
};
