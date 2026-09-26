import React, { useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import Select from "../../../shared/components/Select/index.jsx";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { getBranchFinances } from "../services/church.api.js";

const PERIODS = [
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

function HqBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 text-[10px]">
      Headquarters
    </span>
  );
}

function BranchFinancesTab({ currency }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("month");
  const [subTab, setSubTab] = useState("income");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getBranchFinances({ period });
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
  }, [period]);

  const kpis = data?.kpis || {};

  // Only render source columns that actually have activity in the period
  const activeSources = useMemo(() => {
    const defs = subTab === "income" ? data?.incomeSources || [] : data?.expenseSources || [];
    const bySource = subTab === "income" ? data?.incomeBySource || [] : data?.expenseBySource || [];
    const totalsMap = new Map(bySource.map((s) => [s.key, Number(s.total || 0)]));
    return defs.filter((s) => (totalsMap.get(s.key) || 0) > 0);
  }, [data, subTab]);

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
              onClick={() => setSubTab(t.key)}
              className={`rounded-md px-4 py-1.5 font-semibold text-sm transition-colors ${
                subTab === t.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="w-full md:w-44">
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </div>
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
          title="Top Income Source"
          value={kpis?.topIncomeSource?.label || "—"}
          subtitle={kpis?.topIncomeSource ? formatMoney(kpis.topIncomeSource.total, currency) : "No income recorded"}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.9 6.26L21 9.27l-5 4.4L17.8 21 12 17.27 6.2 21 8 13.67l-5-4.4 6.1-1.01z" />
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
        <Skeleton height={14} count={6} />
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
                  {rows.map((b) => {
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
        </div>
      )}
    </div>
  );
}

export default BranchFinancesTab;
