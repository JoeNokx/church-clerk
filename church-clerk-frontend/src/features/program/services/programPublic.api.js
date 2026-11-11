import publicHttp from "../../../shared/services/publicHttp.js";

export const getProgramInfoByToken = async (token) => {
  return await publicHttp.get(`/public/program/${token}`);
};

export const submitAdvanceRegistration = async (token, payload) => {
  return await publicHttp.post(`/public/program/${token}/register`, payload);
};

export const searchProgramMembers = async (token, q) => {
  return await publicHttp.get(`/public/program/${token}/member-search`, { params: { q } });
};

export const getProgramCheckInInfo = async (token) => {
  return await publicHttp.get(`/public/program-checkin/${token}`);
};

export const searchCheckInMembers = async (token, q) => {
  return await publicHttp.get(`/public/program-checkin/${token}/member-search`, { params: { q } });
};

export const submitProgramCheckIn = async (token, payload) => {
  return await publicHttp.post(`/public/program-checkin/${token}/check-in`, payload);
};
