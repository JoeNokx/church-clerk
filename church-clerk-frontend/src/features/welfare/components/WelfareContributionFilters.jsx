import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import WelfareContext from "../welfare.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { getWelfareContributions } from "../contributions/services/welfareContributions.api.js";

function WelfareContributionFilters() {
  const store = useContext(WelfareContext);

  const [searchValue, setSearchValue] = useState(store?.contributionFilters?.search || "");

  const fetchRef = useRef(store?.fetchContributions);
  useEffect(() => { fetchRef.current = store?.fetchContributions; });

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
  }, []);

  const appliedDateFrom = store?.contributionFilters?.dateFrom || "";
  const appliedDateTo = store?.contributionFilters?.dateTo || "";

  useEffect(() => {
    setSearchValue(store?.contributionFilters?.search || "");
  }, [store?.contributionFilters?.search]);

  useEffect(() => {
    return () => { debouncedSearch.cancel(); };
  }, [debouncedSearch]);

  const onSearchChange = (next) => {
    setSearchValue(next);
    store?.setContributionFilters?.({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const applyDates = async (from, to) => {
    store?.setContributionFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchContributions?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  const getLiveCount = useCallback(async ({ dateFrom: dFrom, dateTo: dTo }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (searchValue) params.search = searchValue;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;
      const res = await getWelfareContributions(params);
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
        searchPlaceholder="Search member name or recorded by"
        searchWidth="md:w-[320px]"
        selects={[]}
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search member name or recorded by"
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        resultCount={store?.contributionPagination?.totalResult ?? null}
        getLiveCount={getLiveCount}
      />
    </>
  );
}

export default WelfareContributionFilters;
