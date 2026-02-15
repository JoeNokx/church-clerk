import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  createOffering as apiCreateOffering,
  deleteOffering as apiDeleteOffering,
  getOfferings,
  getOfferingKPI as apiGetOfferingKPI,
  updateOffering as apiUpdateOffering
} from "./services/offering.api.js";
import ChurchContext from "../Church/church.store.js";

const OfferingContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyFilters = {
  page: 1,
  limit: 10,
  serviceType: "",
  dateFrom: "",
  dateTo: ""
};

export function OfferingProvider({ children }) {
  const [offerings, setOfferings] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFiltersState] = useState(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const store = useContext(ChurchContext);
  const [activeChurch, setActiveChurch] = useState(null);

  useEffect(() => {
    const churchId = store?.activeChurch?._id || null;
    setActiveChurch(churchId);
  }, [store?.activeChurch]);

  const setFilters = useCallback((partial) => {
    setFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const fetchOfferings = useCallback(
    async (partial) => {
      const nextFilters = { ...filters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.serviceType) params.serviceType = nextFilters.serviceType;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await getOfferings(params, activeChurch);
        const payload = res?.data?.data ?? res?.data;

        setOfferings(payload?.offerings || []);
        setPagination(payload?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch offerings");
        setOfferings([]);
        setPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [filters, activeChurch]
  );

  const createOffering = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiCreateOffering(payload, activeChurch);
        await fetchOfferings();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create offering");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchOfferings, activeChurch]
  );

  const updateOffering = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiUpdateOffering(id, payload, activeChurch);
        await fetchOfferings();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update offering");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchOfferings, activeChurch]
  );

  const deleteOffering = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        await apiDeleteOffering(id, activeChurch);
        await fetchOfferings();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete offering");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchOfferings, activeChurch]
  );

  const getOfferingKPI = useCallback(async () => {
    return await apiGetOfferingKPI(activeChurch);
  }, [activeChurch]);

  const value = useMemo(() => {
    return {
      offerings,
      pagination,
      loading,
      error,
      activeChurch,
      filters,
      setFilters,
      fetchOfferings,
      createOffering,
      updateOffering,
      deleteOffering,
      getOfferingKPI
    };
  }, [
    offerings,
    pagination,
    loading,
    error,
    activeChurch,
    filters,
    setFilters,
    fetchOfferings,
    createOffering,
    updateOffering,
    deleteOffering,
    getOfferingKPI
  ]);

  return createElement(
    OfferingContext.Provider,
    {
      value
    },
    children
  );
}

export default OfferingContext;
