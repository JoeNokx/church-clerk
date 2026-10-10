import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getVisitor as apiGetVisitor
} from "./services/attendance.api.js";
import ChurchContext from "../church/church.store.js";
import {
  attendanceQueryKeys,
  useVisitorMutations,
  useVisitorStatsQuery,
  useVisitorsQuery
} from "./hooks/useAttendance.js";

const AttendanceContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyVisitorFilters = {
  page: 1,
  limit: 20,
  search: "",
  source: "",
  dateFrom: "",
  dateTo: "",
  attendance: ""
};

export function AttendanceProvider({ children }) {
  const [visitorFilters, setVisitorFiltersState] = useState(emptyVisitorFilters);
  const queryClient = useQueryClient();

  const churchStore = useContext(ChurchContext);
  const activeChurch = churchStore?.activeChurch?._id || null;

  const setVisitorFilters = useCallback((partial) => {
    setVisitorFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const visitorsQuery = useVisitorsQuery({
    activeChurchId: activeChurch,
    filters: visitorFilters,
    enabled: true
  });

  const visitorStatsQuery = useVisitorStatsQuery({
    activeChurchId: activeChurch,
    filters: visitorFilters,
    enabled: true
  });

  const visitors = useMemo(
    () => (Array.isArray(visitorsQuery?.data?.visitors) ? visitorsQuery.data.visitors : []),
    [visitorsQuery]
  );
  const visitorPagination = visitorsQuery?.data?.pagination || emptyPagination;
  const visitorLoading = Boolean(visitorsQuery?.isLoading);
  const visitorError =
    visitorsQuery?.error?.response?.data?.message ||
    visitorsQuery?.error?.message ||
    null;

  const visitorStats = useMemo(() => {
    const payload = visitorStatsQuery?.data || visitorsQuery?.data?.stats || null;
    return {
      totalVisitors: Number(payload?.totalVisitors || 0),
      thisWeekVisitors: Number(payload?.thisWeekVisitors || 0),
      thisMonthVisitors: Number(payload?.thisMonthVisitors || 0),
      convertedVisitors: Number(payload?.convertedVisitors || 0),
      change: payload?.change || null,
      diff: payload?.diff || null
    };
  }, [visitorStatsQuery, visitorsQuery]);

  const visitorMutations = useVisitorMutations(activeChurch);

  const fetchVisitors = useCallback(
    async (partial) => {
      if (!activeChurch) return;
      const patch = partial || {};
      if (Object.keys(patch).length) {
        setVisitorFiltersState((prev) => ({ ...prev, ...patch }));
      }
      await queryClient.invalidateQueries({
        queryKey: attendanceQueryKeys.visitorsPrefix(activeChurch),
        exact: false
      });
    },
    [activeChurch, queryClient]
  );

  const fetchVisitorStats = useCallback(
    async ({ force = false } = {}) => {
      if (!activeChurch) return;
      if (!force && visitorStatsQuery?.data) return;
      await queryClient.invalidateQueries({
        queryKey: attendanceQueryKeys.visitorStats(activeChurch),
        exact: false
      });
    },
    [activeChurch, queryClient, visitorStatsQuery?.data]
  );

  const createVisitor = useCallback(
    async (payload) => {
      if (!activeChurch) throw new Error("Active church not selected");
      await visitorMutations.createVisitor.mutateAsync(payload);
    },
    [activeChurch, visitorMutations.createVisitor]
  );

  const getVisitor = useCallback(
    async (id) => {
      if (!activeChurch) throw new Error("Active church not selected");
      return await apiGetVisitor(id);
    },
    [activeChurch]
  );

  const updateVisitor = useCallback(
    async (id, payload) => {
      if (!activeChurch) throw new Error("Active church not selected");
      await visitorMutations.updateVisitor.mutateAsync({ id, payload });
    },
    [activeChurch, visitorMutations.updateVisitor]
  );

  const deleteVisitor = useCallback(
    async (id) => {
      if (!activeChurch) throw new Error("Active church not selected");
      await visitorMutations.deleteVisitor.mutateAsync(id);
    },
    [activeChurch, visitorMutations.deleteVisitor]
  );

  const value = useMemo(() => {
    return {
      visitors,
      visitorPagination,
      visitorFilters,
      visitorStats,
      visitorLoading,
      visitorError,
      activeChurch,
      setVisitorFilters,
      fetchVisitors,
      fetchVisitorStats,
      getVisitor,
      createVisitor,
      updateVisitor,
      deleteVisitor
    };
  }, [
    visitors,
    visitorPagination,
    visitorFilters,
    visitorStats,
    visitorLoading,
    visitorError,
    activeChurch,
    setVisitorFilters,
    fetchVisitors,
    fetchVisitorStats,
    getVisitor,
    createVisitor,
    updateVisitor,
    deleteVisitor
  ]);

  return createElement(
    AttendanceContext.Provider,
    {
      value
    },
    children
  );
}

export default AttendanceContext;
