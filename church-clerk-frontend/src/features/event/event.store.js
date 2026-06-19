import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ChurchContext from "../church/church.store.js";
import { eventQueryKeys, useEventStatsQuery, useEventsListQuery } from "./hooks/useEvents.js";

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
  const [filters, setFiltersState] = useState(emptyFilters);
  const [activeStatus, setActiveStatus] = useState("upcoming");

  const queryClient = useQueryClient();

  const filtersRef = useRef(emptyFilters);
  const activeStatusRef = useRef("upcoming");

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

  const eventsQuery = useEventsListQuery({
    activeChurchId: activeChurch,
    status: activeStatus,
    filters,
    enabled: true
  });

  const statsQuery = useEventStatsQuery({
    activeChurchId: activeChurch,
    filters,
    enabled: true
  });

  const events = Array.isArray(eventsQuery?.data?.events) ? eventsQuery.data.events : [];
  const pagination = eventsQuery?.data?.pagination || emptyPagination;

  const statsPayload = statsQuery?.data || emptyStats;
  const stats = {
    upcomingEvents: Number(statsPayload?.upcomingEvents || 0),
    ongoingEvents: Number(statsPayload?.ongoingEvents || 0),
    pastEvents: Number(statsPayload?.pastEvents || 0)
  };

  const error =
    eventsQuery?.error?.response?.data?.message ||
    eventsQuery?.error?.message ||
    null;

  const loading = Boolean(eventsQuery?.isLoading);

  const fetchEvents = useCallback(
    async ({ status, force = false, ...partial } = {}) => {
      if (!activeChurch) return;

      if (status) {
        activeStatusRef.current = status;
        setActiveStatus(status);
      }

      const patch = partial || {};

      if (Object.keys(patch).length) {
        filtersRef.current = { ...(filtersRef.current || emptyFilters), ...patch };
        setFiltersState((prev) => ({ ...prev, ...patch }));
      }

      if (force) {
        await queryClient.invalidateQueries({
          queryKey: eventQueryKeys.eventsPrefix(activeChurch),
          exact: false
        });
      }
    },
    [activeChurch, queryClient]
  );

  const fetchEventStats = useCallback(
    async ({ force = false, ...partial } = {}) => {
      if (!activeChurch) return;

      const patch = partial || {};
      if (Object.keys(patch).length) {
        filtersRef.current = { ...(filtersRef.current || emptyFilters), ...patch };
        setFiltersState((prev) => ({ ...prev, ...patch }));
      }

      if (force) {
        await queryClient.invalidateQueries({
          queryKey: eventQueryKeys.eventsPrefix(activeChurch),
          exact: false
        });
      }
    },
    [activeChurch, queryClient]
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
