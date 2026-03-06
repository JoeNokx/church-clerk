import http from "../../../shared/services/http.js";

export const getUnreadNotificationsCount = async () => {
  return await http.get("/notifications/unread-count");
};

export const getMyNotifications = async (params) => {
  return await http.get("/notifications", { params });
};

export const markNotificationRead = async (id) => {
  return await http.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async () => {
  return await http.post("/notifications/read-all");
};
