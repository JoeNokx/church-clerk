import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

import ChurchContext from "../church/church.store.js";
import {
  createPledge as apiCreatePledge,
  deletePledge as apiDeletePledge,
  getPledge as apiGetPledge,
  getPledges as apiGetPledges,
  updatePledge as apiUpdatePledge
} from "./services/pledge.api.js";

const PledgeContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyFilters = {
  page: 1,
  limit: 10,
  search: "",
  serviceType: "",
  status: "",
  dateFrom: "",
  dateTo: ""
};

export function PledgeProvider({ children }) {
  const churchStore = useContext(ChurchContext);
  const [activeChurchId, setActiveChurchId] = useState(null);

  const [pledges, setPledges] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFiltersState] = useState(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = churchStore?.activeChurch?._id || null;
    setActiveChurchId(id);
  }, [churchStore?.activeChurch]);

  const setFilters = useCallback((partial) => {
    setFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const fetchPledges = useCallback(
    async (partial) => {
      const nextFilters = { ...filters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.serviceType) params.serviceType = nextFilters.serviceType;
      if (nextFilters.status) params.status = nextFilters.status;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await apiGetPledges(params);
        const payload = res?.data?.data ?? res?.data;

        setPledges(Array.isArray(payload?.pledges) ? payload.pledges : []);
        setPagination(payload?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch pledges");
        setPledges([]);
        setPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const createPledge = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiCreatePledge(payload);
        await fetchPledges({ page: 1 });
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create pledge");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchPledges]
  );

  const updatePledge = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiUpdatePledge(id, payload);
        await fetchPledges();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update pledge");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchPledges]
  );

  const deletePledge = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        await apiDeletePledge(id);
        await fetchPledges();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete pledge");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchPledges]
  );

  const getPledge = useCallback(async (id) => {
    return await apiGetPledge(id);
  }, []);

  const value = useMemo(() => {
    return {
      activeChurchId,
      pledges,
      pagination,
      filters,
      loading,
      error,
      setFilters,
      fetchPledges,
      createPledge,
      updatePledge,
      deletePledge,
      getPledge
    };
  }, [
    activeChurchId,
    pledges,
    pagination,
    filters,
    loading,
    error,
    setFilters,
    fetchPledges,
    createPledge,
    updatePledge,
    deletePledge,
    getPledge
  ]);

  return createElement(
    PledgeContext.Provider,
    {
      value
    },
    children
  );
}

export default PledgeContext;
