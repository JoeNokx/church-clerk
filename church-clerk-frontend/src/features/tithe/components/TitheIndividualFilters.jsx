import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import TitheContext from "../tithe.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";

function TitheIndividualFilters() {
  const store = useContext(TitheContext);

  const filters = store?.individualFilters || {};

  const [searchValue, setSearchValue] = useState(filters.search || "");

  const fetchRef = useRef(store?.fetchIndividuals);
  useEffect(() => { fetchRef.current = store?.fetchIndividuals; });

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
  }, []);

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
    store?.setIndividualFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchIndividuals?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  return (
    <>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search member or recorded by"
        searchWidth="md:w-[320px]"
        selects={[]}
        dateFrom={filters.dateFrom || ""}
        dateTo={filters.dateTo || ""}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search member or recorded by"
        dateFrom={filters.dateFrom || ""}
        dateTo={filters.dateTo || ""}
        onDateApply={applyDates}
      />
    </>
  );
}

export default TitheIndividualFilters;
