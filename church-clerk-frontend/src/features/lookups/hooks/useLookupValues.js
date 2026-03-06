import { useCallback, useEffect, useState } from "react";

import { getLookupValues } from "../services/lookups.api.js";

export function useLookupValues(kind, options) {
  const autoLoad = options?.autoLoad !== false;

  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!kind) return;
    setLoading(true);
    setError("");
    try {
      const res = await getLookupValues(kind);
      const rows = Array.isArray(res?.data?.values) ? res.data.values : [];
      setValues(rows);
    } catch (e) {
      setValues([]);
      setError(e?.response?.data?.message || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    if (!autoLoad) return;
    void reload();
  }, [autoLoad, reload]);

  useEffect(() => {
    const handler = (event) => {
      const nextKind = event?.detail?.kind;
      if (!nextKind || String(nextKind) !== String(kind || "")) return;

      const v = String(event?.detail?.value || "").trim();
      if (!v) return;

      const vNorm = v.toLowerCase();
      setValues((prev) => {
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
  }, [kind]);

  return {
    values,
    loading,
    error,
    reload
  };
}
