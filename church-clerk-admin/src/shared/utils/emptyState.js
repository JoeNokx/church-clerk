/**
 * Resolve the reason an empty list is being shown.
 *
 * Returns one of:
 *   - "search"        — a search query is active
 *   - "filters"       — one or more non-default filters are active
 *   - "date"          — a date range is active
 *   - "combined"      — search + filters and/or date are active
 *   - "zero"          — genuinely no records (first-time / onboarding)
 *
 * This keeps the distinction between "first-time empty" and
 * "search/filter produced no results" consistent across the app.
 *
 * @param {object} opts
 * @param {string} opts.search        — current search query
 * @param {object} opts.filters       — filter state object
 * @param {object} opts.filterDefaults — map of filter key -> default value
 * @param {string} opts.dateFrom      — applied date-from
 * @param {string} opts.dateTo        — applied date-to
 * @param {number} opts.totalResult   — total results across all pages (optional)
 * @returns {"search"|"filters"|"date"|"combined"|"zero"}
 */
export function resolveEmptyReason({
  search = "",
  filters = {},
  filterDefaults = {},
  dateFrom = "",
  dateTo = "",
  totalResult,
} = {}) {
  const hasSearch = Boolean(String(search || "").trim());
  const hasDate = Boolean(dateFrom || dateTo);

  const activeFilterKeys = Object.keys(filterDefaults || {}).filter((key) => {
    const current = filters?.[key];
    const def = filterDefaults[key];
    // treat "all" / "" / undefined as default
    const norm = (v) => String(v ?? "").trim().toLowerCase();
    return norm(current) !== norm(def) && norm(current) !== "all" && norm(current) !== "";
  });

  const hasFilters = activeFilterKeys.length > 0;

  if (hasSearch && (hasFilters || hasDate)) return "combined";
  if (hasSearch) return "search";
  if (hasFilters && hasDate) return "combined";
  if (hasFilters) return "filters";
  if (hasDate) return "date";

  // If totalResult is provided and > 0, this is a pagination edge case —
  // records exist but the current page is empty. Treat as "zero" so we
  // don't show a misleading "first-time" onboarding state; callers that
  // care about pagination should handle this before calling.
  return "zero";
}

/**
 * Build a recovery action config for a search/filter empty state.
 *
 * Returns an object with `actionLabel` / `onAction` and optional
 * `secondaryLabel` / `onSecondary`, or null if no recovery applies.
 *
 * @param {string} reason — from resolveEmptyReason
 * @param {object} handlers
 * @param {function} [handlers.onClearSearch]
 * @param {function} [handlers.onClearFilters]
 * @param {function} [handlers.onClearDate]
 */
export function buildRecoveryActions(reason, handlers = {}) {
  if (reason === "zero") return null;

  const { onClearSearch, onClearFilters, onClearDate } = handlers;

  if (reason === "search") {
    return onClearSearch
      ? { actionLabel: "Clear Search", onAction: onClearSearch }
      : null;
  }

  if (reason === "filters") {
    return onClearFilters
      ? { actionLabel: "Clear Filters", onAction: onClearFilters }
      : null;
  }

  if (reason === "date") {
    return onClearDate
      ? { actionLabel: "Clear Date Filter", onAction: onClearDate }
      : null;
  }

  // combined
  const primary = onClearFilters
    ? { actionLabel: "Clear Filters", onAction: onClearFilters }
    : onClearDate
      ? { actionLabel: "Clear Date Filter", onAction: onClearDate }
      : onClearSearch
        ? { actionLabel: "Clear Search", onAction: onClearSearch }
        : null;

  if (!primary) return null;

  const secondary = onClearSearch && primary.actionLabel !== "Clear Search"
    ? { secondaryLabel: "Clear Search", onSecondary: onClearSearch }
    : null;

  return { ...primary, ...secondary };
}

export default { resolveEmptyReason, buildRecoveryActions };
