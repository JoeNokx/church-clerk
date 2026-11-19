import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import ChurchContext from "../church/church.store.js";
import {
  getCareCases as apiGetCareCases,
  createCareCase as apiCreateCareCase,
  updateCareCase as apiUpdateCareCase,
  deleteCareCase as apiDeleteCareCase,
  getCareCaseById as apiGetCareCaseById,
  getCareVisits as apiGetCareVisits,
  getVisitsByCase as apiGetVisitsByCase,
  createCareVisit as apiCreateCareVisit,
  updateCareVisit as apiUpdateCareVisit,
  deleteCareVisit as apiDeleteCareVisit,
  getMemberCareKPI as apiGetMemberCareKPI,
  searchCareMembers as apiSearchCareMembers
} from "./services/memberCare.api.js";

const MemberCareContext = createContext(null);

const emptyPagination = {
  totalResult: 0,
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyCaseFilters = {
  page: 1,
  limit: 20,
  search: "",
  status: "",
  category: "",
  priority: "",
  dateFrom: "",
  dateTo: ""
};

const emptyVisitFilters = {
  page: 1,
  limit: 20,
  search: "",
  visitType: "",
  dateFrom: "",
  dateTo: ""
};

export function MemberCareProvider({ children }) {
  const churchStore = useContext(ChurchContext);
  const [activeChurchId, setActiveChurchId] = useState(null);

  const [cases, setCases] = useState([]);
  const [visits, setVisits] = useState([]);

  const [casePagination, setCasePagination] = useState(emptyPagination);
  const [visitPagination, setVisitPagination] = useState(emptyPagination);

  const [caseFilters, setCaseFiltersState] = useState(emptyCaseFilters);
  const [visitFilters, setVisitFiltersState] = useState(emptyVisitFilters);
  const caseFiltersRef = useRef(emptyCaseFilters);
  const visitFiltersRef = useRef(emptyVisitFilters);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestIdRef = useRef({ cases: 0, visits: 0 });

  useEffect(() => {
    const id = churchStore?.activeChurch?._id || null;
    setActiveChurchId(id);
  }, [churchStore?.activeChurch]);

  const setCaseFilters = useCallback((partial) => {
    setCaseFiltersState((prev) => {
      const next = { ...prev, ...(partial || {}) };
      caseFiltersRef.current = next;
      return next;
    });
  }, []);

  const setVisitFilters = useCallback((partial) => {
    setVisitFiltersState((prev) => {
      const next = { ...prev, ...(partial || {}) };
      visitFiltersRef.current = next;
      return next;
    });
  }, []);

  const pickParams = (f) => {
    const params = { page: f.page, limit: f.limit };
    Object.keys(f).forEach((k) => {
      if (k !== "page" && k !== "limit" && f[k]) params[k] = f[k];
    });
    return params;
  };

  const fetchCases = useCallback(async (partial) => {
    const requestId = (requestIdRef.current.cases += 1);
    const nextFilters = { ...caseFiltersRef.current, ...(partial || {}) };
    caseFiltersRef.current = nextFilters;
    setCaseFiltersState(nextFilters);
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetCareCases(pickParams(nextFilters));
      const payload = res?.data?.data ?? res?.data;
      if (requestId !== requestIdRef.current.cases) return;
      setCases(Array.isArray(payload?.careCases) ? payload.careCases : []);
      setCasePagination(payload?.pagination || emptyPagination);
    } catch (e) {
      if (requestId !== requestIdRef.current.cases) return;
      setError(e?.response?.data?.message || e?.message || "Failed to fetch care cases");
      setCases([]);
      setCasePagination(emptyPagination);
    } finally {
      if (requestId === requestIdRef.current.cases) setLoading(false);
    }
  }, []);

  const fetchVisits = useCallback(async (partial) => {
    const requestId = (requestIdRef.current.visits += 1);
    const nextFilters = { ...visitFiltersRef.current, ...(partial || {}) };
    visitFiltersRef.current = nextFilters;
    setVisitFiltersState(nextFilters);
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetCareVisits(pickParams(nextFilters));
      const payload = res?.data?.data ?? res?.data;
      if (requestId !== requestIdRef.current.visits) return;
      setVisits(Array.isArray(payload?.careVisits) ? payload.careVisits : []);
      setVisitPagination(payload?.pagination || emptyPagination);
    } catch (e) {
      if (requestId !== requestIdRef.current.visits) return;
      setError(e?.response?.data?.message || e?.message || "Failed to fetch care visits");
      setVisits([]);
      setVisitPagination(emptyPagination);
    } finally {
      if (requestId === requestIdRef.current.visits) setLoading(false);
    }
  }, []);

  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([fetchCases(), fetchVisits()]);
  }, [fetchCases, fetchVisits]);

  const createCase = useCallback(async (payload) => {
    const res = await apiCreateCareCase(payload);
    await fetchCases();
    return res;
  }, [fetchCases]);

  const updateCase = useCallback(async (id, payload) => {
    const res = await apiUpdateCareCase(id, payload);
    await fetchCases();
    return res;
  }, [fetchCases]);

  const deleteCase = useCallback(async (id) => {
    const res = await apiDeleteCareCase(id);
    await Promise.all([fetchCases(), fetchVisits()]);
    return res;
  }, [fetchCases, fetchVisits]);

  const getCase = useCallback(async (id) => {
    const res = await apiGetCareCaseById(id);
    return res?.data?.data ?? res?.data;
  }, []);

  const getCaseVisits = useCallback(async (caseId) => {
    const res = await apiGetVisitsByCase(caseId);
    const payload = res?.data?.data ?? res?.data;
    return Array.isArray(payload?.careVisits) ? payload.careVisits : [];
  }, []);

  const createVisit = useCallback(async (caseId, payload) => {
    const res = await apiCreateCareVisit(caseId, payload);
    await Promise.all([fetchVisits(), fetchCases()]);
    return res;
  }, [fetchVisits, fetchCases]);

  const updateVisit = useCallback(async (id, payload) => {
    const res = await apiUpdateCareVisit(id, payload);
    await fetchVisits();
    return res;
  }, [fetchVisits]);

  const deleteVisit = useCallback(async (id) => {
    const res = await apiDeleteCareVisit(id);
    await fetchVisits();
    return res;
  }, [fetchVisits]);

  const getKPI = useCallback(async () => {
    return await apiGetMemberCareKPI();
  }, []);

  const searchMembers = useCallback(async (search) => {
    const res = await apiSearchCareMembers(search);
    const payload = res?.data?.data ?? res?.data;
    return Array.isArray(payload?.members) ? payload.members : [];
  }, []);

  const value = useMemo(() => ({
    activeChurchId,
    cases,
    visits,
    casePagination,
    visitPagination,
    caseFilters,
    visitFilters,
    setCaseFilters,
    setVisitFilters,
    fetchCases,
    fetchVisits,
    refreshAfterMutation,
    createCase,
    updateCase,
    deleteCase,
    getCase,
    getCaseVisits,
    createVisit,
    updateVisit,
    deleteVisit,
    getKPI,
    searchMembers,
    loading,
    error
  }), [
    activeChurchId, cases, visits,
    casePagination, visitPagination,
    caseFilters, visitFilters,
    setCaseFilters, setVisitFilters,
    fetchCases, fetchVisits, refreshAfterMutation,
    createCase, updateCase, deleteCase, getCase, getCaseVisits,
    createVisit, updateVisit, deleteVisit,
    getKPI, searchMembers, loading, error
  ]);

  return createElement(MemberCareContext.Provider, { value }, children);
}

export default MemberCareContext;
