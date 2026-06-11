import http from "../../../shared/services/http.js";

export const getEvents = async (params, config = {}) => {
  return await http.get("/event/events", { params, ...(config || {}) });
};

export const getEventStats = async (params, config = {}) => {
  return await http.get("/event/events/stats", { params, ...(config || {}) });
};

export const getUpcomingEvents = async (params, { churchId } = {}) => {
  return await getEvents({ ...(params || {}), status: "upcoming" }, churchId ? { headers: { "x-active-church": churchId } } : {});
};

export const getOngoingEvents = async (params) => {
  return await getEvents({ ...(params || {}), status: "ongoing" });
};

export const getPastEvents = async (params) => {
  return await getEvents({ ...(params || {}), status: "past" });
};

export const getEvent = async (id) => {
  return await http.get(`/event/events/${id}`);
};

export const createEvent = async (payload) => {
  return await http.post("/event/events", payload);
};

export const updateEvent = async (id, payload) => {
  return await http.put(`/event/events/${id}`, payload);
};

export const deleteEvent = async (id) => {
  return await http.delete(`/event/events/${id}`);
};
