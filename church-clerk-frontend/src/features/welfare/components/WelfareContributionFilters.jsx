import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import WelfareContext from "../welfare.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";

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
      />
    </>
  );
}

export default WelfareContributionFilters;
