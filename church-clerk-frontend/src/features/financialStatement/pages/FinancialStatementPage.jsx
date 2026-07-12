import { useContext, useEffect, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import {
  getAnnualFinancialStatement,
  getMonthlyFinancialStatement,
  getQuarterlyFinancialStatement,
  exportFinancialStatement
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

function YearInput({ value, onChange }) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={raw}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 4);
        setRaw(cleaned);
        const n = Number(cleaned);
        if (n >= 1900 && n <= 2100) onChange(n);
      }}
      maxLength={4}
      placeholder="YYYY"
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm w-24"
    />
  );
}

const INCOME_KEY_PAGE = {
  tithes: "tithe",
  tithesAggregate: "tithe",
  offerings: "offerings",
  eventOfferings: "offerings",
  cellOfferings: "offerings",
  groupOfferings: "offerings",
  departmentOfferings: "offerings",
  projectContributions: "church-projects",
  welfareContributions: "welfare",
  specialFunds: "special-funds",
  businessIncome: "business-ventures",
  pledgesPaid: "pledges"
};

const EXPENSE_KEY_PAGE = {
  generalExpenses: "expenses",
  welfareDisbursements: "welfare",
  projectExpenses: "church-projects",
  businessExpenses: "business-ventures"
};

function FinancialStatementPage() {
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const money = useMemo(() => (value) => formatCurrency(value, currency), [currency]);
  const { toPage } = useDashboardNavigator();
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("financialStatement", "read") : true), [can]);
  const canExport = useMemo(() => (typeof can === "function" ? can("financialStatement", "export") : false), [can]);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = getCurrentQuarter(now.getMonth());

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
  const sortedExpenses = useMemo(() => [...expenseDetails].sort((a, b) => Number(b?.amount || 0) - Number(a?.amount || 0)), [expenseDetails]);

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

    const incomeHighlight = topIncomeLabel
      ? ` The primary income source was ${topIncomeLabel} (${topIncomePct}%).`
      : "";

    const expenseHighlight = topExpenseLabel
      ? ` The largest expense category was ${topExpenseLabel} (${topExpensePct}%).`
      : "";

    return `${prefix} ${periodLabel}, ${incomeSentence}${incomeHighlight}${expenseHighlight}`;
  }, [kpi.expensesChangePct, kpi.surplus, kpi.totalExpenses, kpi.totalIncome, statement, tab]);

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
        <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Financial Statement</h2>
        <p className="mt-2 text-gray-600 text-sm">You do not have permission to view financial statements.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Financial Statement</h2>
          <p className="mt-2 text-gray-600 text-sm">Overview of income and expenses for the selected period</p>
        </div>

        <div className="flex items-center gap-3">
          {canExport ? (
            <button
              type="button"
              onClick={() => {
                setExportError("");
                setExportOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 text-sm"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M12 3v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Export
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="cck-tab-bar flex items-center gap-2 rounded-lg bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setTab("monthly")}
              className={`rounded-md px-4 py-2 font-semibold text-sm ${tab === "monthly" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setTab("quarterly")}
              className={`rounded-md px-4 py-2 font-semibold text-sm ${tab === "quarterly" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              Quarterly
            </button>
            <button
              type="button"
              onClick={() => setTab("annual")}
              className={`rounded-md px-4 py-2 font-semibold text-sm ${tab === "annual" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              Yearly
            </button>
          </div>

          <div className="flex flex-row flex-wrap gap-2 items-center">
            {tab === "monthly" ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="hidden md:block font-semibold text-gray-500 text-xs">Month</div>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm"
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
                  <div className="hidden md:block font-semibold text-gray-500 text-xs">Year</div>
                  <YearInput value={monthYear} onChange={setMonthYear} />
                </div>
              </>
            ) : null}

            {tab === "quarterly" ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="hidden md:block font-semibold text-gray-500 text-xs">Quarter</div>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm"
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
                  <div className="hidden md:block font-semibold text-gray-500 text-xs">Year</div>
                  <YearInput value={quarterYear} onChange={setQuarterYear} />
                </div>
              </>
            ) : null}

            {tab === "annual" ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:block font-semibold text-gray-500 text-xs">Year</div>
                <YearInput value={annualYear} onChange={setAnnualYear} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 text-gray-700 text-sm">
          <span className="font-semibold">Period:</span> {statement?.period?.label || "—"}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-gray-600 md:p-6 lg:p-8 text-sm">Loading statement…</div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Total Income</div>
                  <div className="mt-2 font-semibold text-gray-900 text-lg">{money(kpi.totalIncome)}</div>
                  <div className="mt-1 font-semibold text-green-600 text-xs">{formatPercent(kpi.incomeChangePct)} {comparisonLabel}</div>
                </div>
                <div className="h-11 w-11 rounded-lg bg-green-50 flex items-center justify-center md:h-12 md:w-12">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-green-600">
                    <path d="M12 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Total Expenses</div>
                  <div className="mt-2 font-semibold text-gray-900 text-lg">{money(kpi.totalExpenses)}</div>
                  <div className="mt-1 font-semibold text-orange-600 text-xs">{formatPercent(kpi.expensesChangePct)} {comparisonLabel}</div>
                </div>
                <div className="h-11 w-11 rounded-lg bg-orange-50 flex items-center justify-center md:h-12 md:w-12">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-orange-500">
                    <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M17 14l-5 5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Surplus / Deficit</div>
                  <div className={`mt-2 font-semibold text-lg ${Number(kpi.surplus || 0) >= 0 ? "text-gray-900" : "text-red-700"}`}>
                    {money(kpi.surplus)}
                  </div>
                  <div className="mt-1 font-semibold text-blue-700 text-xs">{formatPercent(kpi.surplusPctOfIncome)} of income</div>
                </div>
                <div className="h-11 w-11 rounded-lg bg-blue-50 flex items-center justify-center md:h-12 md:w-12">
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
              <div className="border-b border-gray-200 p-4 md:p-6 lg:p-8">
                <div className="font-semibold text-gray-900 text-sm">Income Breakdown</div>
                <div className="text-gray-500 text-xs">All income sources for the selected period</div>
              </div>
              <div className="p-4 md:p-6 lg:p-8">
                {sortedIncome.length === 0 ? (
                  <div className="text-gray-600 text-sm">No income records found for this period.</div>
                ) : (
                  <div className="space-y-4">
                    {sortedIncome.map((row) => {
                      const page = INCOME_KEY_PAGE[row.key];
                      return (
                        <div
                          key={row.key}
                          className={`space-y-2 rounded-lg border border-gray-200 p-3 ${page ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}`}
                          onClick={page ? () => toPage(page) : undefined}
                          role={page ? "button" : undefined}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="font-semibold text-gray-900 text-sm">{row.label}</div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 text-sm">{money(row.amount)}</span>
                              {page ? <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-400 flex-shrink-0"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> : null}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-gray-500 text-xs">
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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 p-4 md:p-6 lg:p-8">
                <div className="font-semibold text-gray-900 text-sm">Expenses Breakdown</div>
                <div className="text-gray-500 text-xs">All expense categories for the selected period</div>
              </div>
              <div className="p-4 md:p-6 lg:p-8">
                {sortedExpenses.length === 0 ? (
                  <div className="text-gray-600 text-sm">No expense records found for this period.</div>
                ) : (
                  <div className="space-y-4">
                    {sortedExpenses.map((row) => {
                      const page = EXPENSE_KEY_PAGE[row.key];
                      return (
                        <div
                          key={row.key}
                          className={`space-y-2 rounded-lg border border-gray-200 p-3 ${page ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}`}
                          onClick={page ? () => toPage(page) : undefined}
                          role={page ? "button" : undefined}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="font-semibold text-gray-900 text-sm">{row.label}</div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 text-sm">{money(row.amount)}</span>
                              {page ? <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-400 flex-shrink-0"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> : null}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-gray-500 text-xs">
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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-lg bg-blue-50 flex items-center justify-center md:h-12 md:w-12">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-700">
                  <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M7 17V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M12 17V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M17 17v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>

              <div>
                <div className="font-semibold text-gray-900 text-sm">Financial Summary</div>
                <div className="mt-2 text-gray-700 text-sm">{summaryText || "—"}</div>
              </div>
            </div>
          </div>
       canExport &&  </>
      ) : null}

      {exportOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => (!exporting ? setExportOpen(false) : null)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl md:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900 text-lg">Export Statement</div>
                <div className="mt-1 text-gray-600 text-sm">Choose a format for the current view.</div>
              </div>

              <button
                type="button"
                onClick={() => setExportOpen(false)}
                disabled={exporting}
                className="rounded-md px-2 py-1 font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-50 text-sm"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                disabled={exporting}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 text-sm"
              >
                Export as PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport("excel")}
                disabled={exporting}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 text-sm"
              >
                Export as Excel
              </button>
            </div>

            {exportError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{exportError}</div> : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                disabled={exporting}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
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
