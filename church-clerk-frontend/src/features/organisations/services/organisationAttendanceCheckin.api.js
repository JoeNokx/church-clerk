import http from "../../../shared/services/http.js";

const SEGMENTS = {
  cell: "cells",
  department: "departments",
  ministry: "ministries",
  group: "groups"
};

const base = (entityType, entityId, attendanceId) =>
  `/organisations/${SEGMENTS[entityType]}/${entityId}/individual-attendances/${attendanceId}/checkin-link`;

export const getOrgCheckInLinkStatus = async (entityType, entityId, attendanceId) => {
  return await http.get(base(entityType, entityId, attendanceId));
};

export const generateOrgCheckInLink = async (entityType, entityId, attendanceId) => {
  return await http.post(`${base(entityType, entityId, attendanceId)}/generate`);
};

export const revokeOrgCheckInLink = async (entityType, entityId, attendanceId) => {
  return await http.delete(`${base(entityType, entityId, attendanceId)}/revoke`);
};
