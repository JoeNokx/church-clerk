/**
 * Shared skeleton primitives — placeholder blocks shaped like real content.
 *
 * Use these instead of a spinner wherever the loaded layout is predictable
 * (cards, tables, lists). They preserve layout so content doesn't jump when
 * it arrives, and they read as "almost loaded" rather than "please wait".
 *
 * Keep spinners for: button submit states, inline micro-loads (dropdown
 * searches, autocomplete), and any load whose shape can't be predicted
 * (e.g. the route-guard full-screen loader).
 */

// Generic bone — a single pulse block. Compose to match whatever loads.
export function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

// KPI card — mirrors KpiCard's shape (title, bold value, right icon, sub-line).
export function SkeletonKpiCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 md:px-5 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="mt-2 h-5 w-24" />
        </div>
        <SkeletonBlock className="hidden md:block h-8 w-8 shrink-0 rounded-xl" />
      </div>
      <SkeletonBlock className="mt-2 h-2.5 w-28 bg-gray-100" />
    </div>
  );
}

// Table body skeleton — render inside <tbody>. `widths` holds one Tailwind
// width class per column so the rows mirror the real table's columns.
export function SkeletonTableRows({ rows = 5, widths = [], cellClass = "py-2.5 pr-4" }) {
  const cols = widths.length ? widths : ["w-24", "w-32", "w-40"];
  return [...Array(rows)].map((_, i) => (
    <tr key={i}>
      {cols.map((w, j) => (
        <td key={j} className={cellClass}>
          <SkeletonBlock className={`h-3.5 ${w} ${j > 1 ? "bg-gray-100" : ""}`} />
        </td>
      ))}
    </tr>
  ));
}

// Stacked row list — for list/modal bodies that aren't <table>s.
export function SkeletonRows({ rows = 4, widths = [] }) {
  const cols = widths.length ? widths : ["w-1/4", "w-1/3", "w-1/5", "w-16"];
  return (
    <div className="divide-y divide-gray-100 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-4 py-3.5">
          {cols.map((w, j) => (
            <SkeletonBlock
              key={j}
              className={`h-3.5 ${w} ${j === cols.length - 1 ? "ml-auto" : ""} ${j > 1 ? "bg-gray-100" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
