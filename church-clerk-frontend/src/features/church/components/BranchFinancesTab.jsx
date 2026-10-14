import React, { useEffect, useMemo, useRef, useState } from "react";
import { SkeletonTableRows } from "../../../shared/components/Skeleton/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { getBranchFinances } from "../services/church.api.js";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function HqBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 text-[10px]">
      HQ
    </span>
  );
}

// Month + year picker: type the year or step it with the arrows, pick a month.
function MonthYearPicker({ month, year, onChange }) {
  const [open, setOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(year);
  const boxRef = useRef(null);

  useEffect(() => { setDraftYear(year); }, [year]);
  useEffect(() => {
    if (!open) return undefined;
    const handle = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [open]);

  const label = `${new Date(year, month - 1).toLocaleDateString("en", { month: "long" })} ${year}`;
  const commitYear = (v) => {
    const y = Math.min(2200, Math.max(1900, parseInt(v, 10) || year));
    setDraftYear(y);
  };

  return (
    <div ref={boxRef} className="relative w-full md:w-44">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 font-medium text-gray-700 text-sm hover:bg-gray-50 md:h-10"
      >
        {label}
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => commitYear(draftYear - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="Previous year"
            >
              ‹
            </button>
            <input
              type="number"
              value={draftYear}
              onChange={(e) => setDraftYear(e.target.value === "" ? "" : parseInt(e.target.value, 10) || draftYear)}
              onBlur={(e) => commitYear(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitYear(e.target.value); }}
              className="h-8 w-20 rounded-md border border-gray-200 bg-white text-center font-semibold text-gray-800 text-sm"
            />
            <button
              type="button"
              onClick={() => commitYear(draftYear + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="Next year"
            >
              ›
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {MONTHS_SHORT.map((m, i) => {
              const sel = i + 1 === month && draftYear === year;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { onChange({ month: i + 1, year: draftYear }); setOpen(false); }}
                  className={`rounded-md px-1 py-1.5 text-xs font-semibold ${sel ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BranchFinancesTab({ currency }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [subTab, setSubTab] = useState("income");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getBranchFinances({ month, year });
        const payload = res?.data?.data ?? res?.data;
        if (!cancelled) setData(payload || null);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e?.response?.data?.message || e?.message || "Failed to load branch finances");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const kpis = data?.kpis || {};

  // Show every source column — zero-activity columns render "—" rather than
  // disappearing, so the table stays stable and nothing looks left out.
  const activeSources = useMemo(
    () => (subTab === "income" ? data?.incomeSources || [] : data?.expenseSources || []),
    [data, subTab]
  );

  const sourceTotals = useMemo(() => {
    const bySource = subTab === "income" ? data?.incomeBySource || [] : data?.expenseBySource || [];
    return new Map(bySource.map((s) => [s.key, Number(s.total || 0)]));
  }, [data, subTab]);

  const rows = useMemo(
    () =>
      [...(data?.branches || [])].sort((a, b) => {
        if (a.isHeadquarters !== b.isHeadquarters) return a.isHeadquarters ? -1 : 1;
        const av = subTab === "income" ? a.incomeTotal : a.expenseTotal;
        const bv = subTab === "income" ? b.incomeTotal : b.expenseTotal;
        return (bv || 0) - (av || 0);
      }),
    [data, subTab]
  );

  const grandTotal = subTab === "income" ? Number(kpis.totalIncome || 0) : Number(kpis.totalExpenses || 0);

  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * limit, safePage * limit);
  const pagination = {
    totalResult: rows.length,
    currentPage: safePage,
    totalPages,
    prevPage: safePage > 1 ? safePage - 1 : null,
    nextPage: safePage < totalPages ? safePage + 1 : null,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-white p-1">
          {[
            { key: "income", label: "Income" },
            { key: "expenses", label: "Expenses" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setSubTab(t.key); setPage(1); }}
              className={`rounded-md px-4 py-1.5 font-semibold text-sm transition-colors ${
                subTab === t.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <MonthYearPicker
          month={month}
          year={year}
          onChange={({ month: m, year: y }) => { setMonth(m); setYear(y); setPage(1); }}
        />
      </div>

      <KpiGrid className="gap-3 md:grid-cols-4">
        <KpiCard
          title="Total Income"
          value={formatMoney(kpis.totalIncome || 0, currency)}
          subtitle={`All churches · ${data?.period?.label || ""}`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          iconBg="bg-green-100"
          iconColor="text-green-700"
        />
        <KpiCard
          title="Total Expenses"
          value={formatMoney(kpis.totalExpenses || 0, currency)}
          subtitle={`All churches · ${data?.period?.label || ""}`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 010-4h14v4" />
              <path d="M3 5v14a2 2 0 002 2h16v-5" />
              <path d="M18 12a2 2 0 000 4h4v-4z" />
            </svg>
          }
          iconBg="bg-rose-100"
          iconColor="text-rose-700"
        />
        <KpiCard
          title="Net Position"
          value={formatMoney(kpis.net || 0, currency)}
          subtitle="Income minus expenses"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 3 5-6" />
            </svg>
          }
          iconBg="bg-indigo-100"
          iconColor="text-indigo-700"
        />
        <KpiCard
          title="Total Budget Plan"
          value={formatMoney(kpis.totalBudgetPlan || 0, currency)}
          subtitle={`Planned · ${data?.period?.label || ""}`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 17v-6M15 17V7M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
            </svg>
          }
          iconBg="bg-amber-100"
          iconColor="text-amber-700"
        />
      </KpiGrid>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <div className="h-3.5 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="mt-1.5 h-3 w-56 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <th key={i} className="px-4 py-2 md:px-6"><div className="h-3 w-14 rounded bg-gray-300/60 animate-pulse" /></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <SkeletonTableRows rows={5} widths={["w-32", "w-20", "w-20", "w-20", "w-20"]} cellClass="px-4 py-2.5 md:px-6" />
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <div className="font-semibold text-gray-900 text-sm">
              {subTab === "income" ? "Income by branch" : "Expenses by branch"}
            </div>
            <div className="mt-0.5 text-gray-400 text-xs">
              {subTab === "income"
                ? `All income modules · ${data?.period?.label || ""} · amounts shown in each church's currency`
                : `All expense modules · ${data?.period?.label || ""} · amounts shown in each church's currency`}
            </div>
          </div>
          {!rows.length ? (
            <EmptyState illustration="ministries" title="No churches found" description="Branches of your church will appear here once they're added." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 px-4 py-2 whitespace-nowrap md:px-6">Branch</th>
                    {activeSources.map((s) => (
                      <th key={s.key} className="px-4 py-2 text-right whitespace-nowrap md:px-6">{s.label}</th>
                    ))}
                    <th className="px-4 py-2 text-right whitespace-nowrap md:px-6">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pageRows.map((b) => {
                    const amounts = subTab === "income" ? b.income || {} : b.expenses || {};
                    const total = subTab === "income" ? b.incomeTotal : b.expenseTotal;
                    const cur = b.currency || currency;
                    return (
                      <tr key={b._id} className={`text-gray-700 text-sm ${b.isHeadquarters ? "bg-indigo-50/40" : ""}`}>
                        <td className={`sticky left-0 z-10 px-4 py-2 text-gray-900 whitespace-nowrap md:px-6 ${b.isHeadquarters ? "bg-indigo-50/40" : "bg-white"}`}>
                          <div className="font-medium">
                            {b.name}
                            {b.isHeadquarters ? <HqBadge /> : null}
                          </div>
                          <div className="text-gray-400 text-xs">{[b.city, b.region].filter(Boolean).join(", ")}</div>
                        </td>
                        {activeSources.map((s) => (
                          <td key={s.key} className="px-4 py-2 text-right whitespace-nowrap tabular-nums md:px-6">
                            {Number(amounts[s.key] || 0) > 0 ? formatMoney(amounts[s.key], cur) : "—"}
                          </td>
                        ))}
                        <td className={`px-4 py-2 text-right font-semibold whitespace-nowrap tabular-nums md:px-6 ${subTab === "income" ? "text-green-700" : "text-rose-600"}`}>
                          {formatMoney(total || 0, cur)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {rows.length ? (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900 text-sm">
                      <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2 whitespace-nowrap md:px-6">All churches</td>
                      {activeSources.map((s) => (
                        <td key={s.key} className="px-4 py-2 text-right whitespace-nowrap tabular-nums md:px-6">
                          {formatMoney(sourceTotals.get(s.key) || 0, currency)}
                        </td>
                      ))}
                      <td className={`px-4 py-2 text-right whitespace-nowrap tabular-nums md:px-6 ${subTab === "income" ? "text-green-700" : "text-rose-600"}`}>
                        {formatMoney(grandTotal, currency)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          )}
          {rows.length ? (
            <Pagination
              pagination={pagination}
              rowsCount={pageRows.length}
              limit={limit}
              onLimitChange={(n) => { setLimit(n); setPage(1); }}
              onPageChange={setPage}
              itemName="churches"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default BranchFinancesTab;
