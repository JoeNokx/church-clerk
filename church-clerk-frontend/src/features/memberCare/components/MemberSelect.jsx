import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import MemberCareContext from "../memberCare.store.js";
import { memberName } from "../constants.js";

const optionLabel = (m) => {
  const meta = [m?.phoneNumber, m?.email, m?.city].filter(Boolean).join(" • ");
  return meta ? `${memberName(m)} — ${meta}` : memberName(m);
};

/**
 * Single-member search picker. When `value` is set it renders the selected
 * member with a Change button; otherwise a search box with results.
 */
export function MemberSelect({ value, onSelect, onClear, excludeIds = [], placeholder = "Search name, phone, email..." }) {
  const store = useContext(MemberCareContext);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);

  const excluded = useMemo(() => new Set(excludeIds.map(String)), [excludeIds]);
  const debounced = useMemo(() => String(query || "").trim(), [query]);

  useEffect(() => {
    if (value) return;
    const q = debounced;
    if (!q) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setSearching(true);
      try {
        const members = await store?.searchMembers?.(q);
        if (!cancelled) setOptions(Array.isArray(members) ? members : []);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    };
    const id = setTimeout(run, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [debounced, value, store]);

  const pick = useCallback((m) => {
    onSelect?.(m);
    setQuery("");
    setOptions([]);
  }, [onSelect]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
        <div className="min-w-0 font-semibold text-gray-900 truncate text-sm">{optionLabel(value)}</div>
        <button
          type="button"
          onClick={() => onClear?.()}
          className="shrink-0 rounded-md px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 text-xs"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
        placeholder={placeholder}
      />
      <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-gray-200">
        {searching ? (
          <div className="px-4 py-3 text-gray-600 text-sm">Searching...</div>
        ) : options.length ? (
          <div className="divide-y divide-gray-200">
            {options.map((m, idx) => {
              const isExcluded = excluded.has(String(m?._id));
              return (
                <button
                  key={m?._id ?? `m-${idx}`}
                  type="button"
                  disabled={isExcluded}
                  onClick={() => pick(m)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="font-semibold text-gray-900 truncate text-sm">
                    {optionLabel(m)}{isExcluded ? " (already added)" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        ) : debounced ? (
          <div className="px-4 py-3 text-gray-600 text-sm">No members found.</div>
        ) : (
          <div className="px-4 py-3 text-gray-600 text-sm">Start typing to search members.</div>
        )}
      </div>
    </div>
  );
}

/**
 * Multi-member picker — renders selected members as removable chips plus an
 * embedded MemberSelect to add more.
 */
export function MemberMultiSelect({ values = [], onChange, placeholder }) {
  const list = Array.isArray(values) ? values : [];
  const remove = (id) => onChange?.(list.filter((m) => String(m?._id) !== String(id)));

  return (
    <div>
      {list.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {list.map((m) => (
            <span key={m?._id} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
              {memberName(m)}
              <button
                type="button"
                onClick={() => remove(m?._id)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-100"
                aria-label="Remove"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <MemberSelect
        value={null}
        excludeIds={list.map((m) => m?._id)}
        onSelect={(m) => onChange?.([...list, m])}
        placeholder={placeholder}
      />
    </div>
  );
}

export default MemberSelect;
