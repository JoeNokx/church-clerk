import http from "../../../../shared/services/http.js";

export const uploadProgramAttendanceFile = async (programId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return await http.post(`/program/programs/${programId}/attendance-files`, formData, { timeout: 300000 });
};

export const getProgramAttendanceFiles = async (programId) => {
  return await http.get(`/program/programs/${programId}/attendance-files`);
};

export const updateProgramAttendanceFile = async (programId, fileId, payload) => {
  return await http.put(`/program/programs/${programId}/attendance-files/${fileId}`, payload);
};

export const getProgramAttendanceFileDownloadUrl = (programId, fileId) => {
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/program/programs/${programId}/attendance-files/${fileId}/download`;
};

export const deleteProgramAttendanceFile = async (programId, fileId) => {
  return await http.delete(`/program/programs/${programId}/attendance-files/${fileId}`);
};
