import { useContext, useEffect, useMemo, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";

import WelfareContext from "../welfare.store.js";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

const CATEGORY_OPTIONS = ["Birthday", "Wedding", "Funeral", "Hospital", "Emergency", "School", "Other"];

function WelfareDisbursementFilters() {
  const store = useContext(WelfareContext);

  const { values: lookupCategories } = useLookupValues("welfareDisbursementCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const [searchValue, setSearchValue] = useState(store?.disbursementFilters?.search || "");

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      store?.fetchDisbursements?.({ search: next, page: 1 });
    }, 400);
  }, [store]);

  const appliedDateFrom = store?.disbursementFilters?.dateFrom || "";
  const appliedDateTo = store?.disbursementFilters?.dateTo || "";

  useEffect(() => {
    setSearchValue(store?.disbursementFilters?.search || "");
  }, [store?.disbursementFilters?.search]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const onCategoryChange = async (e) => {
    const value = e.target.value;
    store?.setDisbursementFilters?.({ category: value, page: 1 });
    await store?.fetchDisbursements?.({ category: value, page: 1 });
  };

  const onSearchChange = (e) => {
    const next = e.target.value;
    setSearchValue(next);
    store?.setDisbursementFilters?.({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const applyDates = async (from, to) => {
    store?.setDisbursementFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchDisbursements?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
      <input
        value={searchValue}
        onChange={onSearchChange}
        className="h-9 w-full sm:w-[240px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
        placeholder="Beneficiary name"
      />

      <select
        value={store?.disbursementFilters?.category || ""}
        onChange={onCategoryChange}
        className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
      >
        <option value="">All Categories</option>
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <DateRangeFilter appliedFrom={appliedDateFrom} appliedTo={appliedDateTo} onApply={applyDates} />
    </div>
  );
}

export default WelfareDisbursementFilters;
