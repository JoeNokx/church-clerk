import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import PermissionContext from "../../permissions/permission.store.js";

import {
  getSavedReports,
  getSavedReport,
  deleteSavedReport,
  downloadSavedReport
} from "../services/reportsAnalytics.api.js";
import ReportGenerateModal from "../components/ReportGenerateModal.jsx";
import Card from "../../../shared/components/Card/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import debounce from "../../../shared/utils/debounce.js";
import { showSuccess, showError } from "../../../utils/toast.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

const MODULES = [
  {
    value: "members",
    label: "Members",
    description: "Directory of all registered church members.",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" /><path d="M3 20a6 6 0 0112 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M16 5.5a3 3 0 010 5.5M17.8 14.4A6 6 0 0121 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "attendance-total",
    label: "Attendance (Total)",
    description: "Head-count totals recorded per service.",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M9 2h6v3H9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9.5 13.5l2 2 3.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
  },
  {
    value: "attendance-individual",
    label: "Attendance (Individual)",
    description: "Member-level present and absent records per service.",
    iconBg: "bg-green-100",
    iconColor: "text-green-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" /><path d="M3 20a6 6 0 0112 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M15.5 12.5l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
  },
  {
    value: "visitors",
    label: "Visitors",
    description: "First-time and returning visitor records.",
    iconBg: "bg-lime-100",
    iconColor: "text-lime-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" /><path d="M3 20a6 6 0 0112 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18 8v6M15 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "tithe-individual",
    label: "Tithe (Individual)",
    description: "Tithe payments made by individual members.",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="2" /><path d="M3 20a6 6 0 0110.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="17" cy="17" r="4" stroke="currentColor" strokeWidth="2" /><path d="M17 15v4M15.5 16.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "tithe-aggregate",
    label: "Tithe (Aggregate)",
    description: "Bulk tithe totals recorded per service or group.",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="2" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" stroke="currentColor" strokeWidth="2" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke="currentColor" strokeWidth="2" /></svg>
    )
  },
  {
    value: "offerings",
    label: "Offerings",
    description: "Offering collections by service and type.",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="4" y="10" width="16" height="4" rx="1" stroke="currentColor" strokeWidth="2" /><path d="M6 14v6h12v-6M12 10v10" stroke="currentColor" strokeWidth="2" /><path d="M8 10a2.5 2.5 0 114-3 2.5 2.5 0 114 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "special-funds",
    label: "Special Fund",
    description: "Special fund giving by category and giver.",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
    )
  },
  {
    value: "expenses",
    label: "Expenses",
    description: "General church expense records by category.",
    iconBg: "bg-red-100",
    iconColor: "text-red-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9 8.5h6M9 12.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "budgeting",
    label: "Budgeting",
    description: "Budget items and allocations by fiscal year.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M8 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "pledges",
    label: "Fundraising — Pledges",
    description: "Member pledges, amounts, deadlines and status.",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 21V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6 4h11l-2.5 4L17 12H6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
    )
  },
  {
    value: "welfare",
    label: "Welfare",
    description: "Welfare contributions and disbursements.",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 20.5S4 15.5 4 10a4.2 4.2 0 018-2.6A4.2 4.2 0 0120 10c0 5.5-8 10.5-8 10.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
    )
  },
  {
    value: "business-ventures",
    label: "Business Ventures",
    description: "Church business ventures and their managers.",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2M3 13.5h18" stroke="currentColor" strokeWidth="2" /></svg>
    )
  },
  {
    value: "church-projects",
    label: "Fundraising",
    description: "Fundraiser targets, status and creation dates.",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 21h16M6 21v-9l6-5 6 5v9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M12 3v4M10 5h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "programs-events",
    label: "Programs & Events",
    description: "Programs and events with dates and venues.",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "organisations",
    label: "Organisations",
    description: "Groups, departments, cells and ministries.",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="9" y="3" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="2" /><rect x="3" y="16" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="2" /><rect x="15" y="16" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4m0 0H6v4m6-4h6v4" stroke="currentColor" strokeWidth="2" /></svg>
    )
  },
  {
    value: "outreach-followup",
    label: "Outreach & Follow-Up",
    description: "Outreach events, prospects and follow-up activity.",
    iconBg: "bg-fuchsia-100",
    iconColor: "text-fuchsia-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
    )
  },
  {
    value: "announcements",
    label: "Announcements",
    description: "Announcements and sent message campaigns.",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 9v6h3l8 5V4L7 9H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M18 8.5a5 5 0 010 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "billing",
    label: "Billing",
    description: "Subscription payments and invoice history.",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    value: "audit",
    label: "Audit",
    description: "Activity logs of actions performed in the system.",
    iconBg: "bg-gray-200",
    iconColor: "text-gray-700",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9.5 12l2 2 3.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
  }
];

const MODULE_FILTER_OPTIONS = [
  { label: "All Modules", value: "all" },
  ...MODULES.map((m) => ({ label: m.label, value: m.value }))
];

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatPeriod(from, to) {
  const f = from ? new Date(from).toISOString().slice(0, 10) : "";
  const t = to ? new Date(to).toISOString().slice(0, 10) : "";
  if (f && t) return `${f} - ${t}`;
  return f || t || "All time";
}

function saveBlob(res, fallbackName) {
  const contentType = res?.headers?.["content-type"] || "application/octet-stream";
  const blob = new Blob([res.data], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function FileIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function RowDownloadMenu({ row, downloading, onDownload }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: null, bottom: null, left: 0 });
  const btnRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuH = 2 * 36 + 8;
      const menuW = 128;
      const openUp = window.innerHeight - rect.bottom < menuH + 8;
      setPos({
        top: openUp ? null : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : null,
        left: Math.max(8, rect.right - menuW)
      });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="Download"
        disabled={Boolean(downloading)}
        onClick={toggle}
        className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
      >
        <DownloadIcon />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="z-[9999] w-32 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
            style={pos.bottom != null
              ? { position: "fixed", bottom: pos.bottom, left: pos.left }
              : { position: "fixed", top: pos.top, left: pos.left }}
          >
            <button
              type="button"
              onClick={() => { setOpen(false); onDownload(row, "pdf"); }}
              className="w-full px-4 py-2 text-left font-semibold text-gray-700 hover:bg-gray-50 border-b border-gray-100 text-xs"
            >
              {downloading === "pdf" ? "Downloading…" : "PDF"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onDownload(row, "csv"); }}
              className="w-full px-4 py-2 text-left font-semibold text-gray-700 hover:bg-gray-50 text-xs"
            >
              {downloading === "csv" ? "Downloading…" : "CSV"}
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReportsAnalyticsPage() {
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(
    () => (typeof can === "function" ? can("reportsAnalytics", "read") : true),
    [can]
  );
  const canGenerate = useMemo(
    () => (typeof can === "function" ? can("reportsAnalytics", "generate") : false),
    [can]
  );
  const canExport = useMemo(
    () => (typeof can === "function" ? can("reportsAnalytics", "export") : false),
    [can]
  );
  const guarded = useGuardedAction();

  const [genModule, setGenModule] = useState(null);

  const [saved, setSaved] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState("");
  const [savedPagination, setSavedPagination] = useState(null);

  const [savedSearch, setSavedSearch] = useState("");
  const [savedModule, setSavedModule] = useState("all");
  const [savedDateFrom, setSavedDateFrom] = useState("");
  const [savedDateTo, setSavedDateTo] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchSaved = useCallback(async (overrides = {}) => {
    setSavedLoading(true);
    setSavedError("");
    try {
      const params = {
        page: 1,
        limit: 10,
        search: savedSearch || undefined,
        module: savedModule !== "all" ? savedModule : undefined,
        dateFrom: savedDateFrom || undefined,
        dateTo: savedDateTo || undefined,
        ...overrides
      };
      const res = await getSavedReports(params);
      setSaved(Array.isArray(res?.data?.savedReports) ? res.data.savedReports : []);
      setSavedPagination(res?.data?.pagination || null);
    } catch (e) {
      setSavedError(e?.response?.data?.message || "Failed to load saved reports");
    } finally {
      setSavedLoading(false);
    }
  }, [savedSearch, savedModule, savedDateFrom, savedDateTo]);

  useEffect(() => {
    if (canRead) fetchSaved();
  }, [canRead]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSavedRef = useRef(fetchSaved);
  useEffect(() => {
    fetchSavedRef.current = fetchSaved;
  }, [fetchSaved]);

  const debouncedFetchSaved = useMemo(
    () => debounce((next) => fetchSavedRef.current({ search: next || undefined, page: 1 }), 400),
    []
  );

  useEffect(() => () => debouncedFetchSaved.cancel(), [debouncedFetchSaved]);

  const onSavedSearchChange = (value) => {
    setSavedSearch(value);
    debouncedFetchSaved(value);
  };

  const onSavedModuleChange = (value) => {
    setSavedModule(value);
    fetchSaved({ module: value !== "all" ? value : undefined, page: 1 });
  };

  const onSavedDateApply = (from, to) => {
    setSavedDateFrom(from);
    setSavedDateTo(to);
    fetchSaved({ dateFrom: from || undefined, dateTo: to || undefined, page: 1 });
  };

  const onSavedMobileApply = (pending) => {
    const value = pending?.module || "all";
    setSavedModule(value);
    fetchSaved({ module: value !== "all" ? value : undefined, page: 1 });
  };

  const getSavedLiveCount = useCallback(async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
    try {
      const res = await getSavedReports({
        page: 1,
        limit: 1,
        search: savedSearch || undefined,
        module: f?.module && f.module !== "all" ? f.module : undefined,
        dateFrom: dFrom || undefined,
        dateTo: dTo || undefined
      });
      return res?.data?.pagination?.totalResult ?? null;
    } catch {
      return null;
    }
  }, [savedSearch]);

  const openPreview = async (row) => {
    if (!row?._id) return;
    setPreviewLoadingId(row._id);
    try {
      const res = await getSavedReport(row._id);
      setPreviewDoc(res?.data?.savedReport || null);
    } catch (e) {
      showError(e?.response?.data?.message || "Failed to load report");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const downloadSaved = async (row, format) => {
    if (!row?._id) return;
    setDownloadingKey(`${row._id}:${format}`);
    try {
      const res = await downloadSavedReport(row._id, { format });
      saveBlob(res, `${row?.name || "report"}.${format === "excel" ? "xlsx" : format}`);
    } catch (e) {
      showError(e?.response?.data?.message || "Download failed");
    } finally {
      setDownloadingKey("");
    }
  };

  const shareSaved = async (row) => {
    if (!row?._id) {
      showError("Share unavailable for this report");
      return;
    }
    setDownloadingKey(`${row._id}:share`);
    try {
      const res = await downloadSavedReport(row._id, { format: "pdf" });
      const contentType = res?.headers?.["content-type"] || "application/pdf";
      const blob = new Blob([res.data], { type: contentType });
      const fileName = `${row?.name || "report"}.pdf`;
      const file = new File([blob], fileName, { type: contentType });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: row?.name || "Report",
            mimeType: contentType
          });
        } catch {
          // user cancelled the share sheet
        }
        return;
      }

      // Fallback: download the file so the user can share it manually
      saveBlob(res, fileName);
      showSuccess("Report downloaded — share the file from your device");
    } catch (e) {
      showError(e?.response?.data?.message || "Share failed");
    } finally {
      setDownloadingKey("");
    }
  };

  const removeSaved = async (row) => {
    if (!row?._id) return;
    setDeletingId(row._id);
    try {
      await deleteSavedReport(row._id);
      await fetchSaved({ page: savedPagination?.currentPage || 1 });
    } catch {
      // http interceptor already surfaces the error toast
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteSaved = async () => {
    const row = confirmDelete;
    setConfirmDelete(null);
    if (row) await removeSaved(row);
  };

  const onSavedPrev = () => {
    const prev = savedPagination?.prevPage;
    if (prev) fetchSaved({ page: prev });
  };

  const onSavedNext = () => {
    const next = savedPagination?.nextPage;
    if (next) fetchSaved({ page: next });
  };

  const moduleOf = (value) => MODULES.find((m) => m.value === value) || null;

  if (!canRead) {
    return (
      <div className="max-w-6xl">
        <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Reports</h2>
        <p className="mt-1 text-gray-500 text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Reports</h2>
          <p className="mt-1 text-gray-500 text-sm hidden md:block">Generate and export reports for your church data.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Report Modules</div>
            <div className="text-gray-500 text-xs">Pick a module to generate its report</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-4 py-3 md:px-6 md:py-4">
          {MODULES.map((m) => (
            <Card key={m.value}>
              <Card.Header
                icon={m.icon}
                iconBg={m.iconBg}
                iconColor={m.iconColor}
                title={m.label}
              />
              <Card.Body>{m.description}</Card.Body>
              <Card.Footer>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!canGenerate}
                    onClick={() => guarded(() => setGenModule(m))}
                    className="inline-flex items-center rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-xs"
                  >
                    Generate Report
                  </button>
                </div>
              </Card.Footer>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5 md:flex-row md:items-end md:justify-between md:px-6">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Saved Reports</div>
            <div className="text-gray-500 text-xs">Generated reports — preview, download or share anytime</div>
            {savedPagination?.totalResult ? (
              <div className="mt-1 inline-block text-xs text-gray-600 font-medium whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5">
                {savedPagination.totalResult} saved
              </div>
            ) : null}
          </div>
          <div className="md:flex md:items-end md:gap-3">
            <FilterBar
              searchValue={savedSearch}
              onSearchChange={onSavedSearchChange}
              searchPlaceholder="Search report name..."
              searchWidth="md:w-[280px]"
              selects={[
                {
                  key: "module",
                  value: savedModule,
                  onChange: onSavedModuleChange,
                  options: MODULE_FILTER_OPTIONS
                }
              ]}
              dateFrom={savedDateFrom}
              dateTo={savedDateTo}
              onDateApply={onSavedDateApply}
            />
            <MobileFilterBar
              searchValue={savedSearch}
              onSearchChange={onSavedSearchChange}
              searchPlaceholder="Search report name..."
              dateFrom={savedDateFrom}
              dateTo={savedDateTo}
              onDateApply={onSavedDateApply}
              filters={[
                {
                  key: "module",
                  label: "Module",
                  value: savedModule,
                  defaultValue: "all",
                  options: MODULE_FILTER_OPTIONS
                }
              ]}
              onApply={onSavedMobileApply}
              resultCount={savedPagination?.totalResult ?? null}
              getLiveCount={getSavedLiveCount}
            />
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="mt-2">
            {savedLoading ? (
              <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="h-4 w-28 rounded bg-gray-200" />
                      <div className="mt-1 h-3 w-20 rounded bg-gray-200" />
                    </div>
                    <div className="h-3 w-11 rounded bg-gray-200 md:w-12" />
                  </div>
                ))}
              </div>
            ) : savedError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{savedError}</div>
            ) : saved.length ? (
              <div className="divide-y divide-gray-200">
                {saved.map((row) => {
                  const mod = moduleOf(row?.module);
                  return (
                    <div key={row?._id} className="w-full px-2 py-2 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className={`h-9 w-9 rounded-lg ${mod?.iconBg || "bg-blue-50"} ${mod?.iconColor || "text-blue-600"} flex items-center justify-center shrink-0`}>
                          <FileIcon />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate text-xs">{row?.name || "Untitled Report"}</div>
                          {row?.description ? (
                            <div className="text-gray-500 truncate text-xs">{row.description}</div>
                          ) : null}
                          <div className="text-gray-500 text-xs">
                            {row?.moduleLabel || row?.module || "—"} · {formatDateTime(row?.createdAt)} · {Number(row?.rowCount || 0)} rows
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title="Preview"
                            disabled={previewLoadingId === row?._id}
                            onClick={() => openPreview(row)}
                            className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <EyeIcon />
                          </button>
                          {canExport ? (
                            <RowDownloadMenu
                              row={row}
                              downloading={
                                downloadingKey === `${row?._id}:pdf` ? "pdf"
                                  : downloadingKey === `${row?._id}:csv` ? "csv"
                                    : ""
                              }
                              onDownload={downloadSaved}
                            />
                          ) : null}
                          <button
                            type="button"
                            title="Share"
                            disabled={downloadingKey === `${row?._id}:share`}
                            onClick={() => shareSaved(row)}
                            className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {downloadingKey === `${row?._id}:share` ? "…" : <ShareIcon />}
                          </button>
                          {canGenerate ? (
                            <button
                              type="button"
                              title="Delete"
                              disabled={deletingId === row?._id}
                              onClick={() => guarded(() => setConfirmDelete(row))}
                              className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                            >
                              <TrashIcon />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                compact
                illustration="reports"
                title={savedSearch || savedModule !== "all" || savedDateFrom || savedDateTo ? "No saved reports found" : "No saved reports yet"}
                description={savedSearch || savedModule !== "all" || savedDateFrom || savedDateTo
                  ? "Try clearing your search or filters to see more reports."
                  : "Generate a report from any module card above and it will appear here."}
              />
            )}
            {savedPagination && saved.length ? (
              <div className="flex items-center justify-end gap-3 px-2 py-3">
                <button
                  type="button"
                  onClick={onSavedPrev}
                  disabled={!savedPagination.prevPage}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
                >
                  Prev
                </button>
                <div className="text-gray-600 text-sm">Page {savedPagination.currentPage || 1} of {savedPagination.totalPages}</div>
                <button
                  type="button"
                  onClick={onSavedNext}
                  disabled={!savedPagination.nextPage}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ReportGenerateModal
        open={Boolean(genModule)}
        module={genModule}
        canExport={canExport}
        onClose={() => setGenModule(null)}
        onSaved={() => fetchSaved({ page: 1 })}
      />

      {previewDoc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="shrink-0 border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{previewDoc?.name || "Report"}</div>
                {previewDoc?.description ? (
                  <div className="mt-0.5 text-gray-500 text-xs truncate">{previewDoc.description}</div>
                ) : null}
                <div className="mt-0.5 text-gray-500 text-xs">
                  {previewDoc?.moduleLabel || "—"} · {formatPeriod(previewDoc?.dateFrom, previewDoc?.dateTo)} · Generated {formatDateTime(previewDoc?.createdAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm shrink-0"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-5 lg:px-6 py-4">
              {Array.isArray(previewDoc?.rows) && previewDoc.rows.length ? (
                <div className="rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr className="text-left font-semibold text-gray-500 text-xs">
                        {(Array.isArray(previewDoc?.columns) ? previewDoc.columns : []).map((c) => (
                          <th key={c.key} className="px-4 py-2 whitespace-nowrap">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewDoc.rows.map((r, idx) => (
                        <tr key={idx} className="text-gray-700 text-xs">
                          {(Array.isArray(previewDoc?.columns) ? previewDoc.columns : []).map((c) => (
                            <td key={`${idx}-${c.key}`} className="px-4 py-2 whitespace-nowrap">
                              {String(r?.[c.key] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 p-4 text-gray-500 text-sm">This report has no rows.</div>
              )}
            </div>

            <div className="shrink-0 border-t border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex flex-wrap items-center justify-end gap-2">
              {canExport ? (
                <>
                  <button
                    type="button"
                    disabled={downloadingKey === `${previewDoc?._id}:pdf`}
                    onClick={() => downloadSaved(previewDoc, "pdf")}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                  >
                    {downloadingKey === `${previewDoc?._id}:pdf` ? "Downloading…" : "Download PDF"}
                  </button>
                  <button
                    type="button"
                    disabled={downloadingKey === `${previewDoc?._id}:csv`}
                    onClick={() => downloadSaved(previewDoc, "csv")}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                  >
                    {downloadingKey === `${previewDoc?._id}:csv` ? "Downloading…" : "Download CSV"}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                disabled={downloadingKey === `${previewDoc?._id}:share`}
                onClick={() => shareSaved(previewDoc)}
                className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
              >
                {downloadingKey === `${previewDoc?._id}:share` ? "Sharing…" : "Share"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-sm max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="shrink-0 border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Delete Saved Report</div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 md:px-5 lg:px-6 py-4 text-gray-700 text-sm">
              Are you sure you want to delete <span className="font-semibold">{confirmDelete?.name || "this report"}</span>? This action cannot be undone.
            </div>
            <div className="shrink-0 border-t border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === confirmDelete?._id}
                onClick={confirmDeleteSaved}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {deletingId === confirmDelete?._id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ReportsAnalyticsPage;
