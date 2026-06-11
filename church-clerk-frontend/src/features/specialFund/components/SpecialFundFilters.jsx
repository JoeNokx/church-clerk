import { useContext, useEffect, useMemo, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";
import SpecialFundContext from "../specialFund.store.js";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

const CATEGORY_OPTIONS = [
  "Prophetic Seed",
  "Pastor Appreciation",
  "Thanksgiving Offering",
  "Missionary Support",
  "Donation",
  "Retreat",
  "Scholarship Fund"
];

function SpecialFundFilters() {
  const store = useContext(SpecialFundContext);

  const { values: lookupCategories } = useLookupValues("specialFundCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const [searchValue, setSearchValue] = useState(store?.filters?.search || "");

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      store?.fetchSpecialFunds?.({ search: next, page: 1 });
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

  const onCategoryChange = async (e) => {
    const value = e.target.value;
    store?.setFilters({ category: value, page: 1 });
    await store?.fetchSpecialFunds({ category: value, page: 1 });
  };

  const onSearchChange = (e) => {
    const next = e.target.value;
    setSearchValue(next);
    store?.setFilters({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const applyDates = async (from, to) => {
    store?.setFilters({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchSpecialFunds({ dateFrom: from, dateTo: to, page: 1 });
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-end">
      <input
        value={searchValue}
        onChange={onSearchChange}
        className="h-11 w-full md:w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
        placeholder="Giver name"
      />

      <select
        value={store?.filters?.category || ""}
        onChange={onCategoryChange}
        className="h-11 w-full md:w-auto rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
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

export default SpecialFundFilters;
