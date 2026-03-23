import axios from "axios";
import { showError, showSuccess } from "../../utils/toast.js";

const envBaseURL = import.meta.env.VITE_API_BASE_URL;

let baseURL = envBaseURL || "/api/v1";

if (import.meta.env.DEV && typeof baseURL === "string" && /^https?:\/\//i.test(baseURL)) {
  try {
    const u = new URL(baseURL);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      baseURL = "/api/v1";
    }
  } catch {
    baseURL = "/api/v1";
  }
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 300000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use(
  (config) => {
    config.headers["x-client-app"] = "system-admin";

    const inViewChurchMode = localStorage.getItem("systemAdminViewChurch") === "1";
    const activeChurch = localStorage.getItem("systemAdminActiveChurch");

    if (inViewChurchMode && activeChurch) {
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
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
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
    if (error?.code !== "ERR_CANCELED") {
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
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("systemAdminActiveChurch");
      localStorage.removeItem("systemAdminViewChurch");
      localStorage.removeItem("adminViewChurch");
    }
    return Promise.reject(error);
  }
);

export default api;
