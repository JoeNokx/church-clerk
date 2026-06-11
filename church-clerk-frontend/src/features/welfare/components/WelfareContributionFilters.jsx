import { useContext, useEffect, useMemo, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";

import WelfareContext from "../welfare.store.js";

function WelfareContributionFilters() {
  const store = useContext(WelfareContext);

  const [searchValue, setSearchValue] = useState(store?.contributionFilters?.search || "");

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      store?.fetchContributions?.({ search: next, page: 1 });
    }, 400);
  }, [store]);

  const appliedDateFrom = store?.contributionFilters?.dateFrom || "";
  const appliedDateTo = store?.contributionFilters?.dateTo || "";

  useEffect(() => {
    setSearchValue(store?.contributionFilters?.search || "");
  }, [store?.contributionFilters?.search]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const onSearchChange = (e) => {
    const next = e.target.value;
    setSearchValue(next);
    store?.setContributionFilters?.({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const applyDates = async (from, to) => {
    store?.setContributionFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchContributions?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-end">
      <input
        value={searchValue}
        onChange={onSearchChange}
        className="h-11 w-full md:w-[240px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
        placeholder="Member name"
      />

      <DateRangeFilter appliedFrom={appliedDateFrom} appliedTo={appliedDateTo} onApply={applyDates} />
    </div>
  );
}

export default WelfareContributionFilters;
