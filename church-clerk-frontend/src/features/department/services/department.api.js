import http from "../../../shared/services/http.js";

export const getDepartments = async (params) => {
  return await http.get("/department/departments", { params });
};

export const getDepartment = async (id) => {
  return await http.get(`/department/departments/${id}`);
};

export const createDepartment = async (payload) => {
  return await http.post("/department/departments", payload);
};

export const updateDepartment = async (id, payload) => {
  return await http.put(`/department/departments/${id}`, payload);
};

export const deleteDepartment = async (id) => {
  return await http.delete(`/department/departments/${id}`);
};
