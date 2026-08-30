import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import MemberContext from "../member.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { getMembers } from "../services/member.api.js";

const AGE_GROUP_OPTIONS = [
  { label: "All Ages", value: "all" },
  { label: "Children", value: "children" },
  { label: "Teenagers", value: "teenagers" },
  { label: "Youth", value: "youth" },
  { label: "Adult", value: "adult" },
  { label: "Elderly", value: "elderly" },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Dormant", value: "dormant" },
  { label: "Transferred", value: "transferred" },
  { label: "Left Church", value: "left_church" },
  { label: "Deceased", value: "deceased" },
  { label: "Temporarily Away", value: "temporarily_away" },
];

function MemberFilters() {
  const store = useContext(MemberContext);
  const [searchValue, setSearchValue] = useState(store?.filters?.search || "");

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      store?.fetchMembers?.({ search: next, page: 1 });
    }, 400);
  }, [store]);

  const appliedDateFrom = store?.filters?.dateFrom || "";
  const appliedDateTo = store?.filters?.dateTo || "";

  useEffect(() => {
    setSearchValue(store?.filters?.search || "");
  }, [store?.filters?.search]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);


  const onSearchChange = (e) => {
    const next = e.target.value;
    setSearchValue(next);
    store?.setFilters({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const onStatusChange = async (e) => {
    const value = e.target.value;
    store?.setFilters({ status: value, page: 1 });
    await store?.fetchMembers({ status: value, page: 1 });
  };

  const onAgeGroupChange = async (e) => {
    const value = e.target.value;
    store?.setFilters({ ageGroup: value, page: 1 });
    await store?.fetchMembers({ ageGroup: value, page: 1 });
  };

  const applyDates = async (from, to) => {
    store?.setFilters({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchMembers({ dateFrom: from, dateTo: to, page: 1 });
  };

  const onMobileSearchChange = (val) => {
    setSearchValue(val);
    store?.setFilters({ search: val, page: 1 });
    debouncedSearch(val);
  };

  const getLiveCount = useCallback(async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (f?.status && f.status !== "all") params.status = f.status;
      if (f?.ageGroup && f.ageGroup !== "all") params.ageGroup = f.ageGroup;
      if (searchValue) params.search = searchValue;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;
      const res = await getMembers(params);
      const payload = res?.data?.data ?? res?.data;
      return payload?.pagination?.totalResult ?? null;
    } catch {
      return null;
    }
  }, [searchValue]);

  const onMobileFiltersApply = async (pending) => {
    store?.setFilters({ status: pending.status, ageGroup: pending.ageGroup, page: 1 });
    await store?.fetchMembers({ status: pending.status, ageGroup: pending.ageGroup, page: 1 });
  };

  const mobileFilters = [
    {
      key: "status",
      label: "Status",
      value: store?.filters?.status || "all",
      defaultValue: "all",
      options: STATUS_OPTIONS,
    },
    {
      key: "ageGroup",
      label: "Age Group",
      value: store?.filters?.ageGroup || "all",
      defaultValue: "all",
      options: AGE_GROUP_OPTIONS,
    },
  ];

  const selectConfigs = [
    {
      key: "status",
      value: store?.filters?.status || "all",
      onChange: (v) => onStatusChange({ target: { value: v } }),
      options: STATUS_OPTIONS,
    },
    {
      key: "ageGroup",
      value: store?.filters?.ageGroup || "all",
      onChange: (v) => onAgeGroupChange({ target: { value: v } }),
      options: AGE_GROUP_OPTIONS,
    },
  ];

  return (
    <>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={(v) => onSearchChange({ target: { value: v } })}
        searchPlaceholder="Search name, phone or email..."
        searchWidth="md:w-[320px]"
        selects={selectConfigs}
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
      />

      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onMobileSearchChange}
        searchPlaceholder="Search name, phone or email..."
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        filters={mobileFilters}
        onApply={onMobileFiltersApply}
        resultCount={store?.pagination?.totalResult ?? null}
        getLiveCount={getLiveCount}
      />
    </>
  );
}

export default MemberFilters;
