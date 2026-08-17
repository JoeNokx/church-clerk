import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { globalSearch as globalSearchApi } from "../services/globalSearch.api.js";

// ─── Module config ────────────────────────────────────────────────────────────
const MODULE_META = {
  members:          { label: "Members",              page: "members",           detailPage: "member-details" },
  visitors:         { label: "Visitors",             page: "members",           detailPage: null },
  attendance:       { label: "Attendance",           page: "attendance",        detailPage: null },
  departments:      { label: "Departments",          page: "ministries",        detailPage: null },
  cells:            { label: "Cells",                page: "ministries",        detailPage: null },
  groups:           { label: "Groups",               page: "ministries",        detailPage: null },
  events:           { label: "Events & Programs",    page: "programs-events",   detailPage: "event-details" },
  announcements:    { label: "Announcements",        page: "announcements",     detailPage: null },
  tithe:            { label: "Tithe",                page: "tithe",             detailPage: null },
  budgeting:        { label: "Budgeting",            page: "budgeting",         detailPage: null },
  churchProjects:   { label: "Church Projects",      page: "church-projects",   detailPage: null },
  offerings:        { label: "Offerings & Funds",    page: "offering-funds",    detailPage: null },
  welfare:          { label: "Welfare",              page: "welfare",           detailPage: null },
  pledges:          { label: "Pledges",              page: "pledges",           detailPage: null },
  businessVentures: { label: "Business Ventures",   page: "business-ventures", detailPage: null },
  expenses:         { label: "General Expenses",     page: "expenses",          detailPage: null },
};

const MODULE_ICONS = {
  members: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  visitors: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
      <path d="M19 8l2 2-2 2"/>
    </svg>
  ),
  attendance: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M9 16l2 2 4-4"/>
    </svg>
  ),
  departments: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  cells: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
    </svg>
  ),
  groups: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="7" r="3"/>
      <circle cx="15" cy="7" r="3"/>
      <path d="M3 20c0-3 2.7-5 6-5h6c3.3 0 6 2 6 5"/>
    </svg>
  ),
  events: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <circle cx="12" cy="16" r="2"/>
    </svg>
  ),
  announcements: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z"/>
      <path d="M12 8v4l3 3"/>
    </svg>
  ),
  tithe: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="6" width="20" height="13" rx="2"/>
      <path d="M2 10h20"/>
      <circle cx="12" cy="15" r="2"/>
    </svg>
  ),
  budgeting: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  churchProjects: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M2 20h20M4 20V10l8-8 8 8v10"/>
      <rect x="9" y="14" width="6" height="6"/>
    </svg>
  ),
  offerings: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M20 12V22H4V12"/>
      <path d="M22 7H2v5h20V7Z"/>
      <path d="M12 22V7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"/>
    </svg>
  ),
  welfare: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/>
    </svg>
  ),
  pledges: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 12l2 2 4-4"/>
      <path d="M21 12c0 4.97-4.03 9-9 9S3 16.97 3 12 7.03 3 12 3s9 4.03 9 9Z"/>
    </svg>
  ),
  businessVentures: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  ),
  expenses: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
};

const MODULE_COLORS = {
  members:          "text-gray-600 bg-gray-100",
  visitors:         "text-gray-600 bg-gray-100",
  attendance:       "text-gray-600 bg-gray-100",
  departments:      "text-gray-600 bg-gray-100",
  cells:            "text-gray-600 bg-gray-100",
  groups:           "text-gray-600 bg-gray-100",
  events:           "text-gray-600 bg-gray-100",
  announcements:    "text-gray-600 bg-gray-100",
  tithe:            "text-gray-600 bg-gray-100",
  budgeting:        "text-gray-600 bg-gray-100",
  churchProjects:   "text-gray-600 bg-gray-100",
  offerings:        "text-gray-600 bg-gray-100",
  welfare:          "text-gray-600 bg-gray-100",
  pledges:          "text-gray-600 bg-gray-100",
  businessVentures: "text-gray-600 bg-gray-100",
  expenses:         "text-gray-600 bg-gray-100",
};

const BADGE_COLORS = {
  active:      "bg-gray-100 text-gray-600",
  dormant:     "bg-gray-100 text-gray-600",
  inactive:    "bg-gray-100 text-gray-500",
  visitor:     "bg-gray-100 text-gray-600",
  converted:   "bg-gray-100 text-gray-600",
  "In Progress": "bg-gray-100 text-gray-600",
  Completed:   "bg-gray-100 text-gray-600",
  draft:       "bg-gray-100 text-gray-500",
  archived:    "bg-gray-100 text-gray-500",
  Active:      "bg-gray-100 text-gray-600",
};

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ResultRow({ item, onNavigate }) {
  const meta = MODULE_META[item.module] || {};
  const colorClass = MODULE_COLORS[item.module] || "text-gray-600 bg-gray-100";

  const handleClick = () => {
    onNavigate(item);
  };

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
      className="cck-allow-icons w-full text-left flex items-center px-4 py-2.5 hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
      style={{ gap: "8px" }}
    >
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        {item.photoUrl ? (
          <img src={item.photoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          MODULE_ICONS[item.module] || <span className="text-xs font-bold">{(meta.label || "?")[0]}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 truncate text-sm">{item.title || "—"}</div>
        {item.subtitle ? (
          <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
        ) : null}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        {item.badge ? (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_COLORS[item.badge] || "bg-gray-100 text-gray-600"}`}>
            {item.badge}
          </span>
        ) : null}
        {item.date ? (
          <span className="text-[10px] text-gray-400">{formatDate(item.date)}</span>
        ) : null}
      </div>
    </button>
  );
}

export default function GlobalSearch() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  const hasResults = totalResults > 0;
  const showDropdown = open && (query.length >= 2);

  // ── Keyboard shortcut: Ctrl/Cmd + K ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults({});
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Outside click ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Debounced search ─────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults({});
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError("");
    try {
      const res = await globalSearchApi(q, abortRef.current.signal);
      setResults(res?.data?.results || {});
    } catch (e) {
      if (e?.code !== "ERR_CANCELED" && e?.message !== "canceled") {
        setError("Search failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val || val.length < 2) {
      setResults({});
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleClear = () => {
    setQuery("");
    setResults({});
    setError("");
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleNavigate = useCallback((item) => {
    const meta = MODULE_META[item.module] || {};
    setOpen(false);
    setQuery("");
    setResults({});

    if (meta.detailPage && item._id) {
      navigate(`/dashboard?page=${meta.detailPage}&id=${item._id}`);
    } else if (meta.page) {
      navigate(`/dashboard?page=${meta.page}`);
    }
  }, [navigate]);

  const handleViewAll = (moduleKey) => {
    const meta = MODULE_META[moduleKey] || {};
    setOpen(false);
    setQuery("");
    setResults({});
    if (meta.page) navigate(`/dashboard?page=${meta.page}`);
  };

  const moduleOrder = [
    "members","visitors","attendance","departments","cells","groups",
    "events","announcements","tithe","budgeting","churchProjects",
    "offerings","welfare","pledges","businessVentures","expenses",
  ];

  const orderedModules = moduleOrder.filter((k) => results[k]?.length);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 max-w-xl">
      {/* ── Input ── */}
      <div
        className={`flex items-center gap-2 rounded-full md:rounded-xl border px-3 py-2 transition-all bg-gray-50 ${
          open
            ? "border-indigo-400 bg-white ring-2 ring-indigo-100 shadow-sm"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        {/* Search icon */}
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-400 shrink-0">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder="Search members, finance, attendance…"
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Loading spinner */}
        {loading ? (
          <svg className="h-4 w-4 text-indigo-400 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : query ? (
          <button type="button" onClick={handleClear} className="shrink-0 text-gray-400 hover:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <span className="hidden md:flex items-center gap-1 shrink-0">
            <kbd className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Ctrl K</kbd>
            <kbd className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">⌘K</kbd>
          </span>
        )}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">

          {/* Error */}
          {error ? (
            <div className="px-4 py-3 text-red-600 text-sm border-b border-red-100 bg-red-50">{error}</div>
          ) : null}

          {/* Results */}
          <div className="overflow-y-auto flex-1 [scrollbar-width:thin]">
            {!loading && !hasResults && query.length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-gray-300 mb-3">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div className="text-gray-500 text-sm font-medium">No results found</div>
                <div className="text-gray-400 text-xs mt-1">Try a different search term</div>
              </div>
            ) : null}

            {orderedModules.map((moduleKey) => {
              const items = results[moduleKey] || [];
              const meta = MODULE_META[moduleKey] || {};
              const colorClass = MODULE_COLORS[moduleKey] || "text-gray-600 bg-gray-100";

              return (
                <div key={moduleKey}>
                  {/* Module header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                      <span className={`h-5 w-5 rounded flex items-center justify-center ${colorClass}`}>
                        {MODULE_ICONS[moduleKey]}
                      </span>
                      {meta.label}
                    </div>
                    {meta.page ? (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleViewAll(moduleKey)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        View all
                      </button>
                    ) : null}
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <ResultRow key={String(item._id)} item={item} onNavigate={handleNavigate} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {hasResults ? (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {totalResults} result{totalResults !== 1 ? "s" : ""} across {orderedModules.length} module{orderedModules.length !== 1 ? "s" : ""}
              </span>
              <span className="text-[11px] text-gray-400">Press <kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">Esc</kbd> to close</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
