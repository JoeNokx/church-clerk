import http from "../../../shared/services/http.js";

export const getActiveInAppAnnouncements = async () => {
  return await http.get("/in-app-announcements/active");
};

export const markInAppAnnouncementSeen = async (id) => {
  return await http.post(`/in-app-announcements/${id}/seen`, {}, { toastSuccess: false });
};

export const acknowledgeInAppAnnouncement = async (id, { displayType = "modal" } = {}) => {
  return await http.post(`/in-app-announcements/${id}/acknowledge`, { displayType }, { toastSuccess: false });
};

export const dismissInAppAnnouncement = async (id, { displayType = "modal" } = {}) => {
  return await http.post(`/in-app-announcements/${id}/dismiss`, { displayType }, { toastSuccess: false });
};
