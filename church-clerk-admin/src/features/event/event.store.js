import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import ChurchContext from "../Church/church.store.js";
import { getEvents as apiGetEvents, getEventStats as apiGetEventStats } from "./services/event.api.js";

const EventContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyStats = {
  upcomingEvents: 0,
  ongoingEvents: 0,
  pastEvents: 0
};

const emptyFilters = {
  page: 1,
  limit: 10,
  search: "",
  category: ""
};

export function EventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFiltersState] = useState(emptyFilters);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const filtersRef = useRef(emptyFilters);
  const eventsRequestIdRef = useRef(0);
  const statsRequestIdRef = useRef(0);
  const lastEventsKeyRef = useRef(null);
  const lastStatsKeyRef = useRef(null);

  const store = useContext(ChurchContext);
  const [activeChurch, setActiveChurch] = useState(null);

  useEffect(() => {
    const churchId = store?.activeChurch?._id || null;
    setActiveChurch(churchId);
  }, [store?.activeChurch]);

  const setFilters = useCallback((partial) => {
    const patch = partial || {};
    setFiltersState((prev) => {
      const next = { ...prev, ...patch };

      const same =
        prev.page === next.page &&
        prev.limit === next.limit &&
        prev.search === next.search &&
        prev.category === next.category;

      if (same) return prev;

      filtersRef.current = next;
      return next;
    });
  }, []);

  const fetchEvents = useCallback(
    async ({ status, force = false, ...partial } = {}) => {
      if (!activeChurch) return;

      const patch = partial || {};
      const baseFilters = filtersRef.current || emptyFilters;
      const nextFilters = { ...baseFilters, ...patch };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit,
        status
      };

      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.category) params.category = nextFilters.category;

      const eventsKey = JSON.stringify({ church: activeChurch, ...params });
      if (!force && eventsKey === lastEventsKeyRef.current) return;
      lastEventsKeyRef.current = eventsKey;

      const requestId = (eventsRequestIdRef.current += 1);

      setLoading(true);
      setError(null);

      if (Object.keys(patch).length) {
        filtersRef.current = nextFilters;
        setFiltersState((prev) => {
          const next = { ...prev, ...patch };

          const same =
            prev.page === next.page &&
            prev.limit === next.limit &&
            prev.search === next.search &&
            prev.category === next.category;

          if (same) return prev;
          return next;
        });
      }

      try {
        const res = await apiGetEvents(params);
        const payload = res?.data?.data ?? res?.data;
        const data = payload?.data ?? payload;

        if (requestId !== eventsRequestIdRef.current) return;
        setEvents(Array.isArray(data?.events) ? data.events : []);
        setPagination(data?.pagination || emptyPagination);
      } catch (e) {
        if (requestId !== eventsRequestIdRef.current) return;
        lastEventsKeyRef.current = null;
        setError(e?.response?.data?.message || e?.message || "Failed to fetch events");
      } finally {
        if (requestId !== eventsRequestIdRef.current) return;
        setLoading(false);
      }
    },
    [activeChurch]
  );

  const fetchEventStats = useCallback(
    async ({ force = false, ...partial } = {}) => {
      if (!activeChurch) return;

      const patch = partial || {};
      const baseFilters = filtersRef.current || emptyFilters;
      const nextFilters = { ...baseFilters, ...patch };

      const params = {};
      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.category) params.category = nextFilters.category;

      const statsKey = JSON.stringify({ church: activeChurch, ...params });
      if (!force && statsKey === lastStatsKeyRef.current) return;
      lastStatsKeyRef.current = statsKey;

      const requestId = (statsRequestIdRef.current += 1);

      try {
        const res = await apiGetEventStats(params);
        const payload = res?.data?.data ?? res?.data;
        const data = payload?.data ?? payload;
        const nextStats = data?.stats || emptyStats;

        if (requestId !== statsRequestIdRef.current) return;
        setStats({
          upcomingEvents: Number(nextStats?.upcomingEvents || 0),
          ongoingEvents: Number(nextStats?.ongoingEvents || 0),
          pastEvents: Number(nextStats?.pastEvents || 0)
        });
      } catch {
        if (requestId !== statsRequestIdRef.current) return;
        lastStatsKeyRef.current = null;
        setStats(emptyStats);
      }
    },
    [activeChurch]
  );

  const value = useMemo(() => {
    return {
      events,
      pagination,
      filters,
      stats,
      loading,
      error,
      activeChurch,
      setFilters,
      fetchEvents,
      fetchEventStats
    };
  }, [events, pagination, filters, stats, loading, error, activeChurch, setFilters, fetchEvents, fetchEventStats]);

  return createElement(
    EventContext.Provider,
    {
      value
    },
    children
  );
}

export default EventContext;
