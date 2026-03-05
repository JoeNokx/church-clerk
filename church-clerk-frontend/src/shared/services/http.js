import axios from "axios";
import NProgress from "nprogress";

let pendingRequests = 0;
let pendingRoutes = 0;

function startProgress() {
  pendingRequests += 1;
  NProgress.start();
}

function stopProgress() {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0 && pendingRoutes === 0) {
    NProgress.done();
  }
}

export function startRouteProgress() {
  pendingRoutes += 1;
  NProgress.start();
}

export function stopRouteProgress() {
  pendingRoutes = Math.max(0, pendingRoutes - 1);
  if (pendingRoutes === 0 && pendingRequests === 0) {
    NProgress.done();
  }
}

// Create an axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // from .env
  withCredentials: true,                      // send cookies automatically
  timeout: 300000,                             // optional: 5 minutes timeout
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor: attach activeChurch if exists
api.interceptors.request.use(
  (config) => {
    startProgress();
    // Active church from localStorage
    const activeChurch = localStorage.getItem("activeChurch");
    if (activeChurch) {
      config.headers["x-active-church"] = activeChurch;
    }

    if (typeof FormData !== "undefined" && config?.data instanceof FormData) {
      if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    return config;
  },
  (error) => {
    stopProgress();
    return Promise.reject(error);
  }
);

// Response interceptor: handle global errors
api.interceptors.response.use(
  (response) => {
    stopProgress();
    return response;
  },
  (error) => {
    stopProgress();
    if (error.response?.status === 401) {
      // Let AuthContext + ProtectedRoute handle it
      localStorage.removeItem("activeChurch");
    }

    return Promise.reject(error);
  }
);

export default api;
