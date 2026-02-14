import axios from "axios";

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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("systemAdminActiveChurch");
      localStorage.removeItem("systemAdminViewChurch");
      localStorage.removeItem("adminViewChurch");
    }
    return Promise.reject(error);
  }
);

export default api;
