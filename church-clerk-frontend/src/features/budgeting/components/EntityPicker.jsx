/**
 * EntityPicker — searchable async dropdown for a given entity type.
 * Supported types: "branch" | "cell" | "group" | "department" | "event"
 * Static types (no secondary picker): "church" | "administration"
 */

import { useEffect, useRef, useState } from "react";
import { getCells } from "../../cell/services/cell.api.js";
import { getGroups } from "../../group/services/group.api.js";
import { getDepartments } from "../../department/services/department.api.js";
import { getEvents } from "../../event/services/event.api.js";
import { getMyBranches } from "../../church/services/church.api.js";

// Normalise whatever the API returns into [{ _id, name }]
function normaliseList(res, type) {
  const d = res?.data?.data ?? res?.data ?? {};
  let arr = [];

  if (type === "branch") {
    arr = d.branches || d.data || (Array.isArray(d) ? d : []);
    return arr.map((b) => ({ _id: b._id, name: b.name }));
  }
  if (type === "cell") {
    arr = d.cells || d.data || (Array.isArray(d) ? d : []);
    return arr.map((c) => ({ _id: c._id, name: c.name }));
  }
  if (type === "group") {
    arr = d.groups || d.data || (Array.isArray(d) ? d : []);
    return arr.map((g) => ({ _id: g._id, name: g.name }));
  }
  if (type === "department") {
    arr = d.departments || d.data || (Array.isArray(d) ? d : []);
    return arr.map((x) => ({ _id: x._id, name: x.name }));
  }
  if (type === "event") {
    arr = d.events || d.data || (Array.isArray(d) ? d : []);
    return arr.map((e) => ({ _id: e._id, name: e.title || e.name }));
  }
  return [];
}

async function fetchByType(type, search) {
  try {
    const q = search ? { search } : {};
    switch (type) {
      case "branch":     return normaliseList(await getMyBranches({ ...q, limit: 30 }), "branch");
      case "cell":       return normaliseList(await getCells({ ...q, limit: 30 }), "cell");
      case "group":      return normaliseList(await getGroups({ ...q, limit: 30 }), "group");
      case "department": return normaliseList(await getDepartments({ ...q, limit: 30 }), "department");
      case "event":      return normaliseList(await getEvents({ ...q, limit: 30 }), "event");
      default:           return [];
    }
  } catch {
    return [];
  }
}

export const ENTITY_TYPES = [
  { value: "",               label: "— None —",        needsPicker: false },
  { value: "church",         label: "Church",           needsPicker: false },
  { value: "administration", label: "Administration",   needsPicker: false },
  { value: "branch",         label: "Branch Church",    needsPicker: true  },
  { value: "cell",           label: "Cell",             needsPicker: true  },
  { value: "group",          label: "Group",            needsPicker: true  },
  { value: "department",     label: "Department",       needsPicker: true  },
  { value: "event",          label: "Event",            needsPicker: true  },
  { value: "other",          label: "Other",            needsPicker: false, isCustom: true },
];

function EntityPicker({ entityType, value, onChange, className = "" }) {
  const [search, setSearch] = useState(value?.entityName || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const fetchRef = useRef(0);

  // Sync display when value changes externally
  useEffect(() => {
    setSearch(value?.entityName || "");
  }, [value?.entityName]);

  // Fetch on open or search change
  useEffect(() => {
    if (!entityType || !open) return;
    const id = ++fetchRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await fetchByType(entityType, search);
      if (fetchRef.current === id) {
        setResults(data);
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [entityType, search, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onChange(null, ""); }}
        onFocus={() => setOpen(true)}
        placeholder={`Search ${entityType}…`}
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 md:h-12"
        autoComplete="off"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-2.5 text-xs text-gray-400">Searching…</div>
          ) : results.length ? (
            results.map((r) => (
              <button
                key={r._id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(r._id, r.name);
                  setSearch(r.name);
                  setOpen(false);
                }}
                className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {r.name}
              </button>
            ))
          ) : (
            <div className="px-3 py-2.5 text-xs text-gray-400">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default EntityPicker;
