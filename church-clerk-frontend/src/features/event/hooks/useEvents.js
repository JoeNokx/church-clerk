import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getEvents as apiGetEvents, getEventStats as apiGetEventStats } from "../services/event.api.js";

export const eventQueryKeys = {
  eventsPrefix: (churchId) => ["events", String(churchId || "")],
  events: (churchId, status, filters) => [
    "events",
    String(churchId || ""),
    "list",
    String(status || ""),
    Number(filters?.page || 1),
    Number(filters?.limit || 10),
    String(filters?.search || ""),
    String(filters?.category || "")
  ],
  stats: (churchId, filters) => [
    "events",
    String(churchId || ""),
    "stats",
    String(filters?.search || ""),
    String(filters?.category || "")
  ]
};

function buildEventsParams(status, filters) {
  const next = filters || {};

  const params = {
    page: next.page,
    limit: next.limit,
    status
  };

  if (next.search) params.search = next.search;
  if (next.category) params.category = next.category;

  return params;
}

function buildStatsParams(filters) {
  const next = filters || {};
  const params = {};
  if (next.search) params.search = next.search;
  if (next.category) params.category = next.category;
  return params;
}

export function useEventsListQuery({ activeChurchId, status, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: eventQueryKeys.events(churchId, status, filters),
    enabled: Boolean(enabled && churchId && status),
    queryFn: async ({ signal }) => {
      const params = buildEventsParams(status, filters);
      const res = await apiGetEvents(params, { signal });
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      return data || {};
    }
  });
}

export function useEventStatsQuery({ activeChurchId, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: eventQueryKeys.stats(churchId, filters),
    enabled: Boolean(enabled && churchId),
    queryFn: async ({ signal }) => {
      const params = buildStatsParams(filters);
      const res = await apiGetEventStats(params, { signal });
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      return data?.stats || data || null;
    }
  });
}

export function useEventQueryInvalidation(activeChurchId) {
  const queryClient = useQueryClient();
  const churchId = activeChurchId || "";

  const invalidateEvents = async () => {
    if (!churchId) return;
    await queryClient.invalidateQueries({
      queryKey: eventQueryKeys.eventsPrefix(churchId),
      exact: false
    });
  };

  return {
    invalidateEvents
  };
}
