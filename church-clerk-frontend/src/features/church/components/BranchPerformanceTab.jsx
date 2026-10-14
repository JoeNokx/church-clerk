import React, { useEffect, useState } from "react";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { getBranchPerformance } from "../services/church.api.js";

const RATING_STYLES = {
  strong: { label: "Strong", chip: "bg-green-100 text-green-700", bar: "bg-green-500", text: "text-green-600" },
  healthy: { label: "Healthy", chip: "bg-blue-100 text-blue-700", bar: "bg-blue-500", text: "text-blue-600" },
  watch: { label: "Watch", chip: "bg-amber-100 text-amber-700", bar: "bg-amber-500", text: "text-amber-600" },
  "at-risk": { label: "At Risk", chip: "bg-red-100 text-red-700", bar: "bg-red-500", text: "text-red-600" },
};

const MEDALS = ["text-amber-500", "text-gray-400", "text-amber-700"];

function HqBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 text-[10px]">
      HQ
    </span>
  );
}

// Plain-language verdicts per area — what the raw numbers mean in words
function indicators(b, currency, sundays) {
  return [
    {
      label: "Attendance",
      chip: b.attendanceRate >= 60 ? ["Strong turnout", "bg-green-100 text-green-700"]
        : b.attendanceRate >= 40 ? ["Moderate turnout", "bg-amber-100 text-amber-700"]
        : b.avgSundayAttendance > 0 ? ["Low turnout", "bg-red-100 text-red-700"]
        : ["No services recorded", "bg-gray-100 text-gray-500"],
      detail: b.avgSundayAttendance > 0
        ? `${b.avgSundayAttendance} people attend on an average Sunday, over the last ${sundays} Sundays — that's ${b.attendanceRate}% of ${b.members} members`
        : "No Sunday attendance recorded recently",
    },
    {
      label: "Growth",
      chip: b.newMembersThisMonth > 0 ? ["Growing", "bg-green-100 text-green-700"] : ["No new members", "bg-gray-100 text-gray-500"],
      detail: b.newMembersThisMonth > 0
        ? `${b.newMembersThisMonth} new member${b.newMembersThisMonth === 1 ? "" : "s"} joined this month`
        : "Nobody joined this month",
    },
    {
      label: "Visitors",
      chip: b.visitorsThisMonth > 0 ? ["Welcoming visitors", "bg-green-100 text-green-700"] : ["No visitors", "bg-gray-100 text-gray-500"],
      detail: b.visitorsThisMonth > 0
        ? `${b.visitorsThisMonth} visitor${b.visitorsThisMonth === 1 ? "" : "s"} welcomed${b.convertedThisMonth ? ` · ${b.convertedThisMonth} became a member` : ""}`
        : "No visitors welcomed this month",
    },
    {
      label: "Outreach",
      chip: b.peopleReachedThisMonth > 0 ? ["Active", "bg-green-100 text-green-700"] : ["Quiet", "bg-gray-100 text-gray-500"],
      detail: b.peopleReachedThisMonth > 0
        ? `${b.peopleReachedThisMonth} people reached this month`
        : "No outreach activity recorded this month",
    },
    {
      label: "Finances",
      chip: b.incomeThisMonth <= 0 ? ["No income recorded", "bg-gray-100 text-gray-500"]
        : b.netThisMonth >= 0 ? ["More in than out", "bg-green-100 text-green-700"]
        : ["More out than in", "bg-red-100 text-red-700"],
      detail: b.incomeThisMonth > 0
        ? `${formatMoney(b.incomeThisMonth, currency)} came in · ${formatMoney(b.expenseThisMonth, currency)} went out`
        : "No giving recorded this month",
    },
  ];
}

function summaryLine(b) {
  const good = [];
  const bad = [];
  if (b.attendanceRate >= 60) good.push("well attended");
  else if (b.avgSundayAttendance === 0 || b.attendanceRate < 40) bad.push("low turnout");
  if (b.newMembersThisMonth > 0) good.push("growing");
  if (b.visitorsThisMonth > 0) good.push("welcoming visitors");
  else bad.push("no visitors");
  if (b.peopleReachedThisMonth > 0) good.push("active outreach");
  if (b.incomeThisMonth > 0 && b.netThisMonth < 0) bad.push("spending over income");
  else if (b.incomeThisMonth <= 0) bad.push("no giving recorded");

  const parts = [...good, ...bad].slice(0, 3);
  if (!parts.length) return "Quiet month — low activity across the board";
  return parts.map((p, i) => (i === 0 ? p[0].toUpperCase() + p.slice(1) : p)).join(" · ");
}

// Key: every verdict a branch can get per area, best to worst
const VERDICT_KEY = [
  {
    label: "Attendance",
    items: [
      ["Strong turnout", "60%+ of members attend on Sundays", "bg-green-100 text-green-700"],
      ["Moderate turnout", "40–59% of members attend", "bg-amber-100 text-amber-700"],
      ["Low turnout", "Under 40% of members attend", "bg-red-100 text-red-700"],
      ["No services recorded", "No Sunday attendance logged", "bg-gray-100 text-gray-500"],
    ],
  },
  {
    label: "Growth",
    items: [
      ["Growing", "New members joined this month", "bg-green-100 text-green-700"],
      ["No new members", "Nobody joined this month", "bg-gray-100 text-gray-500"],
    ],
  },
  {
    label: "Visitors",
    items: [
      ["Welcoming visitors", "Visitors came this month", "bg-green-100 text-green-700"],
      ["No visitors", "None welcomed this month", "bg-gray-100 text-gray-500"],
    ],
  },
  {
    label: "Outreach",
    items: [
      ["Active", "People reached this month", "bg-green-100 text-green-700"],
      ["Quiet", "No outreach activity recorded", "bg-gray-100 text-gray-500"],
    ],
  },
  {
    label: "Finances",
    items: [
      ["More in than out", "Income covers spending", "bg-green-100 text-green-700"],
      ["More out than in", "Spending exceeds income", "bg-red-100 text-red-700"],
      ["No income recorded", "No giving recorded this month", "bg-gray-100 text-gray-500"],
    ],
  },
];

function BranchPerformanceTab({ currency }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [expanded, setExpanded] = useState(null);
  const [keyOpen, setKeyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getBranchPerformance();
        const payload = res?.data?.data ?? res?.data;
        if (!cancelled) setData(payload || null);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e?.response?.data?.message || e?.message || "Failed to load branch performance");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const branches = data?.branches || [];
  const dist = { strong: 0, healthy: 0, watch: 0, "at-risk": 0 };
  branches.forEach((b) => { dist[b.rating] = (dist[b.rating] || 0) + 1; });
  const sundays = data?.period?.sundays || 8;

  const totalPages = Math.max(1, Math.ceil(branches.length / limit));
  const safePage = Math.min(page, totalPages);
  const pageRows = branches.slice((safePage - 1) * limit, safePage * limit);
  const pagination = {
    totalResult: branches.length,
    currentPage: safePage,
    totalPages,
    prevPage: safePage > 1 ? safePage - 1 : null,
    nextPage: safePage < totalPages ? safePage + 1 : null,
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 text-xs">
        <span className="font-semibold text-gray-600">How branches are ranked:</span>{" "}
        each church is rated on attendance, growth, visitors, outreach and finances — relative to its own size,
        so a small branch competes fairly with headquarters.
        <span className="font-semibold text-green-700"> Strong</span> and{" "}
        <span className="font-semibold text-blue-700">Healthy</span> are doing well,{" "}
        <span className="font-semibold text-amber-700">Watch</span> and{" "}
        <span className="font-semibold text-red-700">At Risk</span> need follow-up.
      </div>

      {/* Distribution summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Churches Health</div>
            <div className="mt-0.5 text-gray-500 text-xs">
              {data?.period?.label || "This month"} · attendance averaged over the last {sundays} Sundays
            </div>
          </div>
          <div className="flex items-center gap-5">
            {Object.entries(RATING_STYLES).map(([key, s]) => (
              <div key={key} className="text-center">
                <div className={`font-bold text-2xl tabular-nums ${s.text}`}>{dist[key] || 0}</div>
                <div className="text-gray-400 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {branches.length ? (
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
            {Object.entries(RATING_STYLES).map(([key, s]) =>
              dist[key] ? (
                <div
                  key={key}
                  style={{ width: `${(dist[key] / branches.length) * 100}%` }}
                  className={s.bar}
                  title={`${s.label}: ${dist[key]}`}
                />
              ) : null
            )}
          </div>
        ) : null}
      </div>

      {/* Verdict key */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setKeyOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 md:px-6"
        >
          <div>
            <div className="font-semibold text-gray-900 text-sm">What the verdicts mean</div>
            <div className="mt-0.5 text-gray-400 text-xs">The labels you'll see when you open a branch</div>
          </div>
          <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${keyOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {keyOpen ? (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3 md:px-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {VERDICT_KEY.map((area) => (
                <div key={area.label} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                  <div className="font-semibold text-gray-700 text-xs">{area.label}</div>
                  <div className="mt-2 space-y-2">
                    {area.items.map(([label, meaning, cls]) => (
                      <div key={label}>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[10px] ${cls}`}>{label}</span>
                        <div className="mt-0.5 text-gray-500 text-[11px] leading-snug">{meaning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 p-4 md:px-6">
          <div className="font-semibold text-gray-900 text-sm">How each branch is doing</div>
          <div className="mt-0.5 text-gray-400 text-xs">Ranked from strongest to weakest — click a branch for details</div>
        </div>

        {loading ? (
          <div className="space-y-3 p-4 md:p-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 flex-1 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !branches.length ? (
          <EmptyState
            illustration="ministries"
            title="No churches to rank"
            description="Branches will be ranked here once they're added to your organisation."
          />
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {pageRows.map((b, i) => {
                const style = RATING_STYLES[b.rating] || RATING_STYLES.watch;
                const cur = b.currency || currency;
                const rank = (safePage - 1) * limit + i + 1;
                const open = expanded === String(b._id);
                return (
                  <div key={b._id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : String(b._id))}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 md:px-6 ${b.isHeadquarters ? "bg-indigo-50/30" : ""}`}
                    >
                      <span className={`w-6 shrink-0 text-center font-bold text-sm tabular-nums ${MEDALS[rank - 1] || "text-gray-400"}`}>
                        {rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-900 text-sm">
                          {b.name}
                          {b.isHeadquarters ? <HqBadge /> : null}
                          <span className="ml-2 font-normal text-gray-400 text-xs">
                            {[b.city, b.region].filter(Boolean).join(", ")}
                          </span>
                        </div>
                        <div className="mt-0.5 text-gray-500 text-xs">{summaryLine(b)}</div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold text-xs ${style.chip}`}>
                        {style.label}
                      </span>
                      <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {open ? (
                      <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4 md:px-6">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          {indicators(b, cur, sundays).map((ind) => (
                            <div key={ind.label} className="rounded-lg border border-gray-200 bg-white p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-gray-600 text-[11px]">{ind.label}</span>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[10px] whitespace-nowrap ${ind.chip[1]}`}>
                                  {ind.chip[0]}
                                </span>
                              </div>
                              <div className="mt-1 text-gray-500 text-[11px] leading-snug">{ind.detail}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <Pagination
              pagination={pagination}
              rowsCount={pageRows.length}
              limit={limit}
              onLimitChange={(n) => { setLimit(n); setPage(1); }}
              onPageChange={setPage}
              itemName="churches"
            />
          </>
        )}
      </div>
    </div>
  );
}

export default BranchPerformanceTab;
