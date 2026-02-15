import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

import ChurchContext from "../Church/church.store.js";
import {
  createGeneralExpenses as apiCreateGeneralExpenses,
  deleteGeneralExpenses as apiDeleteGeneralExpenses,
  getGeneralExpenses as apiGetGeneralExpenses,
  getGeneralExpensesKPI as apiGetGeneralExpensesKPI,
  updateGeneralExpenses as apiUpdateGeneralExpenses
} from "./services/expenses.api.js";

const ExpensesContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyFilters = {
  page: 1,
  limit: 10,
  category: "",
  dateFrom: "",
  dateTo: ""
};

export function ExpensesProvider({ children }) {
  const [generalExpenses, setGeneralExpenses] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFiltersState] = useState(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const churchStore = useContext(ChurchContext);
  const [activeChurchId, setActiveChurchId] = useState(null);

  useEffect(() => {
    const id = churchStore?.activeChurch?._id || null;
    setActiveChurchId(id);
  }, [churchStore?.activeChurch]);

  const setFilters = useCallback((partial) => {
    setFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const fetchGeneralExpenses = useCallback(
    async (partial) => {
      const nextFilters = { ...filters, ...(partial || {}) };

      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.category) params.category = nextFilters.category;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await apiGetGeneralExpenses(params);
        const payload = res?.data?.data ?? res?.data;

        setGeneralExpenses(Array.isArray(payload?.generalExpenses) ? payload.generalExpenses : []);
        setPagination(payload?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch general expenses");
        setGeneralExpenses([]);
        setPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const createGeneralExpenses = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiCreateGeneralExpenses(payload);
        await fetchGeneralExpenses();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create general expense");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchGeneralExpenses]
  );

  const updateGeneralExpenses = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);

      try {
        await apiUpdateGeneralExpenses(id, payload);
        await fetchGeneralExpenses();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update general expense");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchGeneralExpenses]
  );

  const deleteGeneralExpenses = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        await apiDeleteGeneralExpenses(id);
        await fetchGeneralExpenses();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete general expense");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchGeneralExpenses]
  );

  const getGeneralExpensesKPI = useCallback(async () => {
    return await apiGetGeneralExpensesKPI();
  }, [activeChurchId]);

  const value = useMemo(() => {
    return {
      activeChurchId,
      generalExpenses,
      pagination,
      filters,
      loading,
      error,
      setFilters,
      fetchGeneralExpenses,
      createGeneralExpenses,
      updateGeneralExpenses,
      deleteGeneralExpenses,
      getGeneralExpensesKPI
    };
  }, [
    activeChurchId,
    generalExpenses,
    pagination,
    filters,
    loading,
    error,
    setFilters,
    fetchGeneralExpenses,
    createGeneralExpenses,
    updateGeneralExpenses,
    deleteGeneralExpenses,
    getGeneralExpensesKPI
  ]);

  return createElement(
    ExpensesContext.Provider,
    {
      value
    },
    children
  );
}

export default ExpensesContext;
