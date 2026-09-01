import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import EventContext from "../event.store.js";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";

const CATEGORY_OPTIONS = [
  "Conference",
  "Service",
  "Worship",
  "Prayers",
  "Outreach",
  "Bible Study",
  "Serminary",
  "Retreat",
  "Workshop",
  "Camp Meeting"
];

function ProgramsEventsFilters({ activeStatus }) {
  const store = useContext(EventContext);

  const { values: lookupCategories } = useLookupValues("eventCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const [searchValue, setSearchValue] = useState(store?.filters?.search || "");

  useEffect(() => {
    setSearchValue(store?.filters?.search || "");
  }, [store?.filters?.search]);

  const refreshAll = async (partial) => {
    await store?.fetchEventStats?.(partial);
    await store?.fetchEvents?.({ status: activeStatus, ...(partial || {}) });
  };

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      store?.fetchEventStats?.({ search: next, page: 1 });
      store?.fetchEvents?.({ status: activeStatus, search: next, page: 1 });
    }, 400);
  }, [activeStatus, store]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const onCategoryChange = async (value) => {
    store?.setFilters({ category: value, page: 1 });
    await refreshAll({ category: value, page: 1 });
  };

  const onSearchChange = (next) => {
    setSearchValue(next);
    store?.setFilters({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const categorySelectOptions = useMemo(
    () => categoryOptions.map((c) => ({ label: c, value: c })),
    [categoryOptions]
  );

  return (
    <>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search event title..."
        searchWidth="md:w-[320px]"
        selects={[
          {
            key: "category",
            value: store?.filters?.category || "",
            onChange: onCategoryChange,
            options: categorySelectOptions,
            placeholder: "All Categories",
          },
        ]}
      />
      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search event title..."
        filters={[
          {
            key: "category",
            label: "Category",
            value: store?.filters?.category || "",
            defaultValue: "",
            options: [{ label: "All Categories", value: "" }, ...categorySelectOptions],
          },
        ]}
        onApply={async (pending) => {
          store?.setFilters({ category: pending.category, page: 1 });
          await refreshAll({ category: pending.category, page: 1 });
        }}
      />
    </>
  );
}

export default ProgramsEventsFilters;
