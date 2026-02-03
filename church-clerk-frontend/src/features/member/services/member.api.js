import http from "../../../shared/services/http.js";

export const getMembers = async (params) => {
  return await http.get("/member/members", { params });
};

export const getMember = async (id) => {
  return await http.get(`/member/members/${id}`);
};

export const createMember = async (payload) => {
  return await http.post("/member/members", payload);
};

export const updateMember = async (id, payload) => {
  return await http.put(`/member/members/${id}`, payload);
};

export const deleteMember = async (id) => {
  return await http.delete(`/member/members/${id}`);
};

export const getMembersKPI = async () => {
  return await http.get("/member/members/stats/kpi");
};
