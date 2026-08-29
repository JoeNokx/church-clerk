import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createSpecialFund as apiCreateSpecialFund,
  deleteSpecialFund as apiDeleteSpecialFund,
  getSpecialFunds,
  getSpecialFundKPI as apiGetSpecialFundKPI,
  updateSpecialFund as apiUpdateSpecialFund
} from "./services/specialFund.api.js";
import ChurchContext from "../church/church.store.js";

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
  dateTo: "",
  recordedBy: ""
};

export function SpecialFundProvider({ children }) {
  const [specialFunds, setSpecialFunds] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFiltersState] = useState(emptyFilters);
  const filtersRef = useRef(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const store = useContext(ChurchContext);
  const [activeChurch, setActiveChurch] = useState(null);
  const activeChurchRef = useRef(null);

  const fetchRequestIdRef = useRef(0);
  const fetchAbortRef = useRef(null);

  useEffect(() => {
    const churchId = store?.activeChurch?._id || null;
    setActiveChurch(churchId);
    activeChurchRef.current = churchId;
  }, [store?.activeChurch]);

  const setFilters = useCallback((partial) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...(partial || {}) };
      filtersRef.current = next;
      return next;
    });
  }, []);

  const fetchSpecialFunds = useCallback(async (partial) => {
    const requestId = (fetchRequestIdRef.current += 1);
    const nextFilters = { ...filtersRef.current, ...(partial || {}) };
    filtersRef.current = nextFilters;

    const params = {
      page: nextFilters.page,
      limit: nextFilters.limit
    };

    if (nextFilters.search) params.search = nextFilters.search;
    if (nextFilters.category) params.category = nextFilters.category;
    if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
    if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;
    if (nextFilters.recordedBy) params.recordedBy = nextFilters.recordedBy;

    setFiltersState(nextFilters);
    setLoading(true);
    setError(null);

    try {
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
      }
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      const res = await getSpecialFunds(params, activeChurchRef.current, { signal: controller.signal });
      const payload = res?.data?.data ?? res?.data;

      if (requestId !== fetchRequestIdRef.current) return;

      setSpecialFunds(payload?.specialFund || []);
      setPagination(payload?.pagination || emptyPagination);
    } catch (e) {
      if (requestId !== fetchRequestIdRef.current) return;
      if (e?.code === "ERR_CANCELED") return;
      setError(e?.response?.data?.message || e?.message || "Failed to fetch special funds");
      setSpecialFunds([]);
      setPagination(emptyPagination);
    } finally {
      if (requestId !== fetchRequestIdRef.current) return;
      setLoading(false);
    }
  }, []);

  const createSpecialFund = useCallback(async (payload) => {
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
  }, [fetchSpecialFunds, activeChurch]);

  const updateSpecialFund = useCallback(async (id, payload) => {
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
  }, [fetchSpecialFunds, activeChurch]);

  const deleteSpecialFund = useCallback(async (id) => {
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
  }, [fetchSpecialFunds, activeChurch]);

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
  }, [specialFunds, pagination, loading, error, activeChurch, filters, setFilters, fetchSpecialFunds, createSpecialFund, updateSpecialFund, deleteSpecialFund, getSpecialFundKPI]);

  return createElement(
    SpecialFundContext.Provider,
    {
      value
    },
    children
  );
}

export default SpecialFundContext;
