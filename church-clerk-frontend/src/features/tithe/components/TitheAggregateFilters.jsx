import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import TitheContext from "../tithe.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";

function TitheAggregateFilters() {
  const store = useContext(TitheContext);
  const filters = store?.aggregateFilters || {};

  const [searchValue, setSearchValue] = useState(filters.search || "");

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      store?.fetchAggregates?.({ search: next, page: 1 });
    }, 400);
  }, [store]);

  useEffect(() => {
    setSearchValue(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const onSearchChange = (next) => {
    setSearchValue(next);
    debouncedSearch(next);
  };

  const applyDates = async (from, to) => {
    store?.setAggregateFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchAggregates?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  return (
    <>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search recorded by..."
        searchWidth="md:w-[320px]"
        selects={[]}
        dateFrom={filters.dateFrom || ""}
        dateTo={filters.dateTo || ""}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search recorded by..."
        dateFrom={filters.dateFrom || ""}
        dateTo={filters.dateTo || ""}
        onDateApply={applyDates}
      />
    </>
  );
}

export default TitheAggregateFilters;
