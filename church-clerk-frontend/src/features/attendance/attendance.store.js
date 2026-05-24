import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getVisitor as apiGetVisitor
} from "./services/attendance.api.js";
import ChurchContext from "../church/church.store.js";
import {
  attendanceQueryKeys,
  useAttendanceMutations,
  useAttendancesQuery,
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

const emptyAttendanceFilters = {
  page: 1,
  limit: 10,
  serviceType: "",
  dateFrom: "",
  dateTo: ""
};

const emptyVisitorFilters = {
  page: 1,
  limit: 10,
  search: ""
};

export function AttendanceProvider({ children }) {
  const [attendanceFilters, setAttendanceFiltersState] = useState(emptyAttendanceFilters);
  const [visitorFilters, setVisitorFiltersState] = useState(emptyVisitorFilters);
  const queryClient = useQueryClient();

  const churchStore = useContext(ChurchContext);
  const [activeChurch, setActiveChurch] = useState(null);

  useEffect(() => {
    const churchId = churchStore?.activeChurch?._id || null;
    setActiveChurch(churchId);
  }, [churchStore?.activeChurch]);

  const setAttendanceFilters = useCallback((partial) => {
    setAttendanceFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const setVisitorFilters = useCallback((partial) => {
    setVisitorFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const attendancesQuery = useAttendancesQuery({
    activeChurchId: activeChurch,
    filters: attendanceFilters,
    enabled: true
  });

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

  const attendances = Array.isArray(attendancesQuery?.data?.attendances) ? attendancesQuery.data.attendances : [];
  const attendancePagination = attendancesQuery?.data?.pagination || emptyPagination;
  const attendanceLoading = Boolean(attendancesQuery?.isLoading);
  const attendanceError =
    attendancesQuery?.error?.response?.data?.message ||
    attendancesQuery?.error?.message ||
    null;

  const visitors = Array.isArray(visitorsQuery?.data?.visitors) ? visitorsQuery.data.visitors : [];
  const visitorPagination = visitorsQuery?.data?.pagination || emptyPagination;
  const visitorLoading = Boolean(visitorsQuery?.isLoading);
  const visitorError =
    visitorsQuery?.error?.response?.data?.message ||
    visitorsQuery?.error?.message ||
    null;

  const visitorStatsPayload = visitorStatsQuery?.data || visitorsQuery?.data?.stats || null;
  const visitorStats = {
    totalVisitors: Number(visitorStatsPayload?.totalVisitors || 0),
    thisWeekVisitors: Number(visitorStatsPayload?.thisWeekVisitors || 0),
    thisMonthVisitors: Number(visitorStatsPayload?.thisMonthVisitors || 0),
    convertedVisitors: Number(visitorStatsPayload?.convertedVisitors || 0)
  };

  const attendanceMutations = useAttendanceMutations(activeChurch);
  const visitorMutations = useVisitorMutations(activeChurch);

  const fetchAttendances = useCallback(
    async (partial) => {
      if (!activeChurch) return;
      const patch = partial || {};
      if (Object.keys(patch).length) {
        setAttendanceFiltersState((prev) => ({ ...prev, ...patch }));
      }
      await queryClient.invalidateQueries({
        queryKey: attendanceQueryKeys.attendancesPrefix(activeChurch),
        exact: false
      });
    },
    [activeChurch, queryClient]
  );

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

  const createAttendance = useCallback(
    async (payload) => {
      if (!activeChurch) throw new Error("Active church not selected");
      await attendanceMutations.createAttendance.mutateAsync(payload);
    },
    [activeChurch, attendanceMutations.createAttendance]
  );

  const updateAttendance = useCallback(
    async (id, payload) => {
      if (!activeChurch) throw new Error("Active church not selected");
      await attendanceMutations.updateAttendance.mutateAsync({ id, payload });
    },
    [activeChurch, attendanceMutations.updateAttendance]
  );

  const deleteAttendance = useCallback(
    async (id) => {
      if (!activeChurch) throw new Error("Active church not selected");
      await attendanceMutations.deleteAttendance.mutateAsync(id);
    },
    [activeChurch, attendanceMutations.deleteAttendance]
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
      attendances,
      attendancePagination,
      attendanceFilters,
      visitors,
      visitorPagination,
      visitorFilters,
      visitorStats,
      attendanceLoading,
      attendanceError,
      visitorLoading,
      visitorError,
      activeChurch,
      setAttendanceFilters,
      setVisitorFilters,
      fetchAttendances,
      createAttendance,
      updateAttendance,
      deleteAttendance,
      fetchVisitors,
      fetchVisitorStats,
      getVisitor,
      createVisitor,
      updateVisitor,
      deleteVisitor
    };
  }, [
    attendances,
    attendancePagination,
    attendanceFilters,
    attendanceLoading,
    attendanceError,
    visitors,
    visitorPagination,
    visitorFilters,
    visitorStats,
    visitorLoading,
    visitorError,
    activeChurch,
    setAttendanceFilters,
    setVisitorFilters,
    fetchAttendances,
    createAttendance,
    updateAttendance,
    deleteAttendance,
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
