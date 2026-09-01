import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line
} from "recharts";

import PermissionContext from "../../permissions/permission.store.js";

import {
  getReportsAnalytics,
  getReportsAnalyticsKpi,
  getReportsAnalyticsReport,
  exportReportsAnalyticsReport
} from "../services/reportsAnalytics.api.js";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";

function safeNumber(n) {
  const v = Number(n || 0);
  return Number.isFinite(v) ? v : 0;
}

function ReportsAnalyticsPage() {
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const formatCurrency = useCallback((value) => formatMoney(value, currency), [currency]);
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(
    () => (typeof can === "function" ? can("reportsAnalytics", "read") : true),
    [can]
  );
  const canExport = useMemo(
    () => (typeof can === "function" ? can("reportsAnalytics", "export") : false),
    [can]
  );

  const [activeTab, setActiveTab] = useState("analytics");

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [yearDisplay, setYearDisplay] = useState(() => String(new Date().getFullYear()));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [kpi, setKpi] = useState(null);
  const [series, setSeries] = useState([]);

  const [reportModule, setReportModule] = useState("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [report, setReport] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  const [reportExportOpen, setReportExportOpen] = useState(false);
  const [reportExportLoading, setReportExportLoading] = useState(false);
  const [reportExportError, setReportExportError] = useState("");
  const [reportExportStep, setReportExportStep] = useState("fields");
  const [reportExportFields, setReportExportFields] = useState([]);

  const analyticsParams = useMemo(() => ({ year }), [year]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");

    try {
      const [kpiRes, analyticsRes] = await Promise.all([
        getReportsAnalyticsKpi(),
        getReportsAnalytics(analyticsParams)
      ]);

      setKpi(kpiRes?.data || null);
      setSeries(Array.isArray(analyticsRes?.data?.analytics?.series) ? analyticsRes.data.analytics.series : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load reports analytics");
      setKpi(null);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  useEffect(() => {
    if (!canRead) return;
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
      totalMembers: safeNumber(r?.totalMembers),
      newMembers: safeNumber(r?.newMembers),
      attendance: safeNumber(r?.attendance),
      visitors: safeNumber(r?.visitors)
    }));
  }, [series]);

  const MODULE_OPTIONS = useMemo(
    () => [
      { value: "members", label: "Members" },
      { value: "attendance", label: "Attendance" },
      { value: "tithe-individual", label: "Tithe (Individual)" },
      { value: "tithe-aggregate", label: "Tithe (Aggregate)" },
      { value: "offerings", label: "Offerings" },
      { value: "special-funds", label: "Special Fund" },
      { value: "expenses", label: "Expenses" },
      { value: "pledges", label: "Pledges" },
      { value: "welfare", label: "Welfare" },
      { value: "business-ventures", label: "Business Ventures" },
      { value: "church-projects", label: "Church Projects" },
      { value: "programs-events", label: "Programs & Events" },
      { value: "ministries", label: "Ministries" }
    ],
    []
  );

  const generateReport = async () => {
    setReportLoading(true);
    setReportError("");
    setReport(null);

    try {
      const params = {
        module: reportModule || undefined,
        from: reportFrom || undefined,
        to: reportTo || undefined
      };

      const res = await getReportsAnalyticsReport(params);
      const nextReport = res?.data?.report || null;
      setReport(nextReport);
      setLastGenerated({ module: reportModule, from: reportFrom, to: reportTo });
    } catch (e) {
      setReportError(e?.response?.data?.message || e?.message || "Failed to generate report");
      setReport(null);
      setLastGenerated(null);
    } finally {
      setReportLoading(false);
    }
  };

  const exportReport = async (format, fields) => {
    if (!lastGenerated?.module) return;

    setReportExportLoading(true);
    setReportExportError("");

    try {
      const fieldsRaw = Array.isArray(fields) && fields.length ? fields.join(",") : "";
      const res = await exportReportsAnalyticsReport({
        module: lastGenerated.module,
        from: lastGenerated.from || undefined,
        to: lastGenerated.to || undefined,
        format,
        fields: fieldsRaw || undefined
      });

      const contentType = res?.headers?.["content-type"] || "application/octet-stream";
      const ext = format === "excel" ? "xlsx" : "pdf";
      const labelFrom = lastGenerated.from || "all";
      const labelTo = lastGenerated.to || "time";
      const fileName = `report-${lastGenerated.module}-${labelFrom}-${labelTo}.${ext}`;

      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setReportExportOpen(false);
    } catch (e) {
      setReportExportError(e?.response?.data?.message || e?.message || "Export failed");
    } finally {
      setReportExportLoading(false);
    }
  };

  const reportExportAvailableColumns = useMemo(() => {
    const cols = report?.availableColumns?.length ? report.availableColumns : report?.columns;
    return Array.isArray(cols) ? cols : [];
  }, [report]);

  const openExportModal = () => {
    setReportExportError("");
    setReportExportStep("fields");
    const defaultKeys = (Array.isArray(report?.columns) ? report.columns : []).map((c) => c?.key).filter(Boolean);
    setReportExportFields(defaultKeys);
    setReportExportOpen(true);
  };

  if (!canRead) {
    return (
      <div className="max-w-6xl">
        <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Reports &amp; Analytics</h2>
        <p className="mt-1 text-gray-500 text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Reports &amp; Analytics</h2>
          <p className="mt-1 text-gray-500 text-sm">Analytics and reports for your church data.</p>
        </div>
      </div>

      <PageTabs
        tabs={[
          { key: "analytics", label: "Analytics" },
          { key: "reports", label: "Reports" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        sticky={false}
        className="mt-5"
      />

      {activeTab === "analytics" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="font-semibold text-gray-900 text-sm">Year Filter</div>
              <div className="mt-1 text-gray-500 text-xs">Charts are filtered by year (Jan - Dec)</div>
            </div>

            <div className="w-full md:w-auto">
              <input
                type="text"
                inputMode="numeric"
                value={yearDisplay}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setYearDisplay(raw);
                  const n = Number(raw);
                  if (n >= 1900 && n <= 2100) setYear(n);
                }}
                maxLength={4}
                placeholder="YYYY"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:w-40 text-sm"
              />
            </div>
          </div>
        </div>
      ) : null}

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

      {activeTab === "analytics" ? (
        <>
          {!loading ? (
            <KpiGrid className="mt-6 gap-4 xl:grid-cols-5">
              <KpiCard
                title="Overall Revenue"
                value={formatCurrency(kpi?.kpis?.totalIncome)}
                change={kpi?.kpis?.change?.totalIncome}
                compareLabel="last month"
                iconBg="bg-emerald-50"
                iconColor="text-emerald-500"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
              />
              <KpiCard
                title="Overall Expenses"
                value={formatCurrency(kpi?.kpis?.totalExpenses)}
                change={kpi?.kpis?.change?.totalExpenses}
                compareLabel="last month"
                iconBg="bg-orange-50"
                iconColor="text-orange-500"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M3 8h18M3 8a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2v-8a2 2 0 00-2-2M3 8V6a2 2 0 012-2h14a2 2 0 012 2v2M12 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
              />
              <KpiCard
                title="Overall Surplus / Deficit"
                value={formatCurrency(kpi?.kpis?.surplus)}
                change={kpi?.kpis?.change?.surplus}
                compareLabel="last month"
                iconBg={Number(kpi?.kpis?.surplus || 0) >= 0 ? "bg-blue-50" : "bg-red-50"}
                iconColor={Number(kpi?.kpis?.surplus || 0) >= 0 ? "text-blue-500" : "text-red-500"}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M4 19h16M7 17V9M12 17V5M17 17v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
              />
              <KpiCard
                title="Overall New Members"
                value={String(kpi?.kpis?.newMembers ?? 0)}
                change={kpi?.kpis?.change?.newMembers}
                diff={kpi?.kpis?.diff?.newMembers}
                compareLabel="last month"
                iconBg="bg-violet-50"
                iconColor="text-violet-500"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3M20 21c0-2.21-1.79-4-4-4M2 21v-1a7 7 0 0114 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                }
              />
              <KpiCard
                title="Overall Visitors"
                value={String(kpi?.kpis?.visitors ?? 0)}
                change={kpi?.kpis?.change?.visitors}
                diff={kpi?.kpis?.diff?.visitors}
                compareLabel="last month"
                iconBg="bg-gray-100"
                iconColor="text-gray-500"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M18 21v-2a4 4 0 00-4-4H10a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
              />
            </KpiGrid>
          ) : null}

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="font-semibold text-gray-900 text-sm">Income vs Expenses</div>
              <div className="mt-1 text-gray-500 text-xs">Jan - Dec ({year})</div>

              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v, n) => (n === "income" || n === "expenses" ? formatCurrency(v) : v)}
                      contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                    />
                    <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="font-semibold text-gray-900 text-sm">Offering vs Tithe</div>
              <div className="mt-1 text-gray-500 text-xs">Jan - Dec ({year})</div>

              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v, n) => (n === "offering" || n === "tithe" ? formatCurrency(v) : v)}
                      contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                    />
                    <Line type="monotone" dataKey="offering" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="tithe" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="font-semibold text-gray-900 text-sm">Total Members vs New Members</div>
              <div className="mt-1 text-gray-500 text-xs">Jan - Dec ({year})</div>

              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                    <Line type="monotone" dataKey="totalMembers" stroke="#0f172a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="newMembers" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="font-semibold text-gray-900 text-sm">Attendance vs Visitors</div>
              <div className="mt-1 text-gray-500 text-xs">Jan - Dec ({year})</div>

              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                    <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="visitors" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Generate Report</div>
                <div className="mt-1 text-gray-500 text-xs">Select a module and date range, then generate.</div>
              </div>
              <FilterBar
                searchWidth="md:w-[320px]"
                selects={[
                  {
                    key: "module",
                    value: reportModule,
                    onChange: (v) => setReportModule(v),
                    options: MODULE_OPTIONS,
                    placeholder: "Select module",
                  },
                ]}
                dateFrom={reportFrom}
                dateTo={reportTo}
                onDateApply={(from, to) => { setReportFrom(from || ""); setReportTo(to || ""); }}
              >
                <button
                  type="button"
                  disabled={!reportModule || reportLoading}
                  onClick={generateReport}
                  className="h-10 rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                >
                  {reportLoading ? "Generating…" : "Generate"}
                </button>
                {canExport ? (
                  <button
                    type="button"
                    disabled={!lastGenerated?.module || reportExportLoading}
                    onClick={openExportModal}
                    className="h-10 rounded-lg border border-gray-200 bg-white px-4 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                  >
                    Export
                  </button>
                ) : null}
              </FilterBar>
              <MobileFilterBar
                dateFrom={reportFrom}
                dateTo={reportTo}
                onDateApply={(from, to) => { setReportFrom(from || ""); setReportTo(to || ""); }}
                filters={[
                  {
                    key: "module",
                    label: "Module",
                    value: reportModule,
                    defaultValue: "",
                    options: [{ label: "Select module", value: "" }, ...MODULE_OPTIONS],
                  },
                ]}
                onApply={(pending) => setReportModule(pending.module)}
              />
              <div className="md:hidden flex gap-2">
                <button
                  type="button"
                  disabled={!reportModule || reportLoading}
                  onClick={generateReport}
                  className="h-10 rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                >
                  {reportLoading ? "Generating…" : "Generate"}
                </button>
                {canExport ? (
                  <button
                    type="button"
                    disabled={!lastGenerated?.module || reportExportLoading}
                    onClick={openExportModal}
                    className="h-10 rounded-lg border border-gray-200 bg-white px-4 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                  >
                    Export
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {reportError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{reportError}</div> : null}
          {reportLoading ? (
            <div className="mt-4 animate-pulse">
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-4 md:px-5 lg:px-6 py-4">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                </div>
                <div className="p-4 space-y-3 md:p-6 lg:p-8">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 py-1.5">
                      <div className="h-4 w-20 rounded bg-gray-200" />
                      <div className="h-4 w-16 rounded bg-gray-200" />
                      <div className="h-4 w-24 rounded bg-gray-200" />
                      <div className="h-4 w-12 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {report?.columns?.length ? (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 p-4 md:p-6 lg:p-8">
                <div className="font-semibold text-gray-900 text-sm">{report?.title || "Report"}</div>
                <div className="mt-1 text-gray-500 text-xs">
                  {lastGenerated?.from || "—"} to {lastGenerated?.to || "—"}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      {report.columns.map((c, index) => (
                        <th
                          key={c.key}
                          className={`${index === 0 ? "sticky left-0 z-20 bg-slate-100" : ""} px-6 max-md:px-4 py-2 whitespace-nowrap`}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(Array.isArray(report?.rows) ? report.rows : []).map((r, idx) => (
                      <tr key={idx} className="max-md:text-xs text-gray-700 text-sm">
                        {report.columns.map((c, index) => (
                          <td
                            key={`${idx}-${c.key}`}
                            className={`${index === 0 ? "sticky left-0 z-10 bg-white" : ""} px-6 max-md:px-4 py-2 whitespace-nowrap`}
                          >
                            {String(r?.[c.key] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {canExport && reportExportOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Export Report</div>
                    <div className="mt-1 text-gray-500 text-xs">
                      {reportExportStep === "fields" ? "Select fields to include." : "Choose a format for download."}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportExportOpen(false)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Close
                  </button>
                </div>

                <div className="px-4 md:px-5 lg:px-6 py-4">
                  {reportExportError ? (
                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{reportExportError}</div>
                  ) : null}

                  {reportExportStep === "fields" ? (
                    <div>
                      <div className="max-h-64 overflow-auto rounded-lg border border-gray-200">
                        {reportExportAvailableColumns.length ? (
                          <div className="p-3 grid grid-cols-1 gap-2">
                            {reportExportAvailableColumns.map((c) => {
                              const key = c?.key;
                              const label = c?.label || key;
                              if (!key) return null;
                              const checked = reportExportFields.includes(key);
                              return (
                                <label key={key} className="flex items-center gap-2 text-gray-700 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const nextChecked = e.target.checked;
                                      setReportExportFields((prev) => {
                                        const existing = Array.isArray(prev) ? prev : [];
                                        if (nextChecked) return Array.from(new Set([...existing, key]));
                                        return existing.filter((k) => k !== key);
                                      });
                                    }}
                                  />
                                  <span>{label}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 text-gray-600 text-sm">No fields available.</div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          disabled={!reportExportAvailableColumns.length}
                          onClick={() => setReportExportFields(reportExportAvailableColumns.map((c) => c?.key).filter(Boolean))}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          disabled={reportExportLoading || !reportExportFields.length}
                          onClick={() => setReportExportStep("format")}
                          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          disabled={reportExportLoading}
                          onClick={() => exportReport("pdf", reportExportFields)}
                          className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                        >
                          {reportExportLoading ? "Exporting…" : "Export PDF"}
                        </button>
                        <button
                          type="button"
                          disabled={reportExportLoading}
                          onClick={() => exportReport("excel", reportExportFields)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                        >
                          {reportExportLoading ? "Exporting…" : "Export Excel"}
                        </button>
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={reportExportLoading}
                          onClick={() => setReportExportStep("fields")}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 text-gray-500 text-xs">
                    Period: {lastGenerated?.from || "—"} to {lastGenerated?.to || "—"}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default ReportsAnalyticsPage;
