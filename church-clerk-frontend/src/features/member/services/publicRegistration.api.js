import publicHttp from "../../../shared/services/publicHttp.js";

export const getChurchInfoByToken = async (token) => {
  return await publicHttp.get(`/public/token/${token}`);
};

export const submitSelfRegistration = async (token, payload) => {
  return await publicHttp.post(`/public/token/${token}/register`, payload);
};
