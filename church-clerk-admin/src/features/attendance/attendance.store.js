import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  createAttendance as apiCreateAttendance,
  createVisitor as apiCreateVisitor,
  deleteAttendance as apiDeleteAttendance,
  deleteVisitor as apiDeleteVisitor,
  getAttendances,
  getVisitor as apiGetVisitor,
  getVisitors,
  updateAttendance as apiUpdateAttendance,
  updateVisitor as apiUpdateVisitor
} from "./services/attendance.api.js";
import ChurchContext from "../Church/church.store.js";

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
  const [attendances, setAttendances] = useState([]);
  const [attendancePagination, setAttendancePagination] = useState(emptyPagination);
  const [attendanceFilters, setAttendanceFiltersState] = useState(emptyAttendanceFilters);

  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);

  const [visitors, setVisitors] = useState([]);
  const [visitorPagination, setVisitorPagination] = useState(emptyPagination);
  const [visitorFilters, setVisitorFiltersState] = useState(emptyVisitorFilters);
  const [visitorStats, setVisitorStats] = useState({ totalVisitors: 0, thisWeekVisitors: 0, thisMonthVisitors: 0, convertedVisitors: 0 });

  const [visitorLoading, setVisitorLoading] = useState(false);
  const [visitorError, setVisitorError] = useState(null);

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

  const fetchAttendances = useCallback(
    async (partial) => {
      const nextFilters = { ...attendanceFilters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.serviceType) params.serviceType = nextFilters.serviceType;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setAttendanceFiltersState(nextFilters);
      setAttendanceLoading(true);
      setAttendanceError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        const res = await getAttendances(params);
        const payload = res?.data?.data ?? res?.data;

        setAttendances(payload?.attendances || []);
        setAttendancePagination(payload?.pagination || emptyPagination);
      } catch (e) {
        setAttendanceError(e?.response?.data?.message || e?.message || "Failed to fetch attendances");
        setAttendances([]);
        setAttendancePagination(emptyPagination);
      } finally {
        setAttendanceLoading(false);
      }
    },
    [attendanceFilters, activeChurch]
  );

  const createAttendance = useCallback(
    async (payload) => {
      setAttendanceLoading(true);
      setAttendanceError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        await apiCreateAttendance(payload);
        await fetchAttendances();
      } catch (e) {
        setAttendanceError(e?.response?.data?.message || e?.message || "Failed to create attendance");
        throw e;
      } finally {
        setAttendanceLoading(false);
      }
    },
    [fetchAttendances, activeChurch]
  );

  const updateAttendance = useCallback(
    async (id, payload) => {
      setAttendanceLoading(true);
      setAttendanceError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        await apiUpdateAttendance(id, payload);
        await fetchAttendances();
      } catch (e) {
        setAttendanceError(e?.response?.data?.message || e?.message || "Failed to update attendance");
        throw e;
      } finally {
        setAttendanceLoading(false);
      }
    },
    [fetchAttendances, activeChurch]
  );

  const deleteAttendance = useCallback(
    async (id) => {
      setAttendanceLoading(true);
      setAttendanceError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        await apiDeleteAttendance(id);
        await fetchAttendances();
      } catch (e) {
        setAttendanceError(e?.response?.data?.message || e?.message || "Failed to delete attendance");
        throw e;
      } finally {
        setAttendanceLoading(false);
      }
    },
    [fetchAttendances, activeChurch]
  );

  const fetchVisitors = useCallback(
    async (partial) => {
      const nextFilters = { ...visitorFilters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.search) params.search = nextFilters.search;

      setVisitorFiltersState(nextFilters);
      setVisitorLoading(true);
      setVisitorError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        const res = await getVisitors(params);
        const payload = res?.data?.data ?? res?.data;

        setVisitors(payload?.visitors || []);
        setVisitorPagination(payload?.pagination || emptyPagination);
        setVisitorStats(payload?.stats || { totalVisitors: 0, thisWeekVisitors: 0, thisMonthVisitors: 0, convertedVisitors: 0 });
      } catch (e) {
        setVisitorError(e?.response?.data?.message || e?.message || "Failed to fetch visitors");
        setVisitors([]);
        setVisitorPagination(emptyPagination);
        setVisitorStats({ totalVisitors: 0, thisWeekVisitors: 0, thisMonthVisitors: 0, convertedVisitors: 0 });
      } finally {
        setVisitorLoading(false);
      }
    },
    [visitorFilters, activeChurch]
  );

  const fetchVisitorStats = useCallback(async () => {
    try {
      if (!activeChurch) return;
      const res = await getVisitors({ page: 1, limit: 1 });
      const payload = res?.data?.data ?? res?.data;
      setVisitorStats(payload?.stats || { totalVisitors: 0, thisWeekVisitors: 0, thisMonthVisitors: 0, convertedVisitors: 0 });
    } catch {
      setVisitorStats({ totalVisitors: 0, thisWeekVisitors: 0, thisMonthVisitors: 0, convertedVisitors: 0 });
    }
  }, [activeChurch]);

  const createVisitor = useCallback(
    async (payload) => {
      setVisitorLoading(true);
      setVisitorError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        await apiCreateVisitor(payload);
        await fetchVisitors();
      } catch (e) {
        setVisitorError(e?.response?.data?.message || e?.message || "Failed to create visitor");
        throw e;
      } finally {
        setVisitorLoading(false);
      }
    },
    [fetchVisitors, activeChurch]
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
      setVisitorLoading(true);
      setVisitorError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        await apiUpdateVisitor(id, payload);
        await fetchVisitors();
      } catch (e) {
        setVisitorError(e?.response?.data?.message || e?.message || "Failed to update visitor");
        throw e;
      } finally {
        setVisitorLoading(false);
      }
    },
    [fetchVisitors, activeChurch]
  );

  const deleteVisitor = useCallback(
    async (id) => {
      setVisitorLoading(true);
      setVisitorError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        await apiDeleteVisitor(id);
        await fetchVisitors();
      } catch (e) {
        setVisitorError(e?.response?.data?.message || e?.message || "Failed to delete visitor");
        throw e;
      } finally {
        setVisitorLoading(false);
      }
    },
    [fetchVisitors, activeChurch]
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
