import { createContext, createElement, useCallback, useMemo, useRef, useState } from "react";

import {
  createProgramOffering as apiCreateProgramOffering,
  getProgramOfferings as apiGetProgramOfferings,
  updateProgramOffering as apiUpdateProgramOffering
} from "./services/programOfferings.api.js";

const ProgramOfferingContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyFilters = {
  page: 1,
  limit: 10,
  offeringType: "",
  search: "",
  dateFrom: "",
  dateTo: ""
};

export function ProgramOfferingProvider({ programId, children }) {
  const [offerings, setOfferings] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const filtersRef = useRef(emptyFilters);
  const [filters, setFiltersState] = useState(emptyFilters);

  const setFilters = useCallback((partial) => {
    setFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const fetchOfferings = useCallback(
    async (partial) => {
      const nextFilters = { ...filtersRef.current, ...(partial || {}) };
      filtersRef.current = nextFilters;

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.offeringType) params.offeringType = nextFilters.offeringType;
      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await apiGetProgramOfferings(programId, params);
        const payload = res?.data?.data ?? res?.data;
        const data = payload?.data ?? payload;

        setOfferings(Array.isArray(data?.offerings) ? data.offerings : []);
        setPagination(data?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch program offerings");
        setOfferings([]);
        setPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [programId]
  );

  const createOffering = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiCreateProgramOffering(programId, payload);
        await fetchOfferings();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create program offering");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [programId, fetchOfferings]
  );

  const updateOffering = useCallback(
    async (offeringId, payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiUpdateProgramOffering(programId, offeringId, payload);
        await fetchOfferings();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update program offering");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [programId, fetchOfferings]
  );

  const value = useMemo(() => {
    return {
      programId,
      offerings,
      pagination,
      filters,
      loading,
      error,
      setFilters,
      fetchOfferings,
      createOffering,
      updateOffering
    };
  }, [programId, offerings, pagination, filters, loading, error, setFilters, fetchOfferings, createOffering, updateOffering]);

  return createElement(
    ProgramOfferingContext.Provider,
    {
      value
    },
    children
  );
}

export default ProgramOfferingContext;
