import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { createMember as apiCreateMember, deleteMember as apiDeleteMember, getMembers, updateMember as apiUpdateMember } from "./services/member.api.js";
import ChurchContext from "../Church/church.store.js";

const MemberContext = createContext(null);

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
  status: "all",
  dateFrom: "",
  dateTo: ""
};

export function MemberProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFiltersState] = useState(emptyFilters);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const churchStore = useContext(ChurchContext);
  const [activeChurch, setActiveChurch] = useState(null);

  const fetchRequestIdRef = useRef(0);
  const fetchAbortRef = useRef(null);

  useEffect(() => {
    const churchId = churchStore?.activeChurch?._id || null;
    setActiveChurch(churchId);
  }, [churchStore?.activeChurch]);

  const setFilters = useCallback((partial) => {
    setFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const fetchMembers = useCallback(
    async (partial) => {
      const requestId = (fetchRequestIdRef.current += 1);

      const nextFilters = { ...filters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.status && nextFilters.status !== "all") params.status = nextFilters.status;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");

        if (fetchAbortRef.current) {
          fetchAbortRef.current.abort();
        }
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        const res = await getMembers(params, { signal: controller.signal });
        const payload = res?.data?.data ?? res?.data;

        if (requestId !== fetchRequestIdRef.current) return;

        setMembers(payload?.members || []);
        setPagination(payload?.pagination || emptyPagination);
      } catch (e) {
        if (requestId !== fetchRequestIdRef.current) return;
        if (e?.code === "ERR_CANCELED") return;
        setError(e?.response?.data?.message || e?.message || "Failed to fetch members");
        setMembers([]);
        setPagination(emptyPagination);
      } finally {
        if (requestId !== fetchRequestIdRef.current) return;
        setLoading(false);
      }
    },
    [filters, activeChurch]
  );

  const createMember = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        await apiCreateMember(payload);
        await fetchMembers();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create member");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchMembers, activeChurch]
  );

  const updateMember = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        await apiUpdateMember(id, payload);
        await fetchMembers();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update member");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchMembers, activeChurch]
  );

  const deleteMember = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        if (!activeChurch) throw new Error("Active church not selected");
        await apiDeleteMember(id);
        await fetchMembers();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete member");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchMembers, activeChurch]
  );

  const value = useMemo(() => {
    return {
      members,
      pagination,
      filters,
      loading,
      error,
      activeChurch,
      setFilters,
      fetchMembers,
      createMember,
      updateMember,
      deleteMember
    };
  }, [members, pagination, filters, loading, error, activeChurch, setFilters, fetchMembers, createMember, updateMember, deleteMember]);

  return createElement(
    MemberContext.Provider,
    {
      value
    },
    children
  );
}

export default MemberContext;
