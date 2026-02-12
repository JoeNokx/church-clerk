import { useContext, useEffect, useMemo, useRef, useState } from "react";
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

function formatCurrency(value) {
  return `GHS ${Number(value || 0).toLocaleString()}`;
}

function safeNumber(n) {
  const v = Number(n || 0);
  return Number.isFinite(v) ? v : 0;
}

function KpiCard({ title, value, accent }) {
  const topBar = accent || "bg-blue-700";

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className={`h-1.5 ${topBar}`} />
      <div className="p-4">
        <div className="text-xs font-semibold text-gray-500">{title}</div>
        <div className="mt-2 text-xl font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function DateRangeFilter({ appliedFrom, appliedTo, onApply, onClear }) {
  const datePickerRef = useRef(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  useEffect(() => {
    setDraftFrom(appliedFrom || "");
    setDraftTo(appliedTo || "");
  }, [appliedFrom, appliedTo]);

  const labelText = useMemo(() => {
    if (!appliedFrom && !appliedTo) return "Date";
    if (appliedFrom && appliedTo && appliedFrom === appliedTo) return appliedFrom;
    if (appliedFrom && appliedTo) return `${appliedFrom} to ${appliedTo}`;
    if (appliedFrom) return appliedFrom;
    if (appliedTo) return appliedTo;
    return "Date";
  }, [appliedFrom, appliedTo]);

  useEffect(() => {
    if (!datePickerOpen) return;

    const onDocMouseDown = (e) => {
      if (!datePickerRef.current) return;
      if (datePickerRef.current.contains(e.target)) return;
      setDatePickerOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [datePickerOpen]);

  const clearDates = async () => {
    setDraftFrom("");
    setDraftTo("");
    await onClear?.();
    setDatePickerOpen(false);
  };

  const onDraftFromChange = (value) => {
    setDraftFrom(value);
    if (draftTo && value && draftTo < value) {
      setDraftTo("");
    }
  };

  const applyDates = async () => {
    const from = draftFrom || "";
    const to = draftTo || "";

    if (!from && !to) {
      await clearDates();
      return;
    }

    if ((from && !to) || (!from && to)) {
      const single = from || to;
      await onApply?.(single, single);
      setDatePickerOpen(false);
      return;
    }

    await onApply?.(from, to);
    setDatePickerOpen(false);
  };

  return (
    <div className="relative" ref={datePickerRef}>
      <button
        type="button"
        onClick={() => setDatePickerOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
          <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
        <span className="text-gray-700">{labelText}</span>
      </button>

      {datePickerOpen && (
        <div className="absolute left-0 z-20 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="text-xs font-semibold text-gray-500">Filter by date</div>
            <button type="button" onClick={clearDates} className="text-xs font-semibold text-gray-600 hover:text-gray-900">
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-500">From</div>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => onDraftFromChange(e.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500">To</div>
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>
          </div>

          <div className="pt-3 text-xs text-gray-500">
            Pick only <span className="font-semibold">From</span> for a single day, or pick both for a range.
          </div>

          <div className="pt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={applyDates}
              className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsAnalyticsPage() {
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(
    () => (typeof can === "function" ? can("reportsAnalytics", "read") : true),
    [can]
  );

  const [activeTab, setActiveTab] = useState("analytics");

  const [year, setYear] = useState(() => new Date().getFullYear());

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
        <h2 className="text-2xl font-semibold text-gray-900">Reports &amp; Analytics</h2>
        <p className="mt-2 text-sm text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Reports &amp; Analytics</h2>
          <p className="mt-2 text-sm text-gray-600">Analytics and reports for your church data.</p>
        </div>
      </div>

      <div className="mt-5 inline-flex rounded-lg border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-md ${
            activeTab === "analytics" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`ml-1 px-4 py-1.5 text-sm font-semibold rounded-md ${
            activeTab === "reports" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          Reports
        </button>
      </div>

      {activeTab === "analytics" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Year Filter</div>
              <div className="mt-1 text-xs text-gray-500">Charts are filtered by year (Jan - Dec)</div>
            </div>

            <div className="w-full sm:w-auto">
              <div className="text-xs font-semibold text-gray-600 mb-1">Year</div>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-10 w-full sm:w-40 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                {Array.from({ length: 10 }).map((_, idx) => {
                  const y = new Date().getFullYear() - idx;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="mt-4 text-sm text-gray-600">Loading…</div> : null}

      {activeTab === "analytics" ? (
        <>
          {!loading ? (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <KpiCard title="Overall Revenue" value={formatCurrency(kpi?.kpis?.totalIncome)} accent="bg-green-600" />
              <KpiCard title="Overall Expenses" value={formatCurrency(kpi?.kpis?.totalExpenses)} accent="bg-orange-600" />
              <KpiCard title="Overall Surplus / Deficit" value={formatCurrency(kpi?.kpis?.surplus)} accent="bg-blue-700" />
              <KpiCard title="Overall New Members" value={String(kpi?.kpis?.newMembers ?? 0)} accent="bg-purple-600" />
              <KpiCard title="Overall Visitors" value={String(kpi?.kpis?.visitors ?? 0)} accent="bg-gray-800" />
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Income vs Expenses</div>
              <div className="mt-1 text-xs text-gray-500">Jan - Dec ({year})</div>

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
              <div className="text-sm font-semibold text-gray-900">Offering vs Tithe</div>
              <div className="mt-1 text-xs text-gray-500">Jan - Dec ({year})</div>

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
              <div className="text-sm font-semibold text-gray-900">Total Members vs New Members</div>
              <div className="mt-1 text-xs text-gray-500">Jan - Dec ({year})</div>

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
              <div className="text-sm font-semibold text-gray-900">Attendance vs Visitors</div>
              <div className="mt-1 text-xs text-gray-500">Jan - Dec ({year})</div>

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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full lg:w-64">
                <div className="text-xs font-semibold text-gray-600 mb-1">Module</div>
                <select
                  value={reportModule}
                  onChange={(e) => setReportModule(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="">Select module</option>
                  {MODULE_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full lg:w-auto">
                <div className="text-xs font-semibold text-gray-600 mb-1">Date</div>
                <DateRangeFilter
                  appliedFrom={reportFrom}
                  appliedTo={reportTo}
                  onApply={async (from, to) => {
                    setReportFrom(from || "");
                    setReportTo(to || "");
                  }}
                  onClear={async () => {
                    setReportFrom("");
                    setReportTo("");
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!reportModule || reportLoading}
                  onClick={generateReport}
                  className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {reportLoading ? "Generating…" : "Generate"}
                </button>

                <button
                  type="button"
                  disabled={!lastGenerated?.module || reportExportLoading}
                  onClick={() => {
                    openExportModal();
                  }}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Export
                </button>
              </div>
            </div>
          </div>

          {reportError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{reportError}</div> : null}
          {reportLoading ? <div className="mt-4 text-sm text-gray-600">Loading…</div> : null}

          {report?.columns?.length ? (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 p-5">
                <div className="text-sm font-semibold text-gray-900">{report?.title || "Report"}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {lastGenerated?.from || "—"} to {lastGenerated?.to || "—"}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left text-xs font-semibold text-gray-500">
                      {report.columns.map((c) => (
                        <th key={c.key} className="px-6 py-2 whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(Array.isArray(report?.rows) ? report.rows : []).map((r, idx) => (
                      <tr key={idx} className="text-sm text-gray-700">
                        {report.columns.map((c) => (
                          <td key={`${idx}-${c.key}`} className="px-6 py-2 whitespace-nowrap">
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

          {reportExportOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Export Report</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {reportExportStep === "fields" ? "Select fields to include." : "Choose a format for download."}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportExportOpen(false)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>

                <div className="px-5 py-4">
                  {reportExportError ? (
                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{reportExportError}</div>
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
                                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
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
                          <div className="p-3 text-sm text-gray-600">No fields available.</div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          disabled={!reportExportAvailableColumns.length}
                          onClick={() => setReportExportFields(reportExportAvailableColumns.map((c) => c?.key).filter(Boolean))}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          disabled={reportExportLoading || !reportExportFields.length}
                          onClick={() => setReportExportStep("format")}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
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
                          className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                        >
                          {reportExportLoading ? "Exporting…" : "Export PDF"}
                        </button>
                        <button
                          type="button"
                          disabled={reportExportLoading}
                          onClick={() => exportReport("excel", reportExportFields)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {reportExportLoading ? "Exporting…" : "Export Excel"}
                        </button>
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={reportExportLoading}
                          onClick={() => setReportExportStep("fields")}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-500">
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
