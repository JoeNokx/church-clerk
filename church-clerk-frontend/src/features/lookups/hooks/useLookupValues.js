import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getLookupValues } from "../services/lookups.api.js";

export function useLookupValues(kind, options) {
  const autoLoad = options?.autoLoad !== false;

  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lookups", String(kind || "")],
    enabled: Boolean(kind) && autoLoad,
    queryFn: async ({ signal }) => {
      const res = await getLookupValues(kind, { signal });
      const rows = Array.isArray(res?.data?.values) ? res.data.values : [];
      return rows;
    }
  });

  const values = Array.isArray(query?.data) ? query.data : [];
  const loading = Boolean(query?.isLoading);
  const error = query?.error?.response?.data?.message || query?.error?.message || "";

  const reload = useCallback(async () => {
    if (!kind) return;
    await query.refetch();
  }, [kind, query]);

  useEffect(() => {
    const handler = (event) => {
      const nextKind = event?.detail?.kind;
      if (!nextKind || String(nextKind) !== String(kind || "")) return;

      const v = String(event?.detail?.value || "").trim();
      if (!v) return;

      const vNorm = v.toLowerCase();
      queryClient.setQueryData(["lookups", String(kind || "")], (prev) => {
        const rows = Array.isArray(prev) ? prev : [];
        const exists = rows.some((x) => String(x || "").trim().toLowerCase() === vNorm);
        if (exists) return rows;
        return [...rows, v].sort((a, b) => String(a).localeCompare(String(b)));
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("cck:lookups:changed", handler);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("cck:lookups:changed", handler);
      }
    };
  }, [kind, queryClient]);

  return {
    values,
    loading,
    error,
    reload
  };
}
