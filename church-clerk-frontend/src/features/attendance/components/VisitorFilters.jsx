import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import AttendanceContext from "../attendance.store.js";

function VisitorFilters() {
  const store = useContext(AttendanceContext);
  const [value, setValue] = useState(store?.visitorFilters?.search || "");

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      store?.fetchVisitors({ search: next, page: 1 });
    }, 400);
  }, [store]);

  useEffect(() => {
    setValue(store?.visitorFilters?.search || "");
  }, [store?.visitorFilters?.search]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const onChange = (e) => {
    const next = e.target.value;
    setValue(next);
    store?.setVisitorFilters({ search: next, page: 1 });
    debouncedSearch(next);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
      <input
        value={value}
        onChange={onChange}
        className="h-9 w-full sm:w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
        placeholder="Name or invited by"
      />
    </div>
  );
}

export default VisitorFilters;
