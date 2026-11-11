import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import MemberCareContext from "../memberCare.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { getPrayerRequests } from "../services/memberCare.api.js";
import { PRAYER_CATEGORIES, PRAYER_STATUSES } from "../constants.js";

function PrayerRequestFilters() {
  const store = useContext(MemberCareContext);
  const [searchValue, setSearchValue] = useState(store?.prayerFilters?.search || "");

  const fetchRef = useRef(store?.fetchPrayerRequests);
  useEffect(() => { fetchRef.current = store?.fetchPrayerRequests; });

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
  }, []);

  useEffect(() => {
    setSearchValue(store?.prayerFilters?.search || "");
  }, [store?.prayerFilters?.search]);

  useEffect(() => {
    return () => { debouncedSearch.cancel(); };
  }, [debouncedSearch]);

  const onSearchChange = (next) => {
    setSearchValue(next);
    store?.setPrayerFilters?.({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const applySelect = (key, value) => {
    store?.setPrayerFilters?.({ [key]: value, page: 1 });
    store?.fetchPrayerRequests?.({ [key]: value, page: 1 });
  };

  const selectConfigs = [
    {
      key: "status",
      value: store?.prayerFilters?.status || "",
      onChange: (v) => applySelect("status", v),
      options: PRAYER_STATUSES,
      placeholder: "All statuses"
    },
    {
      key: "category",
      value: store?.prayerFilters?.category || "",
      onChange: (v) => applySelect("category", v),
      options: PRAYER_CATEGORIES,
      placeholder: "All categories"
    }
  ];

  const mobileFilters = [
    {
      key: "status",
      label: "Status",
      value: store?.prayerFilters?.status || "",
      defaultValue: "",
      options: [{ label: "All statuses", value: "" }, ...PRAYER_STATUSES]
    },
    {
      key: "category",
      label: "Category",
      value: store?.prayerFilters?.category || "",
      defaultValue: "",
      options: [{ label: "All categories", value: "" }, ...PRAYER_CATEGORIES]
    }
  ];

  const onMobileApply = (pending) => {
    store?.setPrayerFilters?.({ ...pending, page: 1 });
    store?.fetchPrayerRequests?.({ ...pending, page: 1 });
  };

  const getLiveCount = useCallback(async ({ filters: f }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (searchValue) params.search = searchValue;
      if (f?.status) params.status = f.status;
      if (f?.category) params.category = f.category;
      const res = await getPrayerRequests(params);
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
        searchPlaceholder="Search request, requester..."
        searchWidth="md:w-[300px]"
        selects={selectConfigs}
      />
      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search request, requester..."
        filters={mobileFilters}
        onApply={onMobileApply}
        resultCount={store?.prayerPagination?.totalResult ?? null}
        getLiveCount={getLiveCount}
      />
    </>
  );
}

export default PrayerRequestFilters;
