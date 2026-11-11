import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import MemberCareContext from "../memberCare.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { getCareVisits } from "../services/memberCare.api.js";
import { VISIT_TYPES } from "../constants.js";

function VisitFilters() {
  const store = useContext(MemberCareContext);
  const [searchValue, setSearchValue] = useState(store?.visitFilters?.search || "");

  const fetchRef = useRef(store?.fetchVisits);
  useEffect(() => { fetchRef.current = store?.fetchVisits; });

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
  }, []);

  const appliedDateFrom = store?.visitFilters?.dateFrom || "";
  const appliedDateTo = store?.visitFilters?.dateTo || "";

  useEffect(() => {
    setSearchValue(store?.visitFilters?.search || "");
  }, [store?.visitFilters?.search]);

  useEffect(() => {
    return () => { debouncedSearch.cancel(); };
  }, [debouncedSearch]);

  const onSearchChange = (next) => {
    setSearchValue(next);
    store?.setVisitFilters?.({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const applySelect = (key, value) => {
    store?.setVisitFilters?.({ [key]: value, page: 1 });
    store?.fetchVisits?.({ [key]: value, page: 1 });
  };

  const applyDates = async (from, to) => {
    store?.setVisitFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchVisits?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  const selectConfigs = [
    {
      key: "visitType",
      value: store?.visitFilters?.visitType || "",
      onChange: (v) => applySelect("visitType", v),
      options: VISIT_TYPES,
      placeholder: "All types"
    }
  ];

  const mobileFilters = [
    {
      key: "visitType",
      label: "Visit type",
      value: store?.visitFilters?.visitType || "",
      defaultValue: "",
      options: [{ label: "All types", value: "" }, ...VISIT_TYPES]
    }
  ];

  const onMobileApply = (pending) => {
    store?.setVisitFilters?.({ ...pending, page: 1 });
    store?.fetchVisits?.({ ...pending, page: 1 });
  };

  const getLiveCount = useCallback(async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (searchValue) params.search = searchValue;
      if (f?.visitType) params.visitType = f.visitType;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;
      const res = await getCareVisits(params);
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
        searchPlaceholder="Search member name..."
        searchWidth="md:w-[300px]"
        selects={selectConfigs}
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search member name..."
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        filters={mobileFilters}
        onApply={onMobileApply}
        resultCount={store?.visitPagination?.totalResult ?? null}
        getLiveCount={getLiveCount}
      />
    </>
  );
}

export default VisitFilters;
