import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../Permissions/permission.store.js";
import ChurchContext from "../../Church/church.store.js";
import {
  exportFinancialStatement,
  getAnnualFinancialStatement,
  getMonthlyFinancialStatement,
  getQuarterlyFinancialStatement
} from "../services/financialStatement.api.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";

function formatCurrency(value, currency) {
  return formatMoney(value, currency);
}

function formatPercent(value) {
  const v = Number(value || 0);
  const rounded = Math.round(v * 10) / 10;
  const absRounded = Math.abs(rounded);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${absRounded}%`;
}

function clampPercent(value) {
  const v = Number(value || 0);
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

function formatPercentNumber(value) {
  const v = Number(value || 0);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 10) / 10;
}

function toSafeFileSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function getCurrentQuarter(monthIndex0) {
  return Math.floor(Number(monthIndex0 || 0) / 3) + 1;
}

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
];

function buildYearOptions({ fromYear, toYear }) {
  const years = [];
  for (let y = toYear; y >= fromYear; y -= 1) {
    years.push(y);
  }
  return years;
}

function FinancialStatementPage() {
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const money = useMemo(() => (value) => formatCurrency(value, currency), [currency]);

  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("financialStatement", "read") : true), [can]);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = getCurrentQuarter(now.getMonth());

  const yearOptions = useMemo(() => buildYearOptions({ fromYear: currentYear - 10, toYear: currentYear + 1 }), [currentYear]);

  const [tab, setTab] = useState("monthly");

  const [month, setMonth] = useState(currentMonth);
  const [monthYear, setMonthYear] = useState(currentYear);

  const [quarter, setQuarter] = useState(currentQuarter);
  const [quarterYear, setQuarterYear] = useState(currentYear);

  const [annualYear, setAnnualYear] = useState(currentYear);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statement, setStatement] = useState(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    if (!canRead) return;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        let res;

        if (tab === "monthly") {
          res = await getMonthlyFinancialStatement({ month, year: monthYear });
        } else if (tab === "quarterly") {
          const startMonth = (Number(quarter) - 1) * 3 + 1;
          const endMonth = startMonth + 2;
          res = await getQuarterlyFinancialStatement({ startMonth, endMonth, year: quarterYear });
        } else {
          res = await getAnnualFinancialStatement({ year: annualYear });
        }

        const payload = res?.data?.data ?? res?.data;
        const data = payload?.data ?? payload;
        setStatement(data);
      } catch (e) {
        setStatement(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load financial statement");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [annualYear, canRead, month, monthYear, quarter, quarterYear, tab]);

  const kpi = statement?.kpi || {};
  const incomeDetails = Array.isArray(statement?.incomeDetails) ? statement.incomeDetails : [];
  const expenseDetails = Array.isArray(statement?.expenseDetails) ? statement.expenseDetails : [];

  const sortedIncome = useMemo(() => [...incomeDetails].sort((a, b) => Number(b?.amount || 0) - Number(a?.amount || 0)), [incomeDetails]);
  const sortedExpenses = useMemo(
    () => [...expenseDetails].sort((a, b) => Number(b?.amount || 0) - Number(a?.amount || 0)),
    [expenseDetails]
  );

  const comparisonLabel = useMemo(() => {
    if (tab === "monthly") return "vs from last month";
    if (tab === "quarterly") return "vs from last quarter";
    return "vs from last year";
  }, [tab]);

  const summaryText = useMemo(() => {
    if (!statement) return "";

    const periodLabel = statement?.period?.label || "this period";
    const totalIncome = money(kpi.totalIncome);
    const totalExpenses = money(kpi.totalExpenses);
    const surplusValue = Number(kpi.surplus || 0);
    const surplusLabel = surplusValue >= 0 ? "surplus" : "deficit";
    const surplusAmount = money(Math.abs(surplusValue));

    const topIncomeLabel = statement?.highlights?.topIncomeSource?.label;
    const topIncomePct = formatPercentNumber(statement?.highlights?.topIncomeSource?.percentage);

    const topExpenseLabel = statement?.highlights?.topExpenseCategory?.label;
    const topExpensePct = formatPercentNumber(statement?.highlights?.topExpenseCategory?.percentage);

    const prefix = tab === "monthly" ? "For the month of" : tab === "quarterly" ? "For the quarter of" : "For the year of";

    const incomeSentence = `the church recorded a total income of ${totalIncome} and total expenses of ${totalExpenses}, resulting in a ${surplusLabel} of ${surplusAmount}.`;

    const incomeHighlight = topIncomeLabel ? ` The primary income source was ${topIncomeLabel} (${topIncomePct}%).` : "";

    const expenseHighlight = topExpenseLabel ? ` The largest expense category was ${topExpenseLabel} (${topExpensePct}%).` : "";

    return `${prefix} ${periodLabel}, ${incomeSentence}${incomeHighlight}${expenseHighlight}`;
  }, [kpi.expensesChangePct, kpi.surplus, kpi.totalExpenses, kpi.totalIncome, money, statement, tab]);

  const handleExport = async (format) => {
    if (!statement) return;

    setExporting(true);
    setExportError("");

    try {
      const params = { format, type: tab };
      if (tab === "monthly") {
        params.month = month;
        params.year = monthYear;
      } else if (tab === "quarterly") {
        params.startMonth = (Number(quarter) - 1) * 3 + 1;
        params.endMonth = params.startMonth + 2;
        params.year = quarterYear;
      } else {
        params.year = annualYear;
      }

      const res = await exportFinancialStatement(params);

      const contentType = res?.headers?.["content-type"] || "application/octet-stream";
      const ext = format === "excel" ? "xlsx" : "pdf";
      const fileName = `financial-statement-${tab}-${toSafeFileSegment(statement?.period?.label)}.${ext}`;

      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportOpen(false);
    } catch (e) {
      setExportError(e?.response?.data?.message || e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (!canRead) {
    return (
      <div className="max-w-6xl">
        <h2 className="text-2xl font-semibold text-gray-900">Financial Statement</h2>
        <p className="mt-2 text-sm text-gray-600">You do not have permission to view financial statements.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Financial Statement</h2>
          <p className="mt-2 text-sm text-gray-600">Overview of income and expenses for the selected period</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setExportError("");
              setExportOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M12 3v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path
                d="M8 9l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Export
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setTab("monthly")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "monthly" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setTab("quarterly")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "quarterly" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              Quarterly
            </button>
            <button
              type="button"
              onClick={() => setTab("annual")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "annual" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              Yearly
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {tab === "monthly" ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-gray-500">Month</div>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-gray-500">Year</div>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    value={monthYear}
                    onChange={(e) => setMonthYear(Number(e.target.value))}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            {tab === "quarterly" ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-gray-500">Quarter</div>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    value={quarter}
                    onChange={(e) => setQuarter(Number(e.target.value))}
                  >
                    <option value={1}>Q1 (Jan - Mar)</option>
                    <option value={2}>Q2 (Apr - Jun)</option>
                    <option value={3}>Q3 (Jul - Sep)</option>
                    <option value={4}>Q4 (Oct - Dec)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-gray-500">Year</div>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    value={quarterYear}
                    onChange={(e) => setQuarterYear(Number(e.target.value))}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            {tab === "annual" ? (
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-gray-500">Year</div>
                <select
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                  value={annualYear}
                  onChange={(e) => setAnnualYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-700">
          <span className="font-semibold">Period:</span> {statement?.period?.label || "—"}
        </div>
      </div>

      {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading statement…</div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Total Income</div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">{money(kpi.totalIncome)}</div>
                  <div className="mt-1 text-xs font-semibold text-green-600">
                    {formatPercent(kpi.incomeChangePct)} {comparisonLabel}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-green-600">
                    <path d="M12 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path
                      d="M7 10l5-5 5 5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Total Expenses</div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">{money(kpi.totalExpenses)}</div>
                  <div className="mt-1 text-xs font-semibold text-orange-600">
                    {formatPercent(kpi.expensesChangePct)} {comparisonLabel}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-orange-500">
                    <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path
                      d="M17 14l-5 5-5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Surplus / Deficit</div>
                  <div
                    className={`mt-2 text-lg font-semibold ${Number(kpi.surplus || 0) >= 0 ? "text-gray-900" : "text-red-700"}`}
                  >
                    {money(kpi.surplus)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-blue-700">
                    {formatPercent(kpi.surplusPctOfIncome)} of income
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-600">
                    <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M7 17V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M12 17V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M17 17v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 p-5">
                <div className="text-sm font-semibold text-gray-900">Income Breakdown</div>
                <div className="text-xs text-gray-500">All income sources for the selected period</div>
              </div>
              <div className="p-5">
                {sortedIncome.length === 0 ? (
                  <div className="text-sm text-gray-600">No income records found for this period.</div>
                ) : (
                  <div className="space-y-4">
                    {sortedIncome.map((row) => (
                      <div key={row.key} className="space-y-2 rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm font-semibold text-gray-900">{row.label}</div>
                          <div className="text-sm font-semibold text-gray-900">{money(row.amount)}</div>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-xs text-gray-500">
                          <div>{Math.round(Number(row.percentage || 0) * 10) / 10}% of income</div>
                          <div className="w-full max-w-xs">
                            <div className="h-2 w-full rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-green-500"
                                style={{ width: `${clampPercent(row.percentage)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 p-5">
                <div className="text-sm font-semibold text-gray-900">Expenses Breakdown</div>
                <div className="text-xs text-gray-500">All expense categories for the selected period</div>
              </div>
              <div className="p-5">
                {sortedExpenses.length === 0 ? (
                  <div className="text-sm text-gray-600">No expense records found for this period.</div>
                ) : (
                  <div className="space-y-4">
                    {sortedExpenses.map((row) => (
                      <div key={row.key} className="space-y-2 rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm font-semibold text-gray-900">{row.label}</div>
                          <div className="text-sm font-semibold text-gray-900">{money(row.amount)}</div>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-xs text-gray-500">
                          <div>{Math.round(Number(row.percentage || 0) * 10) / 10}% of expenses</div>
                          <div className="w-full max-w-xs">
                            <div className="h-2 w-full rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-orange-500"
                                style={{ width: `${clampPercent(row.percentage)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-700">
                  <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M7 17V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M12 17V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M17 17v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-900">Financial Summary</div>
                <div className="mt-2 text-sm text-gray-700">{summaryText || "—"}</div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {exportOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => (!exporting ? setExportOpen(false) : null)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Export Statement</div>
                <div className="mt-1 text-sm text-gray-600">Choose a format for the current view.</div>
              </div>

              <button
                type="button"
                onClick={() => setExportOpen(false)}
                disabled={exporting}
                className="rounded-md px-2 py-1 text-sm font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                disabled={exporting}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
              >
                Export as PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport("excel")}
                disabled={exporting}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
              >
                Export as Excel
              </button>
            </div>

            {exportError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{exportError}</div> : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                disabled={exporting}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FinancialStatementPage;
