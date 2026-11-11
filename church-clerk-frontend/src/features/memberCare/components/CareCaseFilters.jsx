import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import MemberCareContext from "../memberCare.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { getCareCases } from "../services/memberCare.api.js";
import { CASE_CATEGORIES, CASE_PRIORITIES, CASE_STATUSES } from "../constants.js";

function CareCaseFilters() {
  const store = useContext(MemberCareContext);
  const [searchValue, setSearchValue] = useState(store?.caseFilters?.search || "");

  const fetchRef = useRef(store?.fetchCases);
  useEffect(() => { fetchRef.current = store?.fetchCases; });

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
  }, []);

  const appliedDateFrom = store?.caseFilters?.dateFrom || "";
  const appliedDateTo = store?.caseFilters?.dateTo || "";

  useEffect(() => {
    setSearchValue(store?.caseFilters?.search || "");
  }, [store?.caseFilters?.search]);

  useEffect(() => {
    return () => { debouncedSearch.cancel(); };
  }, [debouncedSearch]);

  const onSearchChange = (next) => {
    setSearchValue(next);
    store?.setCaseFilters?.({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const applySelect = (key, value) => {
    store?.setCaseFilters?.({ [key]: value, page: 1 });
    store?.fetchCases?.({ [key]: value, page: 1 });
  };

  const applyDates = async (from, to) => {
    store?.setCaseFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchCases?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  const selectConfigs = [
    {
      key: "status",
      value: store?.caseFilters?.status || "",
      onChange: (v) => applySelect("status", v),
      options: CASE_STATUSES,
      placeholder: "All statuses"
    },
    {
      key: "category",
      value: store?.caseFilters?.category || "",
      onChange: (v) => applySelect("category", v),
      options: CASE_CATEGORIES,
      placeholder: "All categories"
    },
    {
      key: "priority",
      value: store?.caseFilters?.priority || "",
      onChange: (v) => applySelect("priority", v),
      options: CASE_PRIORITIES,
      placeholder: "All priorities"
    }
  ];

  const mobileFilters = [
    {
      key: "status",
      label: "Status",
      value: store?.caseFilters?.status || "",
      defaultValue: "",
      options: [{ label: "All statuses", value: "" }, ...CASE_STATUSES]
    },
    {
      key: "category",
      label: "Category",
      value: store?.caseFilters?.category || "",
      defaultValue: "",
      options: [{ label: "All categories", value: "" }, ...CASE_CATEGORIES]
    },
    {
      key: "priority",
      label: "Priority",
      value: store?.caseFilters?.priority || "",
      defaultValue: "",
      options: [{ label: "All priorities", value: "" }, ...CASE_PRIORITIES]
    }
  ];

  const onMobileApply = (pending) => {
    store?.setCaseFilters?.({ ...pending, page: 1 });
    store?.fetchCases?.({ ...pending, page: 1 });
  };

  const getLiveCount = useCallback(async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (searchValue) params.search = searchValue;
      if (f?.status) params.status = f.status;
      if (f?.category) params.category = f.category;
      if (f?.priority) params.priority = f.priority;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;
      const res = await getCareCases(params);
      const payload = res?.data?.data ?? res?.data;
      return payload?.pagination?.totalResult ?? null;
    } catch {
      return null;
    }
  }, [searchValue]);

  return (
    <>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search member, title, ref..."
        searchWidth="md:w-[300px]"
        selects={selectConfigs}
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search member, title, ref..."
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        filters={mobileFilters}
        onApply={onMobileApply}
        resultCount={store?.casePagination?.totalResult ?? null}
        getLiveCount={getLiveCount}
      />
    </>
  );
}

export default CareCaseFilters;
