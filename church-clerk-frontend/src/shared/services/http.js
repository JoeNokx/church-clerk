import axios from "axios";

// Create an axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // from .env
  withCredentials: true,                      // send cookies automatically
  timeout: 10000,                             // optional: 10s timeout
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor: attach activeChurch if exists
api.interceptors.request.use(
  (config) => {
    // Active church from localStorage
    const activeChurch = localStorage.getItem("activeChurch");
    if (activeChurch) {
      config.headers["x-active-church"] = activeChurch;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Let AuthContext + ProtectedRoute handle it
      localStorage.removeItem("activeChurch");
    }

    return Promise.reject(error);
  }
);

export default api;
