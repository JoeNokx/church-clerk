import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getPrograms as apiGetPrograms, getProgramStats as apiGetProgramStats } from "../services/program.api.js";

export const programQueryKeys = {
  programsPrefix: (churchId) => ["programs", String(churchId || "")],
  programs: (churchId, status, filters) => [
    "programs",
    String(churchId || ""),
    "list",
    String(status || ""),
    Number(filters?.page || 1),
    Number(filters?.limit || 10),
    String(filters?.search || ""),
    String(filters?.category || "")
  ],
  stats: (churchId, filters) => [
    "programs",
    String(churchId || ""),
    "stats",
    String(filters?.search || ""),
    String(filters?.category || "")
  ]
};

function buildProgramsParams(status, filters) {
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

export function useProgramsListQuery({ activeChurchId, status, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: programQueryKeys.programs(churchId, status, filters),
    enabled: Boolean(enabled && churchId && status),
    queryFn: async ({ signal }) => {
      const params = buildProgramsParams(status, filters);
      const res = await apiGetPrograms(params, { signal });
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      return data || {};
    }
  });
}

export function useProgramStatsQuery({ activeChurchId, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: programQueryKeys.stats(churchId, filters),
    enabled: Boolean(enabled && churchId),
    queryFn: async ({ signal }) => {
      const params = buildStatsParams(filters);
      const res = await apiGetProgramStats(params, { signal });
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      return data?.stats || data || null;
    }
  });
}

export function useProgramQueryInvalidation(activeChurchId) {
  const queryClient = useQueryClient();
  const churchId = activeChurchId || "";

  const invalidatePrograms = async () => {
    if (!churchId) return;
    await queryClient.invalidateQueries({
      queryKey: programQueryKeys.programsPrefix(churchId),
      exact: false
    });
  };

  return {
    invalidatePrograms
  };
}
