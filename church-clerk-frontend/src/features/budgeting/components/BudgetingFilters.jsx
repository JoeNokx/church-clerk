import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import BudgetingContext from "../budgeting.store.js";
import debounce from "../../../shared/utils/debounce.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { getBudgets } from "../services/budgeting.api.js";

function BudgetingFilters() {
  const store = useContext(BudgetingContext);

  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");

  const debouncedFetch = useMemo(() => {
    return debounce((value) => {
      store?.setFilters?.({ search: value, page: 1 });
      void store?.fetchBudgets?.({ search: value, page: 1 });
    }, 400);
  }, [store]);

  // Typing a year fires per keystroke — debounce so "202" then "2026"
  // doesn't issue two fetches.
  const debouncedYearFetch = useMemo(() => {
    return debounce((value) => {
      store?.setFilters?.({ fiscalYear: value, page: 1 });
      void store?.fetchBudgets?.({ fiscalYear: value, page: 1 });
    }, 400);
  }, [store]);

  useEffect(() => {
    setSearch(store?.filters?.search || "");
  }, [store?.filters?.search]);

  useEffect(() => {
    setYear(store?.filters?.fiscalYear || "");
  }, [store?.filters?.fiscalYear]);

  useEffect(() => {
    return () => { debouncedFetch.cancel?.(); debouncedYearFetch.cancel?.(); };
  }, [debouncedFetch, debouncedYearFetch]);

  const onChange = (value) => {
    setSearch(value);
    debouncedFetch(value);
  };

  const onFiscalYearChange = (value) => {
    // Digits only, capped at 4 — spinner arrows still work (type=number).
    const v = String(value || "").replace(/[^0-9]/g, "").slice(0, 4);
    setYear(v);
    debouncedYearFetch(v);
  };

  const onStatusChange = async (value) => {
    store?.setFilters?.({ status: value, page: 1 });
    void store?.fetchBudgets?.({ status: value, page: 1 });
  };

  const STATUS_OPTIONS = [
    { label: "All Statuses",    value: "" },
    { label: "Upcoming",        value: "upcoming" },
    { label: "Current",         value: "current" },
    { label: "Ended",           value: "ended" },
  ];

  const selectConfigs = [
    {
      key: "status",
      value: store?.filters?.status || "",
      onChange: (v) => onStatusChange(v),
      options: STATUS_OPTIONS.filter((o) => o.value !== ""),
      placeholder: "All Statuses",
    },
  ];

  const mobileFilters = [
    {
      key: "fiscalYear",
      label: "Financial Year",
      type: "number",
      placeholder: "All years",
      value: store?.filters?.fiscalYear || "",
      defaultValue: "",
    },
    {
      key: "status",
      label: "Status",
      value: store?.filters?.status || "",
      defaultValue: "",
      options: STATUS_OPTIONS,
    },
  ];

  const getLiveCount = useCallback(async ({ filters: f }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (f?.fiscalYear && f.fiscalYear !== "") params.fiscalYear = f.fiscalYear;
      if (f?.status && f.status !== "") params.status = f.status;
      if (search) params.search = search;
      const res = await getBudgets(params);
      const payload = res?.data?.data ?? res?.data;
      return payload?.pagination?.totalResult ?? payload?.pagination?.totalItems ?? null;
    } catch {
      return null;
    }
  }, [search]);

  const onMobileApply = (pending) => {
    store?.setFilters?.({ fiscalYear: pending.fiscalYear, status: pending.status, page: 1 });
    void store?.fetchBudgets?.({ fiscalYear: pending.fiscalYear, status: pending.status, page: 1 });
  };

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={onChange}
        searchPlaceholder="Search budget name..."
        searchWidth="md:w-[320px]"
        selects={selectConfigs}
      >
        <input
          type="number"
          value={year}
          onChange={(e) => onFiscalYearChange(e.target.value)}
          placeholder="Year"
          min="1900"
          max="2999"
          className="h-10 w-full md:w-[110px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </FilterBar>
      <MobileFilterBar
        searchValue={search}
        onSearchChange={onChange}
        searchPlaceholder="Search budget name..."
        filters={mobileFilters}
        onApply={onMobileApply}
        resultCount={store?.pagination?.totalResult ?? store?.pagination?.totalItems ?? null}
        getLiveCount={getLiveCount}
      />
    </>
  );
}

export default BudgetingFilters;
