import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import BudgetingContext from "../budgeting.store.js";
import debounce from "../../../shared/utils/debounce.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { getBudgets } from "../services/budgeting.api.js";

function BudgetingFilters() {
  const store = useContext(BudgetingContext);

  const [search, setSearch] = useState("");

  const years = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    return [y - 1, y, y + 1, y + 2];
  }, []);

  const debouncedFetch = useMemo(() => {
    return debounce((value) => {
      store?.setFilters?.({ search: value, page: 1 });
      void store?.fetchBudgets?.({ search: value, page: 1 });
    }, 400);
  }, [store]);

  useEffect(() => {
    setSearch(store?.filters?.search || "");
  }, [store?.filters?.search]);

  useEffect(() => {
    return () => { debouncedFetch.cancel?.(); };
  }, [debouncedFetch]);

  const onChange = (value) => {
    setSearch(value);
    debouncedFetch(value);
  };

  const onFiscalYearChange = async (value) => {
    store?.setFilters?.({ fiscalYear: value, page: 1 });
    void store?.fetchBudgets?.({ fiscalYear: value, page: 1 });
  };

  const onStatusChange = async (value) => {
    store?.setFilters?.({ status: value, page: 1 });
    void store?.fetchBudgets?.({ status: value, page: 1 });
  };

  const yearOptions = useMemo(
    () => years.map((y) => ({ label: String(y), value: String(y) })),
    [years]
  );

  const STATUS_OPTIONS = [
    { label: "All Statuses", value: "" },
    { label: "Draft", value: "draft" },
    { label: "Active", value: "active" },
    { label: "Archived", value: "archived" },
  ];

  const selectConfigs = [
    {
      key: "fiscalYear",
      value: store?.filters?.fiscalYear || "",
      onChange: (v) => onFiscalYearChange(v),
      options: yearOptions,
      placeholder: "All Years",
    },
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
      label: "Fiscal Year",
      value: store?.filters?.fiscalYear || "",
      defaultValue: "",
      options: [{ label: "All Years", value: "" }, ...yearOptions],
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
      />
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
