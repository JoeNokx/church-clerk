import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAttendance as apiCreateAttendance,
  createVisitor as apiCreateVisitor,
  deleteAttendance as apiDeleteAttendance,
  deleteVisitor as apiDeleteVisitor,
  getAttendances,
  getVisitors,
  updateAttendance as apiUpdateAttendance,
  updateVisitor as apiUpdateVisitor
} from "../services/attendance.api.js";

export const attendanceQueryKeys = {
  attendancesPrefix: (churchId) => ["attendance", String(churchId || ""), "attendances"],
  attendances: (churchId, filters) => [
    "attendance",
    String(churchId || ""),
    "attendances",
    Number(filters?.page || 1),
    Number(filters?.limit || 10),
    String(filters?.serviceType || ""),
    String(filters?.dateFrom || ""),
    String(filters?.dateTo || "")
  ],
  visitorsPrefix: (churchId) => ["attendance", String(churchId || ""), "visitors"],
  visitors: (churchId, filters) => [
    "attendance",
    String(churchId || ""),
    "visitors",
    "list",
    Number(filters?.page || 1),
    Number(filters?.limit || 10),
    String(filters?.search || "")
  ],
  visitorStats: (churchId) => [
    "attendance",
    String(churchId || ""),
    "visitors",
    "stats"
  ]
};

function buildAttendanceParams(filters) {
  const next = filters || {};

  const params = {
    page: next.page,
    limit: next.limit
  };

  if (next.serviceType) params.serviceType = next.serviceType;
  if (next.dateFrom) params.dateFrom = next.dateFrom;
  if (next.dateTo) params.dateTo = next.dateTo;

  return params;
}

function buildVisitorParams(filters) {
  const next = filters || {};

  const params = {
    page: next.page,
    limit: next.limit
  };

  if (next.search) params.search = next.search;

  return params;
}

export function useAttendancesQuery({ activeChurchId, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: attendanceQueryKeys.attendances(churchId, filters),
    enabled: Boolean(enabled && churchId),
    queryFn: async ({ signal }) => {
      const params = buildAttendanceParams(filters);
      const res = await getAttendances(params, { signal });
      const payload = res?.data?.data ?? res?.data;

      return {
        attendances: Array.isArray(payload?.attendances) ? payload.attendances : [],
        pagination: payload?.pagination || null
      };
    }
  });
}

export function useVisitorsQuery({ activeChurchId, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: attendanceQueryKeys.visitors(churchId, filters),
    enabled: Boolean(enabled && churchId),
    queryFn: async ({ signal }) => {
      const params = buildVisitorParams(filters);
      const res = await getVisitors(params, { signal });
      const payload = res?.data?.data ?? res?.data;

      return {
        visitors: Array.isArray(payload?.visitors) ? payload.visitors : [],
        pagination: payload?.pagination || null,
        stats: payload?.stats || null
      };
    }
  });
}

export function useVisitorStatsQuery({ activeChurchId, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: attendanceQueryKeys.visitorStats(churchId),
    enabled: Boolean(enabled && churchId),
    queryFn: async ({ signal }) => {
      const params = buildVisitorParams({
        page: 1,
        limit: 1,
        search: filters?.search || ""
      });
      const res = await getVisitors(params, { signal });
      const payload = res?.data?.data ?? res?.data;
      return payload?.stats || null;
    }
  });
}

export function useAttendanceMutations(activeChurchId) {
  const queryClient = useQueryClient();
  const churchId = activeChurchId || "";

  const invalidateAttendances = async () => {
    if (!churchId) return;
    await queryClient.invalidateQueries({
      queryKey: attendanceQueryKeys.attendancesPrefix(churchId),
      exact: false
    });
  };

  const createAttendance = useMutation({
    mutationFn: async (payload) => {
      return await apiCreateAttendance(payload);
    },
    onSuccess: invalidateAttendances
  });

  const updateAttendance = useMutation({
    mutationFn: async ({ id, payload }) => {
      return await apiUpdateAttendance(id, payload);
    },
    onSuccess: invalidateAttendances
  });

  const deleteAttendance = useMutation({
    mutationFn: async (id) => {
      return await apiDeleteAttendance(id);
    },
    onSuccess: invalidateAttendances
  });

  return {
    createAttendance,
    updateAttendance,
    deleteAttendance,
    invalidateAttendances
  };
}

export function useVisitorMutations(activeChurchId) {
  const queryClient = useQueryClient();
  const churchId = activeChurchId || "";

  const invalidateVisitors = async () => {
    if (!churchId) return;

    await queryClient.invalidateQueries({
      queryKey: attendanceQueryKeys.visitorsPrefix(churchId),
      exact: false
    });

    await queryClient.invalidateQueries({
      queryKey: attendanceQueryKeys.visitorStats(churchId),
      exact: false
    });
  };

  const createVisitor = useMutation({
    mutationFn: async (payload) => {
      return await apiCreateVisitor(payload);
    },
    onSuccess: invalidateVisitors
  });

  const updateVisitor = useMutation({
    mutationFn: async ({ id, payload }) => {
      return await apiUpdateVisitor(id, payload);
    },
    onSuccess: invalidateVisitors
  });

  const deleteVisitor = useMutation({
    mutationFn: async (id) => {
      return await apiDeleteVisitor(id);
    },
    onSuccess: invalidateVisitors
  });

  return {
    createVisitor,
    updateVisitor,
    deleteVisitor,
    invalidateVisitors
  };
}
