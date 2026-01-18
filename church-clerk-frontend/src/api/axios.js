import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5100/api",
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const activeChurch = localStorage.getItem("activeChurch");
  if (activeChurch) {
    config.headers["x-active-church"] = activeChurch;
  }

  return config;
});

export default api;
