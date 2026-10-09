import axios from "axios";
import NProgress from "nprogress";
import { showError, showSuccess } from "../../utils/toast.js";

let pendingRequests = 0;
let pendingRoutes = 0;

let csrfToken = "";
let csrfTokenPromise = null;

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

async function fetchCsrfToken() {
  if (csrfToken) return csrfToken;
  if (csrfTokenPromise) return csrfTokenPromise;

  csrfTokenPromise = api
    .get("/csrf-token", { skipCsrf: true, toastError: false })
    .then((res) => {
      const token = String(res?.data?.csrfToken || "").trim();
      csrfToken = token;
      return csrfToken;
    })
    .catch(() => "")
    .finally(() => {
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
}

// Eagerly warm up the CSRF cookie + token on page load
if (typeof window !== "undefined") {
  fetchCsrfToken().catch(() => {});
}

const GEO_CACHE_KEY = "cckClientLocation";
const GEO_SRC_KEY = "cckClientLocationSrc";

function getClientLocation() {
  if (typeof window === "undefined") return "";
  try {
    return String(sessionStorage.getItem(GEO_CACHE_KEY) || "");
  } catch {
    return "";
  }
}

// Resolve the user's real location once per session.
// Prefers browser geolocation (GPS/WiFi — the user's actual position). When only an
// IP-derived value is cached, geolocation is still attempted to upgrade accuracy.
if (typeof window !== "undefined") {
  try {
    const save = (value, src) => {
      if (!value) return;
      sessionStorage.setItem(GEO_CACHE_KEY, value.slice(0, 120));
      sessionStorage.setItem(GEO_SRC_KEY, src);
    };
    const tryIpwho = () =>
      fetch("https://ipwho.is/", { credentials: "omit" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.success === false) return;
          save([String(d?.city || "").trim(), String(d?.country || "").trim()].filter(Boolean).join(", "), "ip");
        })
        .catch(() => {});
    const tryIpapi = () =>
      fetch("https://ipapi.co/json/", { credentials: "omit" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const value = [String(data?.city || "").trim(), String(data?.country_name || "").trim()].filter(Boolean).join(", ");
          if (value) return save(value, "ip");
          return tryIpwho();
        })
        .catch(() => tryIpwho());
    const tryGeolocation = () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000, maximumAge: 86400000 });
      });
    const reverseGeocode = (pos) => {
      const { latitude, longitude } = pos.coords;
      return fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`, { credentials: "omit" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const city = String(d?.city || d?.locality || "").trim();
          const country = String(d?.countryName || "").trim();
          return [city, country].filter(Boolean).join(", ");
        })
        .catch(() => "");
    };

    const cachedSrc = sessionStorage.getItem(GEO_SRC_KEY);
    if (cachedSrc !== "gps") {
      tryGeolocation()
        .then((pos) => {
          if (!pos) return sessionStorage.getItem(GEO_CACHE_KEY) ? null : tryIpapi();
          return reverseGeocode(pos).then((value) => {
            if (value) return save(value, "gps");
            return sessionStorage.getItem(GEO_CACHE_KEY) ? null : tryIpapi();
          });
        })
        .catch(() => {
          if (!sessionStorage.getItem(GEO_CACHE_KEY)) tryIpapi();
        });
    }
  } catch {
    // sessionStorage unavailable — skip geo header
  }
}

// Request interceptor: attach activeChurch if exists
api.interceptors.request.use(
  async (config) => {
    startProgress();
    // Active church from localStorage (respect explicit per-request override)
    if (!config.headers["x-active-church"]) {
      const activeChurch = localStorage.getItem("activeChurch");
      if (activeChurch) {
        config.headers["x-active-church"] = activeChurch;
      }
    }

    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const clientLocation = getClientLocation();
    if (clientLocation && !config.headers["x-client-location"]) {
      config.headers["x-client-location"] = clientLocation;
    }

    if (typeof FormData !== "undefined" && config?.data instanceof FormData) {
      if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    const method = String(config?.method || "get").toLowerCase();
    const isStateChanging = ["post", "put", "patch", "delete"].includes(method);
    if (isStateChanging && config?.skipCsrf !== true) {
      const token = await fetchCsrfToken();
      if (token) {
        config.headers = config.headers || {};
        if (!config.headers["CSRF-Token"] && !config.headers["csrf-token"]) {
          config.headers["CSRF-Token"] = token;
        }
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

    if (response.status === 202 && response.data?.status === "PENDING_APPROVAL") {
      window.dispatchEvent(new CustomEvent("backdatePendingApproval", { detail: response.data }));
      return response;
    }

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
  async (error) => {
    stopProgress();

    if (error?.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

    // Auto-retry once on CSRF 403 with a fresh token (before showing any toast)
    if (error?.response?.status === 403) {
      const msg403 = String(error?.response?.data?.message || "").toLowerCase();
      if (msg403.includes("csrf") && !error.config?._csrfRetried) {
        csrfToken = "";
        error.config._csrfRetried = true;
        try {
          const freshToken = await fetchCsrfToken();
          if (freshToken) {
            error.config.headers["CSRF-Token"] = freshToken;
          }
          return api.request(error.config);
        } catch {
          // retry failed — fall through to show error
        }
      }
    }

    const data = error?.response?.data;
    const backendMsg =
      (typeof data?.message === "string" && data.message.trim() ? data.message : "") ||
      (Array.isArray(data?.errors) && data.errors.length
        ? String(data.errors[0]?.message || data.errors[0] || "")
        : "") ||
      (typeof data?.error === "string" && data.error.trim() ? data.error : "") ||
      "Request failed";

    const isNotFound =
      error?.response?.status === 404 &&
      backendMsg.toLowerCase().endsWith("not found");
    // 401 is always handled by AuthContext + ProtectedRoute (redirect to login).
    // Never toast it — it creates confusing "Not authorized" flashes on page load
    // when a session simply doesn't exist yet.
    const is401 = error?.response?.status === 401;
    if (error?.config?.toastError !== false && !isNotFound && !is401) {
      showError(backendMsg);
    }

    if (error?.response?.status === 403) {
      const msg = String(data?.message || "").toLowerCase();
      if (msg.includes("csrf")) {
        csrfToken = "";
      }
    }

    if (error.response?.status === 401) {
      // Let AuthContext + ProtectedRoute handle it
      localStorage.removeItem("activeChurch");
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    }

    if (error.response?.status === 402 && error.response?.data?.locked) {
      window.dispatchEvent(new CustomEvent("subscriptionLocked", {
        detail: { message: error.response.data.message || "Your subscription is suspended. Please contact support." }
      }));
    }

    if (error.response?.status === 405) {
      const method = String(error?.config?.method || "").toLowerCase();
      if (method === "put" || method === "patch") {
        let patchData = {};
        try { patchData = JSON.parse(error.config?.data || "{}"); } catch { patchData = {}; }
        window.dispatchEvent(new CustomEvent("adjustmentRequired", {
          detail: {
            resourceUrl: error.config?.url || "",
            patch: patchData,
            message: error.response?.data?.message || "Direct edits are not allowed. Submit an adjustment request."
          }
        }));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
