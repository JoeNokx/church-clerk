import api from "./axios";

export const getMembers = (churchId) => {
  return api.get("/members", {
    headers: {
      "x-active-church": churchId
    }
  });
};
