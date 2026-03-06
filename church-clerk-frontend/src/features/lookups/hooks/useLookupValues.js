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

  return {
    values,
    loading,
    error,
    reload
  };
}
