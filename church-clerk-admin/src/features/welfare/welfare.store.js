import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

import ChurchContext from "../Church/church.store.js";
import {
  createWelfareContribution as apiCreateWelfareContribution,
  deleteWelfareContribution as apiDeleteWelfareContribution,
  getWelfareContributions as apiGetWelfareContributions,
  updateWelfareContribution as apiUpdateWelfareContribution
} from "./contributions/services/welfareContributions.api.js";
import {
  createWelfareDisbursement as apiCreateWelfareDisbursement,
  deleteWelfareDisbursement as apiDeleteWelfareDisbursement,
  getWelfareDisbursements as apiGetWelfareDisbursements,
  updateWelfareDisbursement as apiUpdateWelfareDisbursement
} from "./disbursements/services/welfareDisbursements.api.js";
import { getWelfareKPI as apiGetWelfareKPI } from "./services/welfare.api.js";
import { searchWelfareMembers as apiSearchWelfareMembers } from "./services/welfareMembers.api.js";

const WelfareContext = createContext(null);

const emptyPagination = {
  totalPages: 0,
  currentPage: 1,
  nextPage: null,
  prevPage: null
};

const emptyContributionFilters = {
  page: 1,
  limit: 10,
  search: "",
  dateFrom: "",
  dateTo: ""
};

const emptyDisbursementFilters = {
  page: 1,
  limit: 10,
  category: "",
  search: "",
  dateFrom: "",
  dateTo: ""
};

export function WelfareProvider({ children }) {
  const churchStore = useContext(ChurchContext);
  const [activeChurchId, setActiveChurchId] = useState(null);

  const [contributions, setContributions] = useState([]);
  const [disbursements, setDisbursements] = useState([]);

  const [contributionPagination, setContributionPagination] = useState(emptyPagination);
  const [disbursementPagination, setDisbursementPagination] = useState(emptyPagination);

  const [contributionFilters, setContributionFiltersState] = useState(emptyContributionFilters);
  const [disbursementFilters, setDisbursementFiltersState] = useState(emptyDisbursementFilters);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = churchStore?.activeChurch?._id || null;
    setActiveChurchId(id);
  }, [churchStore?.activeChurch]);

  const setContributionFilters = useCallback((partial) => {
    setContributionFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const setDisbursementFilters = useCallback((partial) => {
    setDisbursementFiltersState((prev) => ({ ...prev, ...(partial || {}) }));
  }, []);

  const fetchContributions = useCallback(
    async (partial) => {
      const nextFilters = { ...contributionFilters, ...(partial || {}) };
      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setContributionFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await apiGetWelfareContributions(params);
        const payload = res?.data?.data ?? res?.data;

        setContributions(Array.isArray(payload?.welfareContribution) ? payload.welfareContribution : []);
        setContributionPagination(payload?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch welfare contributions");
        setContributions([]);
        setContributionPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [contributionFilters]
  );

  const fetchDisbursements = useCallback(
    async (partial) => {
      const nextFilters = { ...disbursementFilters, ...(partial || {}) };
      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.category) params.category = nextFilters.category;
      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.dateFrom) params.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) params.dateTo = nextFilters.dateTo;

      setDisbursementFiltersState(nextFilters);
      setLoading(true);
      setError(null);

      try {
        const res = await apiGetWelfareDisbursements(params);
        const payload = res?.data?.data ?? res?.data;

        setDisbursements(Array.isArray(payload?.welfareDisbursement) ? payload.welfareDisbursement : []);
        setDisbursementPagination(payload?.pagination || emptyPagination);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to fetch welfare disbursements");
        setDisbursements([]);
        setDisbursementPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [disbursementFilters]
  );

  const createContribution = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiCreateWelfareContribution(payload);
        await fetchContributions();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create welfare contribution");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchContributions]
  );

  const updateContribution = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiUpdateWelfareContribution(id, payload);
        await fetchContributions();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update welfare contribution");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchContributions]
  );

  const deleteContribution = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await apiDeleteWelfareContribution(id);
        await fetchContributions();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete welfare contribution");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchContributions]
  );

  const createDisbursement = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiCreateWelfareDisbursement(payload);
        await fetchDisbursements();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to create welfare disbursement");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchDisbursements]
  );

  const updateDisbursement = useCallback(
    async (id, payload) => {
      setLoading(true);
      setError(null);
      try {
        await apiUpdateWelfareDisbursement(id, payload);
        await fetchDisbursements();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update welfare disbursement");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchDisbursements]
  );

  const deleteDisbursement = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await apiDeleteWelfareDisbursement(id);
        await fetchDisbursements();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to delete welfare disbursement");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchDisbursements]
  );

  const getWelfareKPI = useCallback(async () => {
    return await apiGetWelfareKPI();
  }, [activeChurchId]);

  const searchMembers = useCallback(
    async (search) => {
      const res = await apiSearchWelfareMembers(search);
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      return Array.isArray(data?.members) ? data.members : Array.isArray(payload?.members) ? payload.members : [];
    },
    [activeChurchId]
  );

  const value = useMemo(() => {
    return {
      activeChurchId,
      contributions,
      disbursements,
      contributionPagination,
      disbursementPagination,
      contributionFilters,
      disbursementFilters,
      setContributionFilters,
      setDisbursementFilters,
      fetchContributions,
      fetchDisbursements,
      createContribution,
      updateContribution,
      deleteContribution,
      createDisbursement,
      updateDisbursement,
      deleteDisbursement,
      getWelfareKPI,
      searchMembers,
      loading,
      error
    };
  }, [
    activeChurchId,
    contributions,
    disbursements,
    contributionPagination,
    disbursementPagination,
    contributionFilters,
    disbursementFilters,
    setContributionFilters,
    setDisbursementFilters,
    fetchContributions,
    fetchDisbursements,
    createContribution,
    updateContribution,
    deleteContribution,
    createDisbursement,
    updateDisbursement,
    deleteDisbursement,
    getWelfareKPI,
    searchMembers,
    loading,
    error
  ]);

  return createElement(
    WelfareContext.Provider,
    {
      value
    },
    children
  );
}

export default WelfareContext;
