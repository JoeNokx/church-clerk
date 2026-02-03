import http from "../../../shared/services/http.js";

export const getAnnouncements = async (params) => {
  return await http.get("/announcement/announcements", { params });
};

export const getAnnouncement = async (id) => {
  return await http.get(`/announcement/announcements/${id}`);
};

export const createAnnouncement = async (payload) => {
  return await http.post("/announcement/announcements", payload);
};

export const updateAnnouncement = async (id, payload) => {
  return await http.put(`/announcement/announcements/${id}`, payload);
};

export const deleteAnnouncement = async (id) => {
  return await http.delete(`/announcement/announcements/${id}`);
};
