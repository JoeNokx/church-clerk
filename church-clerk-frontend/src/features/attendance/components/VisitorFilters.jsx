import { useCallback, useContext, useEffect, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import AttendanceContext from "../attendance.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { getVisitors } from "../services/attendance.api.js";

function VisitorFilters() {
  const store = useContext(AttendanceContext);
  const [value, setValue] = useState(store?.visitorFilters?.search || "");

  const appliedDateFrom = store?.visitorFilters?.dateFrom || "";
  const appliedDateTo = store?.visitorFilters?.dateTo || "";

  const fetchRef = useRef(store?.fetchVisitors);
  useEffect(() => { fetchRef.current = store?.fetchVisitors; });

  const debouncedSearch = useRef(null);
  useEffect(() => {
    debouncedSearch.current = debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
    return () => debouncedSearch.current?.cancel();
  }, []);

  const storeSearch = store?.visitorFilters?.search || "";
  const [prevStoreSearch, setPrevStoreSearch] = useState(storeSearch);
  if (storeSearch !== prevStoreSearch) {
    setPrevStoreSearch(storeSearch);
    setValue(storeSearch);
  }

  const onChange = (e) => {
    const next = e.target.value;
    setValue(next);
    store?.setVisitorFilters({ search: next, page: 1 });
    debouncedSearch.current?.(next);
  };

  const onSourceChange = (e) => {
    const next = e.target.value;
    store?.setVisitorFilters({ source: next, page: 1 });
    store?.fetchVisitors({ source: next, page: 1 });
  };

  const applyDates = (from, to) => {
    store?.setVisitorFilters({ dateFrom: from, dateTo: to, page: 1 });
    store?.fetchVisitors({ dateFrom: from, dateTo: to, page: 1 });
  };

  const SOURCE_OPTIONS = [
    { label: "Church member", value: "Church member" },
    { label: "Friend or family", value: "Friend or family" },
    { label: "Church outreach", value: "Church outreach" },
    { label: "Church program", value: "Church program" },
    { label: "Social media", value: "Social media" },
    { label: "Church website", value: "Church website" },
    { label: "Online search", value: "Online search" },
    { label: "Flyer", value: "Flyer" },
    { label: "Radio or television", value: "Radio or television" },
    { label: "Passed by", value: "Passed by" },
    { label: "Other", value: "Other" },
  ];

  const selectConfigs = [
    {
      key: "source",
      value: store?.visitorFilters?.source || "",
      onChange: (v) => onSourceChange({ target: { value: v } }),
      options: SOURCE_OPTIONS,
      placeholder: "All Sources",
    },
  ];

  const mobileFilters = [
    {
      key: "source",
      label: "Source",
      value: store?.visitorFilters?.source || "",
      defaultValue: "",
      options: [{ label: "All Sources", value: "" }, ...SOURCE_OPTIONS],
    },
  ];

  const getLiveCount = useCallback(async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (f?.source && f.source !== "") params.source = f.source;
      if (value) params.search = value;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;
      const res = await getVisitors(params);
      const payload = res?.data?.data ?? res?.data;
      return payload?.pagination?.totalResult ?? null;
    } catch {
      return null;
    }
  }, [value]);

  const onMobileApply = (pending) => {
    store?.setVisitorFilters({ source: pending.source, page: 1 });
    store?.fetchVisitors({ source: pending.source, page: 1 });
  };

  return (
    <>
      <FilterBar
        searchValue={value}
        onSearchChange={(v) => onChange({ target: { value: v } })}
        searchPlaceholder="Name or invited by"
        searchWidth="md:w-[320px]"
        selects={selectConfigs}
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={value}
        onSearchChange={(v) => onChange({ target: { value: v } })}
        searchPlaceholder="Name or invited by"
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        filters={mobileFilters}
        onApply={onMobileApply}
        resultCount={store?.visitorPagination?.totalResult ?? null}
        getLiveCount={getLiveCount}
      />
    </>
  );
}

export default VisitorFilters;
