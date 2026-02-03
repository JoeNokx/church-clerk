import axios from "axios";

const apiRoot = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/v1\/?$/, "");

const adminHttp = axios.create({
  baseURL: apiRoot,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

export const getPlans = async () => {
  return await adminHttp.get("/api/admin/billing/plans");
};

export const createPlan = async (payload) => {
  return await adminHttp.post("/api/admin/billing/plans", payload);
};

export const updatePlan = async (id, payload) => {
  return await adminHttp.put(`/api/admin/billing/plans/${id}`, payload);
};

export const deletePlan = async (id) => {
  return await adminHttp.delete(`/api/admin/billing/plans/${id}`);
};

export const getSubscriptions = async () => {
  return await adminHttp.get("/api/admin/billing/subscriptions");
};
