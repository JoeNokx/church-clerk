import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  createTitheAggregate as apiCreateTitheAggregate,
  createTitheIndividual as apiCreateTitheIndividual,
  deleteTitheAggregate as apiDeleteTitheAggregate,
  deleteTitheIndividual as apiDeleteTitheIndividual,
  getTitheAggregateKPI as apiGetTitheAggregateKPI,
  getTitheAggregates as apiGetTitheAggregates,
  getTitheIndividualKPI as apiGetTitheIndividualKPI,
  getTitheIndividuals as apiGetTitheIndividuals,
  searchTitheMembers as apiSearchTitheMembers,
  updateTitheAggregate as apiUpdateTitheAggregate,
  updateTitheIndividual as apiUpdateTitheIndividual
} from "./services/tithe.api.js";
import { updateChurchProfile } from "../Church/services/church.api.js";
import ChurchContext from "../Church/church.store.js";
import http from "../../shared/services/http.js";

const TitheContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyIndividualFilters = {
  page: 1,
  limit: 10,
  search: "",
  dateFrom: "",
  dateTo: ""
};

const emptyAggregateFilters = {
  page: 1,
  limit: 10,
  search: "",
  dateFrom: "",
  dateTo: ""
};

export function TitheProvider({ children }) {
  const churchStore = useContext(ChurchContext);

  const [activeChurchId, setActiveChurchId] = useState(null);
  const [recordingMode, setRecordingModeState] = useState(null);

  const [individuals, setIndividuals] = useState([]);
  const [aggregates, setAggregates] = useState([]);

  const [individualPagination, setIndividualPagination] = useState(emptyPagination);
  const [aggregatePagination, setAggregatePagination] = useState(emptyPagination);

  const [individualFilters, setIndividualFiltersState] = useState(emptyIndividualFilters);
  const [aggregateFilters, setAggregateFiltersState] = useState(emptyAggregateFilters);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = churchStore?.activeChurch?._id || null;
    setActiveChurchId(id);
    const mode = churchStore?.activeChurch?.titheRecordingMode || null;
    setRecordingModeState(mode);
  }, [churchStore?.activeChurch]);

  const setRecordingMode = useCallback(
    async (mode) => {
      if (!activeChurchId) throw new Error("Active church not selected");
      setLoading(true);
      setError(null);
      try {
        await updateChurchProfile(activeChurchId, { titheRecordingMode: mode });
        const res = await http.get("/user/me");
        const nextActiveChurch = res?.data?.data?.activeChurch;
        if (typeof churchStore?.setActiveChurch === "function") {
          churchStore.setActiveChurch(nextActiveChurch);
        }
        setRecordingModeState(nextActiveChurch?.titheRecordingMode || mode || null);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update tithe recording mode");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [activeChurchId, churchStore]
  );

  const fetchIndividuals = useCallback(
    async (partial) => {
      const nextFilters = { ...individualFilters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setIndividualFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await apiGetTitheIndividuals(params, activeChurchId);
        const payload = res?.data?.data ?? res?.data;
        const data = payload?.data ?? payload;

        setIndividuals(Array.isArray(data?.titheIndividuals) ? data.titheIndividuals : []);
        setIndividualPagination(data?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch tithe individuals");
        setIndividuals([]);
        setIndividualPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [individualFilters, activeChurchId]
  );

  const fetchAggregates = useCallback(
    async (partial) => {
      const nextFilters = { ...aggregateFilters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setAggregateFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await apiGetTitheAggregates(params, activeChurchId);
        const payload = res?.data?.data ?? res?.data;
        const data = payload?.data ?? payload;

        setAggregates(Array.isArray(data?.titheAggregates) ? data.titheAggregates : []);
        setAggregatePagination(data?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch tithe aggregates");
        setAggregates([]);
        setAggregatePagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [aggregateFilters, activeChurchId]
  );

  const createTitheIndividuals = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiCreateTitheIndividual(payload, activeChurchId);
        await fetchIndividuals();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create tithe record");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [activeChurchId, fetchIndividuals]
  );

  const createTitheIndividualsBulk = useCallback(
    async (payloads) => {
      const rows = Array.isArray(payloads) ? payloads.filter(Boolean) : [];
      if (!rows.length) return;

      setLoading(true);
      setError(null);
      try {
        await Promise.all(rows.map((p) => apiCreateTitheIndividual(p, activeChurchId)));
        await fetchIndividuals();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create tithe records");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [activeChurchId, fetchIndividuals]
  );

  const updateTitheIndividual = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiUpdateTitheIndividual(id, payload, activeChurchId);
        await fetchIndividuals();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update tithe record");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [activeChurchId, fetchIndividuals]
  );

  const deleteTitheIndividual = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await apiDeleteTitheIndividual(id, activeChurchId);
        await fetchIndividuals();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete tithe record");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [activeChurchId, fetchIndividuals]
  );

  const createTitheAggregate = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiCreateTitheAggregate(payload, activeChurchId);
        await fetchAggregates();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create tithe aggregate");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [activeChurchId, fetchAggregates]
  );

  const updateTitheAggregate = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiUpdateTitheAggregate(id, payload, activeChurchId);
        await fetchAggregates();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update tithe aggregate");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [activeChurchId, fetchAggregates]
  );

  const deleteTitheAggregate = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await apiDeleteTitheAggregate(id, activeChurchId);
        await fetchAggregates();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete tithe aggregate");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [activeChurchId, fetchAggregates]
  );

  const getIndividualKPI = useCallback(async () => {
    return await apiGetTitheIndividualKPI(activeChurchId);
  }, [activeChurchId]);

  const getAggregateKPI = useCallback(async () => {
    return await apiGetTitheAggregateKPI(activeChurchId);
  }, [activeChurchId]);

  const searchMembers = useCallback(
    async (search) => {
      const res = await apiSearchTitheMembers(search, activeChurchId);
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      return Array.isArray(data?.members) ? data.members : [];
    },
    [activeChurchId]
  );

  const value = useMemo(() => {
    return {
      activeChurchId,
      recordingMode,
      setRecordingMode,
      individuals,
      aggregates,
      individualPagination,
      aggregatePagination,
      individualFilters,
      aggregateFilters,
      fetchIndividuals,
      fetchAggregates,
      createTitheIndividuals,
      createTitheIndividualsBulk,
      updateTitheIndividual,
      deleteTitheIndividual,
      createTitheAggregate,
      updateTitheAggregate,
      deleteTitheAggregate,
      getIndividualKPI,
      getAggregateKPI,
      searchMembers,
      loading,
      error
    };
  }, [
    activeChurchId,
    recordingMode,
    setRecordingMode,
    individuals,
    aggregates,
    individualPagination,
    aggregatePagination,
    individualFilters,
    aggregateFilters,
    fetchIndividuals,
    fetchAggregates,
    createTitheIndividuals,
    createTitheIndividualsBulk,
    updateTitheIndividual,
    deleteTitheIndividual,
    createTitheAggregate,
    updateTitheAggregate,
    deleteTitheAggregate,
    getIndividualKPI,
    getAggregateKPI,
    searchMembers,
    loading,
    error
  ]);

  return createElement(
    TitheContext.Provider,
    {
      value
    },
    children
  );
}

export default TitheContext;
