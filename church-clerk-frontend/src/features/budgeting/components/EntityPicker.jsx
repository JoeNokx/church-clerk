/**
 * EntityPicker — searchable async dropdown for a given entity type.
 * Supported types: "branch" | "cell" | "group" | "department" | "ministry" | "program" | "outreach" | "member" | "visitor" | "prospect"
 * "member" uses MemberMultiPicker (chips + search) since items can target several members.
 */

import { useEffect, useRef, useState } from "react";
import { getCells } from "../../cell/services/cell.api.js";
import { getGroups } from "../../group/services/group.api.js";
import { getDepartments } from "../../department/services/department.api.js";
import { getMinistries } from "../../ministry/services/ministry.api.js";
import { getPrograms } from "../../program/services/program.api.js";
import { getOutreachEvents, getAllProspects } from "../../outreach/services/outreach.api.js";
import { getMyBranches } from "../../church/services/church.api.js";
import { getMembers } from "../../member/services/member.api.js";
import { getVisitors } from "../../attendance/services/attendance.api.js";

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
  if (type === "ministry") {
    arr = d.ministries || d.data || (Array.isArray(d) ? d : []);
    return arr.map((x) => ({ _id: x._id, name: x.name }));
  }
  if (type === "program" || type === "event" || type === "outreach") {
    arr = d.programs || d.events || d.data || (Array.isArray(d) ? d : []);
    return arr.map((e) => ({ _id: e._id, name: e.title || e.name }));
  }
  if (type === "member") {
    arr = d.members || d.data || (Array.isArray(d) ? d : []);
    return arr.map((m) => ({
      _id: m._id,
      name: m.name || [m.firstName, m.lastName].filter(Boolean).join(" ")
    }));
  }
  if (type === "visitor") {
    arr = d.visitors || d.data || (Array.isArray(d) ? d : []);
    return arr.map((v) => ({ _id: v._id, name: v.fullName }));
  }
  if (type === "prospect") {
    arr = d.prospects || d.data || (Array.isArray(d) ? d : []);
    return arr.map((p) => ({
      _id: p._id,
      name: `${[p.firstName, p.lastName].filter(Boolean).join(" ")}${p.phone ? ` · ${p.phone}` : ""}`
    }));
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
      case "ministry":   return normaliseList(await getMinistries({ ...q, limit: 30 }), "ministry");
      case "program":
      case "event":      return normaliseList(await getPrograms({ ...q, limit: 30 }), "program");
      case "outreach":   return normaliseList(await getOutreachEvents({ ...q, limit: 30 }), "outreach");
      case "member":     return normaliseList(await getMembers({ ...q, limit: 30 }), "member");
      case "visitor":    return normaliseList(await getVisitors({ ...q, limit: 30 }), "visitor");
      case "prospect":   return normaliseList(await getAllProspects({ ...q, limit: 30 }), "prospect");
      default:           return [];
    }
  } catch {
    return [];
  }
}

export const ENTITY_TYPES = [
  { value: "",               label: "None — church-wide", needsPicker: false },
  { value: "branch",         label: "Branch Church",    needsPicker: true  },
  { value: "cell",           label: "Cell",             needsPicker: true  },
  { value: "group",          label: "Group",            needsPicker: true  },
  { value: "department",     label: "Department",       needsPicker: true  },
  { value: "ministry",       label: "Ministry",         needsPicker: true  },
  { value: "program",        label: "Program",          needsPicker: true  },
  { value: "outreach",       label: "Outreach",         needsPicker: true  },
  { value: "member",         label: "Members",          needsPicker: true, multi: true },
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
        onChange={(e) => {
          const v = e.target.value;
          setSearch(v);
          setOpen(!!v.trim());
          if (!v) onChange(null, "");
        }}
        placeholder={`Search ${entityType}…`}
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 md:h-12"
        autoComplete="off"
      />
      {open && search.trim() ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-2.5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin text-gray-400" aria-label="Searching">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
                <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
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
      ) : null}
    </div>
  );
}

/**
 * MemberMultiPicker — search members and select several. `selected` is an
 * array of { _id, name }; selecting a row appends it, chips remove it.
 */
export function MemberMultiPicker({ selected = [], onChange, className = "" }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const fetchRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const id = ++fetchRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await fetchByType("member", search);
      if (fetchRef.current === id) {
        const taken = new Set(selected.map((m) => String(m._id)));
        setResults(data.filter((m) => !taken.has(String(m._id))));
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, open, selected]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const add = (m) => {
    onChange([...selected, m]);
    setSearch("");
    setOpen(false);
  };
  const remove = (id) => {
    onChange(selected.filter((m) => String(m._id) !== String(id)));
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {selected.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((m) => (
            <span key={m._id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
              {m.name}
              <button type="button" onClick={() => remove(m._id)}
                className="text-primary-400 hover:text-primary-600" aria-label={`Remove ${m.name}`}>
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        value={search}
        onChange={(e) => {
          const v = e.target.value;
          setSearch(v);
          setOpen(!!v.trim());
        }}
        placeholder="Search members to add…"
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 md:h-12"
        autoComplete="off"
      />
      {open && search.trim() ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-2.5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin text-gray-400" aria-label="Searching">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
                <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          ) : results.length ? (
            results.map((r) => (
              <button
                key={r._id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(r)}
                className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {r.name}
              </button>
            ))
          ) : (
            <div className="px-3 py-2.5 text-xs text-gray-400">
              {selected.length && !search ? "All matches selected" : "No members found"}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default EntityPicker;
