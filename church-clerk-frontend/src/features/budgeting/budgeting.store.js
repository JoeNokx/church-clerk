import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import ChurchContext from "../church/church.store.js";
import {
  createBudget as apiCreateBudget,
  deleteBudget as apiDeleteBudget,
  getBudget as apiGetBudget,
  getBudgetSummary as apiGetBudgetSummary,
  getBudgets as apiGetBudgets,
  updateBudget as apiUpdateBudget
} from "./services/budgeting.api.js";

const BudgetingContext = createContext(null);

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
  fiscalYear: "",
  status: ""
};

export function BudgetingProvider({ children }) {
  const [budgets, setBudgets] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFiltersState] = useState(emptyFilters);
  const filtersRef = useRef(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const churchStore = useContext(ChurchContext);
  const [activeChurchId, setActiveChurchId] = useState(null);

  useEffect(() => {
    const id = churchStore?.activeChurch?._id || null;
    setActiveChurchId(id);
  }, [churchStore?.activeChurch]);

  const setFilters = useCallback((partial) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...(partial || {}) };
      filtersRef.current = next;
      return next;
    });
  }, []);

  const sameFilters = useCallback((a, b) => {
    const keys = Object.keys(emptyFilters);
    for (const k of keys) {
      const av = a?.[k] ?? "";
      const bv = b?.[k] ?? "";
      if (String(av) !== String(bv)) return false;
    }
    return true;
  }, []);

  const fetchBudgets = useCallback(
    async (partial) => {
      const prevFilters = filtersRef.current || emptyFilters;
      const nextFilters = { ...prevFilters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.fiscalYear) params.fiscalYear = nextFilters.fiscalYear;
      if (nextFilters.status) params.status = nextFilters.status;

      filtersRef.current = nextFilters;
      if (!sameFilters(prevFilters, nextFilters)) {
        setFiltersState(nextFilters);
      }
      setLoading(true);
      setError(null);

      try {
        const res = await apiGetBudgets(params);
        const payload = res?.data?.data ?? res?.data;

        setBudgets(Array.isArray(payload?.budgets) ? payload.budgets : []);
        setPagination(payload?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch budgets");
        setBudgets([]);
        setPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [sameFilters]
  );

  const getBudget = useCallback(async (id) => {
    return await apiGetBudget(id);
  }, []);

  const getBudgetSummary = useCallback(async (id) => {
    return await apiGetBudgetSummary(id);
  }, []);

  const createBudget = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiCreateBudget(payload);
        await fetchBudgets({ page: 1 });
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create budget");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchBudgets]
  );

  const updateBudget = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiUpdateBudget(id, payload);
        await fetchBudgets();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update budget");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchBudgets]
  );

  const deleteBudget = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await apiDeleteBudget(id);
        await fetchBudgets();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete budget");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchBudgets]
  );

  const value = useMemo(() => {
    return {
      activeChurchId,
      budgets,
      pagination,
      filters,
      loading,
      error,
      setFilters,
      fetchBudgets,
      getBudget,
      getBudgetSummary,
      createBudget,
      updateBudget,
      deleteBudget
    };
  }, [activeChurchId, budgets, pagination, filters, loading, error, setFilters, fetchBudgets, getBudget, getBudgetSummary, createBudget, updateBudget, deleteBudget]);

  return createElement(
    BudgetingContext.Provider,
    {
      value
    },
    children
  );
}

export default BudgetingContext;
