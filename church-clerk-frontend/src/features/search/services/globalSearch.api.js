import http from "../../../shared/services/http.js";

export const globalSearch = async (q, signal) => {
  return await http.get("/search", {
    params: { q },
    signal,
    toastError: false,
  });
};
