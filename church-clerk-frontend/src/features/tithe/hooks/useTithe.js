import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTitheAggregate as apiCreateTitheAggregate,
  createTitheIndividual as apiCreateTitheIndividual,
  deleteTitheAggregate as apiDeleteTitheAggregate,
  deleteTitheIndividual as apiDeleteTitheIndividual,
  getTitheAggregateKPI as apiGetTitheAggregateKPI,
  getTitheAggregates as apiGetTitheAggregates,
  getTitheIndividualKPI as apiGetTitheIndividualKPI,
  getTitheIndividuals as apiGetTitheIndividuals,
  updateTitheAggregate as apiUpdateTitheAggregate,
  updateTitheIndividual as apiUpdateTitheIndividual
} from "../services/tithe.api.js";

export const titheQueryKeys = {
  individualsPrefix: (churchId) => ["tithe", String(churchId || ""), "individuals"],
  individuals: (churchId, filters) => [
    "tithe",
    String(churchId || ""),
    "individuals",
    Number(filters?.page || 1),
    Number(filters?.limit || 10),
    String(filters?.search || ""),
    String(filters?.dateFrom || ""),
    String(filters?.dateTo || "")
  ],
  aggregatesPrefix: (churchId) => ["tithe", String(churchId || ""), "aggregates"],
  aggregates: (churchId, filters) => [
    "tithe",
    String(churchId || ""),
    "aggregates",
    Number(filters?.page || 1),
    Number(filters?.limit || 10),
    String(filters?.search || ""),
    String(filters?.dateFrom || ""),
    String(filters?.dateTo || "")
  ],
  kpiIndividual: (churchId) => ["tithe", String(churchId || ""), "kpi", "individual"],
  kpiAggregate: (churchId) => ["tithe", String(churchId || ""), "kpi", "aggregate"]
};

function buildListParams(filters) {
  const next = filters || {};

  const params = {
    page: next.page,
    limit: next.limit
  };

  if (next.search) params.search = next.search;
  if (next.dateFrom) params.dateFrom = next.dateFrom;
  if (next.dateTo) params.dateTo = next.dateTo;

  return params;
}

export function useTitheIndividualsQuery({ activeChurchId, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: titheQueryKeys.individuals(churchId, filters),
    enabled: Boolean(enabled && churchId),
    queryFn: async ({ signal }) => {
      const params = buildListParams(filters);
      const res = await apiGetTitheIndividuals(params, churchId, { signal });
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;

      return {
        titheIndividuals: Array.isArray(data?.titheIndividuals) ? data.titheIndividuals : [],
        pagination: data?.pagination || null
      };
    }
  });
}

export function useTitheAggregatesQuery({ activeChurchId, filters, enabled }) {
  const churchId = activeChurchId || "";

  return useQuery({
    queryKey: titheQueryKeys.aggregates(churchId, filters),
    enabled: Boolean(enabled && churchId),
    queryFn: async ({ signal }) => {
      const params = buildListParams(filters);
      const res = await apiGetTitheAggregates(params, churchId, { signal });
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;

      return {
        titheAggregates: Array.isArray(data?.titheAggregates) ? data.titheAggregates : [],
        pagination: data?.pagination || null
      };
    }
  });
}

export function useTitheKpiQuery({ activeChurchId, mode, enabled }) {
  const churchId = activeChurchId || "";
  const isAggregate = String(mode || "") === "aggregate";

  return useQuery({
    queryKey: isAggregate ? titheQueryKeys.kpiAggregate(churchId) : titheQueryKeys.kpiIndividual(churchId),
    enabled: Boolean(enabled && churchId),
    staleTime: 30 * 1000,
    queryFn: async ({ signal }) => {
      const res = isAggregate
        ? await apiGetTitheAggregateKPI(churchId, { signal })
        : await apiGetTitheIndividualKPI(churchId, { signal });

      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      return data || null;
    }
  });
}

export function useTitheMutations(activeChurchId) {
  const queryClient = useQueryClient();
  const churchId = activeChurchId || "";

  const invalidateIndividuals = async () => {
    if (!churchId) return;

    await queryClient.invalidateQueries({
      queryKey: titheQueryKeys.individualsPrefix(churchId),
      exact: false
    });

    await queryClient.invalidateQueries({
      queryKey: titheQueryKeys.kpiIndividual(churchId),
      exact: true
    });
  };

  const invalidateAggregates = async () => {
    if (!churchId) return;

    await queryClient.invalidateQueries({
      queryKey: titheQueryKeys.aggregatesPrefix(churchId),
      exact: false
    });

    await queryClient.invalidateQueries({
      queryKey: titheQueryKeys.kpiAggregate(churchId),
      exact: true
    });
  };

  const createIndividual = useMutation({
    mutationFn: async (payload) => {
      return await apiCreateTitheIndividual(payload, churchId);
    },
    onSuccess: invalidateIndividuals
  });

  const createIndividualsBulk = useMutation({
    mutationFn: async (payloads) => {
      const rows = Array.isArray(payloads) ? payloads.filter(Boolean) : [];
      if (!rows.length) return null;
      await Promise.all(rows.map((p) => apiCreateTitheIndividual(p, churchId)));
      return true;
    },
    onSuccess: invalidateIndividuals
  });

  const updateIndividual = useMutation({
    mutationFn: async ({ id, payload }) => {
      return await apiUpdateTitheIndividual(id, payload, churchId);
    },
    onSuccess: invalidateIndividuals
  });

  const deleteIndividual = useMutation({
    mutationFn: async (id) => {
      return await apiDeleteTitheIndividual(id, churchId);
    },
    onSuccess: invalidateIndividuals
  });

  const createAggregate = useMutation({
    mutationFn: async (payload) => {
      return await apiCreateTitheAggregate(payload, churchId);
    },
    onSuccess: invalidateAggregates
  });

  const updateAggregate = useMutation({
    mutationFn: async ({ id, payload }) => {
      return await apiUpdateTitheAggregate(id, payload, churchId);
    },
    onSuccess: invalidateAggregates
  });

  const deleteAggregate = useMutation({
    mutationFn: async (id) => {
      return await apiDeleteTitheAggregate(id, churchId);
    },
    onSuccess: invalidateAggregates
  });

  return {
    createIndividual,
    createIndividualsBulk,
    updateIndividual,
    deleteIndividual,
    createAggregate,
    updateAggregate,
    deleteAggregate,
    invalidateIndividuals,
    invalidateAggregates
  };
}
