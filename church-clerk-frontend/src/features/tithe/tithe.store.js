import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  searchTitheMembers as apiSearchTitheMembers,
  getTitheAggregateKPI as apiGetTitheAggregateKPI,
  getTitheIndividualKPI as apiGetTitheIndividualKPI
} from "./services/tithe.api.js";
import { updateChurchProfile } from "../church/services/church.api.js";
import ChurchContext from "../church/church.store.js";
import http from "../../shared/services/http.js";

import {
  titheQueryKeys,
  useTitheAggregatesQuery,
  useTitheIndividualsQuery,
  useTitheMutations
} from "./hooks/useTithe.js";

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

  const queryClient = useQueryClient();

  const [activeChurchId, setActiveChurchId] = useState(null);
  const [recordingMode, setRecordingModeState] = useState(null);

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

  const individualsQuery = useTitheIndividualsQuery({
    activeChurchId,
    filters: individualFilters,
    enabled: true
  });

  const aggregatesQuery = useTitheAggregatesQuery({
    activeChurchId,
    filters: aggregateFilters,
    enabled: true
  });

  const individuals = Array.isArray(individualsQuery?.data?.titheIndividuals) ? individualsQuery.data.titheIndividuals : [];
  const aggregates = Array.isArray(aggregatesQuery?.data?.titheAggregates) ? aggregatesQuery.data.titheAggregates : [];

  const individualPagination = individualsQuery?.data?.pagination || emptyPagination;
  const aggregatePagination = aggregatesQuery?.data?.pagination || emptyPagination;

  const queryError =
    individualsQuery?.error?.response?.data?.message ||
    individualsQuery?.error?.message ||
    aggregatesQuery?.error?.response?.data?.message ||
    aggregatesQuery?.error?.message ||
    null;

  const queryLoading = Boolean(individualsQuery?.isLoading || aggregatesQuery?.isLoading);

  const storeError = error || queryError;
  const storeLoading = Boolean(loading || queryLoading);

  const titheMutations = useTitheMutations(activeChurchId);

  const fetchIndividuals = useCallback(
    async (partial) => {
      if (!activeChurchId) return;
      const patch = partial || {};
      if (Object.keys(patch).length) {
        setIndividualFiltersState((prev) => ({ ...prev, ...patch }));
      }
      await queryClient.invalidateQueries({
        queryKey: titheQueryKeys.individualsPrefix(activeChurchId),
        exact: false
      });
    },
    [activeChurchId, queryClient]
  );

  const fetchAggregates = useCallback(
    async (partial) => {
      if (!activeChurchId) return;
      const patch = partial || {};
      if (Object.keys(patch).length) {
        setAggregateFiltersState((prev) => ({ ...prev, ...patch }));
      }
      await queryClient.invalidateQueries({
        queryKey: titheQueryKeys.aggregatesPrefix(activeChurchId),
        exact: false
      });
    },
    [activeChurchId, queryClient]
  );

  const createTitheIndividuals = useCallback(
    async (payload) => {
      if (!activeChurchId) throw new Error("Active church not selected");
      await titheMutations.createIndividual.mutateAsync(payload);
    },
    [activeChurchId, titheMutations.createIndividual]
  );

  const createTitheIndividualsBulk = useCallback(
    async (payloads) => {
      if (!activeChurchId) throw new Error("Active church not selected");
      await titheMutations.createIndividualsBulk.mutateAsync(payloads);
    },
    [activeChurchId, titheMutations.createIndividualsBulk]
  );

  const updateTitheIndividual = useCallback(
    async (id, payload) => {
      if (!activeChurchId) throw new Error("Active church not selected");
      await titheMutations.updateIndividual.mutateAsync({ id, payload });
    },
    [activeChurchId, titheMutations.updateIndividual]
  );

  const deleteTitheIndividual = useCallback(
    async (id) => {
      if (!activeChurchId) throw new Error("Active church not selected");
      await titheMutations.deleteIndividual.mutateAsync(id);
    },
    [activeChurchId, titheMutations.deleteIndividual]
  );

  const createTitheAggregate = useCallback(
    async (payload) => {
      if (!activeChurchId) throw new Error("Active church not selected");
      await titheMutations.createAggregate.mutateAsync(payload);
    },
    [activeChurchId, titheMutations.createAggregate]
  );

  const updateTitheAggregate = useCallback(
    async (id, payload) => {
      if (!activeChurchId) throw new Error("Active church not selected");
      await titheMutations.updateAggregate.mutateAsync({ id, payload });
    },
    [activeChurchId, titheMutations.updateAggregate]
  );

  const deleteTitheAggregate = useCallback(
    async (id) => {
      if (!activeChurchId) throw new Error("Active church not selected");
      await titheMutations.deleteAggregate.mutateAsync(id);
    },
    [activeChurchId, titheMutations.deleteAggregate]
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
      loading: storeLoading,
      error: storeError
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
    storeLoading,
    storeError
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
