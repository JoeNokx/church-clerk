import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import {
  getAnnualFinancialStatement,
  getMonthlyFinancialStatement,
  getQuarterlyFinancialStatement,
  exportFinancialStatement
} from "../services/financialStatement.api.js";
import {
  getReportsAnalytics
} from "../../reportsAnalytics/services/reportsAnalytics.api.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import Spinner from "../../../shared/components/Spinner.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from "recharts";

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
      className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-gray-900 text-sm w-24"
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

function FinancialStatementContent() {
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
    if (tab === "monthly") return "last month";
    if (tab === "quarterly") return "last quarter";
    return "last year";
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
      <p className="mt-4 text-gray-600 text-sm">You do not have permission to view financial statements.</p>
    );
  }

  return (
    <>
      <div className="flex gap-1 mt-5 mb-4 overflow-x-auto">
        {[
          { key: "monthly", label: "Monthly" },
          { key: "quarterly", label: "Quarterly" },
          { key: "annual", label: "Yearly" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors shrink-0 ${tab === t.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {tab === "monthly" ? (
              <>
                <div className="font-semibold text-gray-900 text-sm">Monthly Statement</div>
                <div className="mt-1 text-gray-500 text-xs">Select a month and year to view the statement.</div>
              </>
            ) : tab === "quarterly" ? (
              <>
                <div className="font-semibold text-gray-900 text-sm">Quarterly Statement</div>
                <div className="mt-1 text-gray-500 text-xs">Select a quarter and year to view the statement.</div>
              </>
            ) : (
              <>
                <div className="font-semibold text-gray-900 text-sm">Yearly Statement</div>
                <div className="mt-1 text-gray-500 text-xs">Select a year to view the annual statement.</div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {tab === "monthly" ? (
              <FilterBar
                searchWidth="md:w-[320px]"
                selects={[
                  {
                    key: "month",
                    value: String(month),
                    onChange: (v) => setMonth(Number(v)),
                    options: MONTH_OPTIONS.map((m) => ({ label: m.label, value: String(m.value) })),
                    placeholder: "Month",
                  },
                ]}
              >
                <YearInput value={monthYear} onChange={setMonthYear} />
                {canExport ? (
                  <button
                    type="button"
                    onClick={() => { setExportError(""); setExportOpen(true); }}
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
              </FilterBar>
            ) : tab === "quarterly" ? (
              <FilterBar
                searchWidth="md:w-[320px]"
                selects={[
                  {
                    key: "quarter",
                    value: String(quarter),
                    onChange: (v) => setQuarter(Number(v)),
                    options: [
                      { label: "Q1 (Jan - Mar)", value: "1" },
                      { label: "Q2 (Apr - Jun)", value: "2" },
                      { label: "Q3 (Jul - Sep)", value: "3" },
                      { label: "Q4 (Oct - Dec)", value: "4" },
                    ],
                    placeholder: "Quarter",
                  },
                ]}
              >
                <YearInput value={quarterYear} onChange={setQuarterYear} />
                {canExport ? (
                  <button
                    type="button"
                    onClick={() => { setExportError(""); setExportOpen(true); }}
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
              </FilterBar>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <YearInput value={annualYear} onChange={setAnnualYear} />
                {canExport ? (
                  <button
                    type="button"
                    onClick={() => { setExportError(""); setExportOpen(true); }}
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
            )}
          </div>

          {/* Mobile filters */}
          <div className="md:hidden flex items-center gap-2">
            {tab === "monthly" ? (
              <>
                <select
                  value={String(month)}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="h-10 flex-1 appearance-none rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={String(m.value)}>{m.label}</option>
                  ))}
                </select>
                <YearInput value={monthYear} onChange={setMonthYear} />
              </>
            ) : tab === "quarterly" ? (
              <>
                <select
                  value={String(quarter)}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  className="h-10 flex-1 appearance-none rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="1">Q1 (Jan - Mar)</option>
                  <option value="2">Q2 (Apr - Jun)</option>
                  <option value="3">Q3 (Jul - Sep)</option>
                  <option value="4">Q4 (Oct - Dec)</option>
                </select>
                <YearInput value={quarterYear} onChange={setQuarterYear} />
              </>
            ) : (
              <YearInput value={annualYear} onChange={setAnnualYear} />
            )}
            {canExport ? (
              <button
                type="button"
                onClick={() => { setExportError(""); setExportOpen(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 text-sm shrink-0"
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

        <div className="mt-4 text-gray-700 text-sm">
          <span className="font-semibold">Period:</span> {statement?.period?.label || "—"}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-gray-600 md:p-6 lg:p-8 text-sm flex items-center gap-2"><Spinner size="sm" className="text-gray-400" /> Loading statement…</div>
      ) : null}

      {!loading && !error ? (
        <>
          <KpiGrid className="mt-6 gap-4 lg:grid-cols-3">
            <KpiCard
              title="Total Income"
              value={money(kpi.totalIncome)}
              change={kpi.incomeChangePct}
              compareLabel={comparisonLabel}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-500"
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M12 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <KpiCard
              title="Total Expenses"
              value={money(kpi.totalExpenses)}
              change={kpi.expensesChangePct}
              compareLabel={comparisonLabel}
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M17 14l-5 5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <KpiCard
              title="Surplus / Deficit"
              value={money(kpi.surplus)}
              subtitle={`${formatPercent(kpi.surplusPctOfIncome)} of income`}
              iconBg={Number(kpi.surplus || 0) >= 0 ? "bg-blue-50" : "bg-red-50"}
              iconColor={Number(kpi.surplus || 0) >= 0 ? "text-blue-500" : "text-red-500"}
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M7 17V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M12 17V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M17 17v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
            />
          </KpiGrid>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 p-4 md:p-6 lg:p-8">
                <div className="font-semibold text-gray-900 text-sm">Income Breakdown</div>
                <div className="text-gray-500 text-xs">All income sources for the selected period</div>
              </div>
              <div className="p-4 md:p-6 lg:p-8">
                {sortedIncome.length === 0 ? (
                  <EmptyState compact illustration="income" title="No income records found for this period" description="Try selecting a different date range." />
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
                  <EmptyState compact illustration="expenses" title="No expense records found for this period" description="Try selecting a different date range." />
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
        </>
      ) : null}

      {exportOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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
    </>
  );
}

function safeNumber(n) {
  const v = Number(n || 0);
  return Number.isFinite(v) ? v : 0;
}

function FinancialAnalyticsContent() {
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const formatCurrency = useCallback((value) => formatMoney(value, currency), [currency]);
  const { can } = useContext(PermissionContext) || {};
  const canReadAnalytics = useMemo(
    () => (typeof can === "function" ? can("reportsAnalytics", "read") : true),
    [can]
  );

  const [year, setYear] = useState(() => new Date().getFullYear());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [series, setSeries] = useState([]);

  const analyticsParams = useMemo(() => ({ year }), [year]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");

    try {
      const analyticsRes = await getReportsAnalytics(analyticsParams);
      setSeries(Array.isArray(analyticsRes?.data?.analytics?.series) ? analyticsRes.data.analytics.series : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load financial analytics");
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canReadAnalytics) return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReadAnalytics]);

  useEffect(() => {
    if (!canReadAnalytics) return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const chartData = useMemo(() => {
    return (series || []).map((r) => ({
      month: r?.month,
      income: safeNumber(r?.income),
      expenses: safeNumber(r?.expenses),
      offering: safeNumber(r?.offering),
      tithe: safeNumber(r?.tithe),
      specialFunds: safeNumber(r?.specialFunds),
      welfareContributions: safeNumber(r?.welfareContributions),
      welfareDisbursements: safeNumber(r?.welfareDisbursements),
      budget: safeNumber(r?.budget),
      expenditure: safeNumber(r?.expenditure),
      totalMembers: safeNumber(r?.totalMembers),
      newMembers: safeNumber(r?.newMembers),
      attendance: safeNumber(r?.attendance),
      visitors: safeNumber(r?.visitors)
    }));
  }, [series]);

  if (!canReadAnalytics) {
    return <p className="mt-4 text-gray-600 text-sm">You do not have permission to view financial analytics.</p>;
  }

  return (
    <>
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Year Filter</div>
            <div className="mt-1 text-gray-500 text-xs">Charts are filtered by year (Jan - Dec)</div>
          </div>

          <div className="flex items-center gap-1 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setYear((y) => Math.max(1900, y - 1))}
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 shrink-0"
              aria-label="Previous year"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
            </button>
            <YearInput value={year} onChange={setYear} />
            <button
              type="button"
              onClick={() => setYear((y) => Math.min(2100, y + 1))}
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 shrink-0"
              aria-label="Next year"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div> : null}
      {loading ? (
        <div className="mt-4 animate-pulse">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="mt-4 h-64 rounded-lg bg-gray-200" />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="mt-4 h-64 rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>
      ) : null}



      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="font-semibold text-gray-900 text-sm">Income vs Expenses</div>
          <div className="mt-1 text-gray-500 text-xs">Jan - Dec ({year})</div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 12, left: -14, bottom: -8 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => (n === "Income" || n === "Expenses" ? formatCurrency(v) : v)} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }} labelStyle={{ fontWeight: 600, color: "#111827" }} cursor={{ stroke: "#16a34a", strokeWidth: 1, strokeDasharray: "4 2" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#16a34a" strokeWidth={1.4} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 5, fill: "#16a34a" }} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f97316" strokeWidth={1.4} fill="url(#expensesGrad)" dot={false} activeDot={{ r: 5, fill: "#f97316" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="font-semibold text-gray-900 text-sm">Offering vs Tithe vs Special Funds</div>
          <div className="mt-1 text-gray-500 text-xs">Jan - Dec ({year})</div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 12, left: -14, bottom: -8 }}>
                <defs>
                  <linearGradient id="offeringGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="titheGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="specialFundsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => (["Offering", "Tithe", "Special Funds"].includes(n) ? formatCurrency(v) : v)} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }} labelStyle={{ fontWeight: 600, color: "#111827" }} cursor={{ stroke: "#2563eb", strokeWidth: 1, strokeDasharray: "4 2" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="offering" name="Offering" stroke="#2563eb" strokeWidth={1.4} fill="url(#offeringGrad)" dot={false} activeDot={{ r: 5, fill: "#2563eb" }} />
                <Area type="monotone" dataKey="tithe" name="Tithe" stroke="#7c3aed" strokeWidth={1.4} fill="url(#titheGrad)" dot={false} activeDot={{ r: 5, fill: "#7c3aed" }} />
                <Area type="monotone" dataKey="specialFunds" name="Special Funds" stroke="#10b981" strokeWidth={1.4} fill="url(#specialFundsGrad)" dot={false} activeDot={{ r: 5, fill: "#10b981" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="font-semibold text-gray-900 text-sm">Welfare Contribution vs Disbursement</div>
          <div className="mt-1 text-gray-500 text-xs">Jan - Dec ({year})</div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="18%" barGap={3}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => (["Contributions", "Disbursements"].includes(n) ? formatCurrency(v) : v)} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }} labelStyle={{ fontWeight: 600, color: "#111827" }} cursor={{ fill: "#f9fafb" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="welfareContributions" name="Contributions" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={44} />
                <Bar dataKey="welfareDisbursements" name="Disbursements" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="font-semibold text-gray-900 text-sm">Budget vs Expenditure</div>
          <div className="mt-1 text-gray-500 text-xs">Monthly budget target vs actual expenses · {year}</div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="18%" barGap={3}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => (["Budget", "Expenditure"].includes(n) ? formatCurrency(v) : v)} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }} labelStyle={{ fontWeight: 600, color: "#111827" }} cursor={{ fill: "#f9fafb" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="budget" name="Budget" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={44} />
                <Bar dataKey="expenditure" name="Expenditure" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

function FinancialStatementPage() {
  const { can } = useContext(PermissionContext) || {};
  const canReadStatement = useMemo(() => (typeof can === "function" ? can("financialStatement", "read") : true), [can]);
  const canReadAnalytics = useMemo(() => (typeof can === "function" ? can("reportsAnalytics", "read") : true), [can]);

  const [overviewTab, setOverviewTab] = useState("statement");

  const tabs = useMemo(() => {
    const list = [];
    if (canReadStatement) list.push({ key: "statement", label: "Financial Statement" });
    if (canReadAnalytics) list.push({ key: "analytics", label: "Financial Analytics" });
    return list;
  }, [canReadStatement, canReadAnalytics]);

  // Ensure active tab is allowed
  useEffect(() => {
    if (overviewTab === "statement" && !canReadStatement && canReadAnalytics) setOverviewTab("analytics");
    if (overviewTab === "analytics" && !canReadAnalytics && canReadStatement) setOverviewTab("statement");
  }, [canReadStatement, canReadAnalytics, overviewTab]);

  if (!canReadStatement && !canReadAnalytics) {
    return (
      <div className="max-w-6xl">
        <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Financial Overview</h2>
        <p className="mt-2 text-gray-600 text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div>
        <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Financial Overview</h2>
        <p className="mt-2 text-gray-600 text-sm hidden md:block">Statement and analytics for your church finances</p>
      </div>

      <PageTabs
        tabs={tabs}
        activeTab={overviewTab}
        onChange={setOverviewTab}
        sticky={false}
        className="mt-6"
      />

      {overviewTab === "statement" ? <FinancialStatementContent /> : null}
      {overviewTab === "analytics" ? <FinancialAnalyticsContent /> : null}
    </div>
  );
}

export default FinancialStatementPage;
