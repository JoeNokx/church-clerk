import axios from "axios";
import NProgress from "nprogress";
import { showError, showSuccess } from "../../utils/toast.js";

let pendingRequests = 0;
let pendingRoutes = 0;

const AUTH_TOKEN_KEY = "cckAuthToken";

function getStoredAuthToken() {
  if (typeof window === "undefined") return "";
  const ls = String(localStorage.getItem(AUTH_TOKEN_KEY) || "");
  if (ls) return ls;
  return String(sessionStorage.getItem(AUTH_TOKEN_KEY) || "");
}

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

    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

    const method = String(response?.config?.method || "get").toLowerCase();
    const shouldToastSuccess = method !== "get" && response?.config?.toastSuccess !== false;
    if (shouldToastSuccess) {
      const msg =
        typeof response?.data?.message === "string" && response.data.message.trim()
          ? response.data.message
          : "Operation successful";
      showSuccess(msg);
    }

    return response;
  },
  (error) => {
    stopProgress();

    if (error?.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

    const data = error?.response?.data;
    const backendMsg =
      (typeof data?.message === "string" && data.message.trim() ? data.message : "") ||
      (Array.isArray(data?.errors) && data.errors.length
        ? String(data.errors[0]?.message || data.errors[0] || "")
        : "") ||
      (typeof data?.error === "string" && data.error.trim() ? data.error : "") ||
      "Request failed";

    if (error?.config?.toastError !== false) {
      showError(backendMsg);
    }

    if (error.response?.status === 401) {
      // Let AuthContext + ProtectedRoute handle it
      localStorage.removeItem("activeChurch");
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    }

    return Promise.reject(error);
  }
);

export default api;
