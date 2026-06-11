import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import MemberContext from "../member.store.js";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Visitor", value: "visitor" },
  { label: "Former", value: "former" }
];

function MemberFilters() {
  const store = useContext(MemberContext);
  const [searchValue, setSearchValue] = useState(store?.filters?.search || "");

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      store?.fetchMembers?.({ search: next, page: 1 });
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


  const onSearchChange = (e) => {
    const next = e.target.value;
    setSearchValue(next);
    store?.setFilters({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const onStatusChange = async (e) => {
    const value = e.target.value;
    store?.setFilters({ status: value, page: 1 });
    await store?.fetchMembers({ status: value, page: 1 });
  };

  const applyDates = async (from, to) => {
    store?.setFilters({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchMembers({ dateFrom: from, dateTo: to, page: 1 });
  };

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end md:gap-3">
      <div className="flex items-center gap-2">
        <input
          value={searchValue}
          onChange={onSearchChange}
          className="h-11 w-full md:w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
          placeholder="Search"
        />
      </div>

      <div className="flex items-center gap-2">
        <select
          value={store?.filters?.status || "all"}
          onChange={onStatusChange}
          className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <DateRangeFilter appliedFrom={appliedDateFrom} appliedTo={appliedDateTo} onApply={applyDates} />
    </div>
  );
}

export default MemberFilters;
