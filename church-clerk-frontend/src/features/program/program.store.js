import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ChurchContext from "../church/church.store.js";
import { programQueryKeys, useProgramStatsQuery, useProgramsListQuery } from "./hooks/usePrograms.js";

const ProgramContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyStats = {
  upcomingPrograms: 0,
  ongoingPrograms: 0,
  pastPrograms: 0
};

const emptyFilters = {
  page: 1,
  limit: 20,
  search: "",
  category: ""
};

export function ProgramProvider({ children }) {
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

  const programsQuery = useProgramsListQuery({
    activeChurchId: activeChurch,
    status: activeStatus,
    filters,
    enabled: true
  });

  const statsQuery = useProgramStatsQuery({
    activeChurchId: activeChurch,
    filters,
    enabled: true
  });

  const programs = Array.isArray(programsQuery?.data?.programs) ? programsQuery.data.programs : [];
  const pagination = programsQuery?.data?.pagination || emptyPagination;

  const statsPayload = statsQuery?.data || emptyStats;
  const stats = {
    upcomingPrograms: Number(statsPayload?.upcomingPrograms || 0),
    ongoingPrograms: Number(statsPayload?.ongoingPrograms || 0),
    pastPrograms: Number(statsPayload?.pastPrograms || 0)
  };

  const error =
    programsQuery?.error?.response?.data?.message ||
    programsQuery?.error?.message ||
    null;

  const loading = Boolean(programsQuery?.isLoading);

  const fetchPrograms = useCallback(
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
          queryKey: programQueryKeys.programsPrefix(activeChurch),
          exact: false
        });
      }
    },
    [activeChurch, queryClient]
  );

  const fetchProgramStats = useCallback(
    async ({ force = false, ...partial } = {}) => {
      if (!activeChurch) return;

      const patch = partial || {};
      if (Object.keys(patch).length) {
        filtersRef.current = { ...(filtersRef.current || emptyFilters), ...patch };
        setFiltersState((prev) => ({ ...prev, ...patch }));
      }

      if (force) {
        await queryClient.invalidateQueries({
          queryKey: programQueryKeys.programsPrefix(activeChurch),
          exact: false
        });
      }
    },
    [activeChurch, queryClient]
  );

  const value = useMemo(() => {
    return {
      programs,
      pagination,
      filters,
      stats,
      loading,
      error,
      activeChurch,
      setFilters,
      fetchPrograms,
      fetchProgramStats
    };
  }, [programs, pagination, filters, stats, loading, error, activeChurch, setFilters, fetchPrograms, fetchProgramStats]);

  return createElement(
    ProgramContext.Provider,
    {
      value
    },
    children
  );
}

export default ProgramContext;
