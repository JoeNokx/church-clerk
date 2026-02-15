import { useContext, useEffect, useState } from "react";
import AttendanceContext from "../attendance.store.js";

function VisitorFilters() {
  const store = useContext(AttendanceContext);
  const [value, setValue] = useState(store?.visitorFilters?.search || "");

  useEffect(() => {
    setValue(store?.visitorFilters?.search || "");
  }, [store?.visitorFilters?.search]);

  const onChange = async (e) => {
    const next = e.target.value;
    setValue(next);
    store?.setVisitorFilters({ search: next, page: 1 });
    await store?.fetchVisitors({ search: next, page: 1 });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Search:</span>
        <input
          value={value}
          onChange={onChange}
          className="h-9 w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          placeholder="Name or invited by"
        />
      </div>
    </div>
  );
}

export default VisitorFilters;
