import { createContext, createElement, useCallback, useMemo, useState } from "react";

import {
  createEventOffering as apiCreateEventOffering,
  deleteEventOffering as apiDeleteEventOffering,
  getEventOfferings as apiGetEventOfferings,
  updateEventOffering as apiUpdateEventOffering
} from "./services/eventOfferings.api.js";

const EventOfferingContext = createContext(null);

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
  dateFrom: "",
  dateTo: ""
};

export function EventOfferingProvider({ eventId, children }) {
  const [offerings, setOfferings] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFiltersState] = useState(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

      if (nextFilters.offeringType) params.offeringType = nextFilters.offeringType;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await apiGetEventOfferings(eventId, params);
        const payload = res?.data?.data ?? res?.data;
        const data = payload?.data ?? payload;

        setOfferings(Array.isArray(data?.offerings) ? data.offerings : []);
        setPagination(data?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch event offerings");
        setOfferings([]);
        setPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [eventId, filters]
  );

  const createOffering = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiCreateEventOffering(eventId, payload);
        await fetchOfferings();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create event offering");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [eventId, fetchOfferings]
  );

  const updateOffering = useCallback(
    async (offeringId, payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiUpdateEventOffering(eventId, offeringId, payload);
        await fetchOfferings();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update event offering");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [eventId, fetchOfferings]
  );

  const deleteOffering = useCallback(
    async (offeringId) => {
      setLoading(true);
      setError(null);

      try {
        await apiDeleteEventOffering(eventId, offeringId);
        await fetchOfferings();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete event offering");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [eventId, fetchOfferings]
  );

  const value = useMemo(() => {
    return {
      eventId,
      offerings,
      pagination,
      filters,
      loading,
      error,
      setFilters,
      fetchOfferings,
      createOffering,
      updateOffering,
      deleteOffering
    };
  }, [
    eventId,
    offerings,
    pagination,
    filters,
    loading,
    error,
    setFilters,
    fetchOfferings,
    createOffering,
    updateOffering,
    deleteOffering
  ]);

  return createElement(
    EventOfferingContext.Provider,
    {
      value
    },
    children
  );
}

export default EventOfferingContext;
