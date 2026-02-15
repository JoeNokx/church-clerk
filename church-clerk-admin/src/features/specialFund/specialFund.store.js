import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  createSpecialFund as apiCreateSpecialFund,
  deleteSpecialFund as apiDeleteSpecialFund,
  getSpecialFunds,
  getSpecialFundKPI as apiGetSpecialFundKPI,
  updateSpecialFund as apiUpdateSpecialFund
} from "./services/specialFund.api.js";
import ChurchContext from "../Church/church.store.js";

const SpecialFundContext = createContext(null);

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
  category: "",
  dateFrom: "",
  dateTo: ""
};

export function SpecialFundProvider({ children }) {
  const [specialFunds, setSpecialFunds] = useState([]);
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

  const fetchSpecialFunds = useCallback(
    async (partial) => {
      const nextFilters = { ...filters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.category) params.category = nextFilters.category;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await getSpecialFunds(params, activeChurch);
        const payload = res?.data?.data ?? res?.data;

        setSpecialFunds(payload?.specialFund || []);
        setPagination(payload?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch special funds");
        setSpecialFunds([]);
        setPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [filters, activeChurch]
  );

  const createSpecialFund = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiCreateSpecialFund(payload, activeChurch);
        await fetchSpecialFunds();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create special fund");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchSpecialFunds, activeChurch]
  );

  const updateSpecialFund = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiUpdateSpecialFund(id, payload, activeChurch);
        await fetchSpecialFunds();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update special fund");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchSpecialFunds, activeChurch]
  );

  const deleteSpecialFund = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        await apiDeleteSpecialFund(id, activeChurch);
        await fetchSpecialFunds();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete special fund");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchSpecialFunds, activeChurch]
  );

  const getSpecialFundKPI = useCallback(async () => {
    return await apiGetSpecialFundKPI(activeChurch);
  }, [activeChurch]);

  const value = useMemo(() => {
    return {
      specialFunds,
      pagination,
      loading,
      error,
      activeChurch,
      filters,
      setFilters,
      fetchSpecialFunds,
      createSpecialFund,
      updateSpecialFund,
      deleteSpecialFund,
      getSpecialFundKPI
    };
  }, [
    specialFunds,
    pagination,
    loading,
    error,
    activeChurch,
    filters,
    setFilters,
    fetchSpecialFunds,
    createSpecialFund,
    updateSpecialFund,
    deleteSpecialFund,
    getSpecialFundKPI
  ]);

  return createElement(
    SpecialFundContext.Provider,
    {
      value
    },
    children
  );
}

export default SpecialFundContext;
