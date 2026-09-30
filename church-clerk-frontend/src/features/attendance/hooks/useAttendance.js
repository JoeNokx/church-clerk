import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createVisitor as apiCreateVisitor,
  deleteVisitor as apiDeleteVisitor,
  getVisitors,
  updateVisitor as apiUpdateVisitor
} from "../services/attendance.api.js";

export const attendanceQueryKeys = {
  visitorsPrefix: (churchId) => ["attendance", String(churchId || ""), "visitors"],
  visitors: (churchId, filters) => [
    "attendance",
    String(churchId || ""),
    "visitors",
    "list",
    Number(filters?.page || 1),
    Number(filters?.limit || 10),
    String(filters?.search || ""),
    String(filters?.source || ""),
    String(filters?.dateFrom || ""),
    String(filters?.dateTo || ""),
    String(filters?.attendance || "")
  ],
  visitorStats: (churchId) => [
    "attendance",
    String(churchId || ""),
    "visitors",
    "stats"
  ]
};

function buildVisitorParams(filters) {
  const next = filters || {};

  const params = {
    page: next.page,
    limit: next.limit
  };

  if (next.search) params.search = next.search;
  if (next.source) params.source = next.source;
  if (next.dateFrom) params.dateFrom = next.dateFrom;
  if (next.dateTo) params.dateTo = next.dateTo;
  if (next.attendance) params.attendance = next.attendance;

  return params;
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
