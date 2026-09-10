import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../../permissions/permission.store.js";
import {
  getFollowUpsStats, getAllFollowUps, createFollowUp, updateFollowUp, deleteFollowUp,
  getAllProspects, getOutreachEvents,
} from "../../services/outreach.api.js";
import { getMembers } from "../../../member/services/member.api.js";
import EmptyState from "../../../../shared/components/EmptyState/index.jsx";
import TableKebabMenu from "../../../../shared/components/TableKebabMenu/index.jsx";
import FilterBar from "../../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../../shared/components/MobileFilterBar/index.jsx";

const INP = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500";
const SEL = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-white";
const LBL = "block text-xs font-semibold text-gray-500 mb-1";

function fmtDate(v) {
  if (!v) return "Not Specified";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  "no-response": "bg-gray-100 text-gray-600",
  rescheduled: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  "not-interested": "bg-red-100 text-red-700",
  "connected-to-church": "bg-emerald-100 text-emerald-700",
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || "bg-gray-100 text-gray-600";
  const label = status?.replace(/-/g, " ") || "Not Specified";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>{label}</span>;
}

// ── Follow-Up Form Modal ──────────────────────────────────────────
export function FollowUpFormModal({ open, mode, initialData, prospects, events, members, defaultValues, onClose, onSaved }) {
  const empty = {
    prospect: "", outreachEvent: "", scheduledDate: "", type: "call",
    status: "pending", assignedTo: "", notes: "", nextFollowUpDate: "",
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialData) {
      setForm({
        prospect: initialData.prospect?._id || initialData.prospect || "",
        outreachEvent: initialData.outreachEvent?._id || initialData.outreachEvent || "",
        scheduledDate: initialData.scheduledDate ? initialData.scheduledDate.slice(0, 10) : "",
        type: initialData.type || "call",
        status: initialData.status || "pending",
        assignedTo: initialData.assignedTo?._id || initialData.assignedTo || "",
        notes: initialData.notes || "",
        nextFollowUpDate: initialData.nextFollowUpDate ? initialData.nextFollowUpDate.slice(0, 10) : "",
      });
    } else { setForm({ ...empty, ...defaultValues }); }
    setError("");
  }, [open, mode, initialData]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.scheduledDate) { setError("Scheduled date is required."); return; }
    setSaving(true); setError("");
    const payload = { ...form };
    if (!payload.assignedTo) delete payload.assignedTo;
    if (!payload.outreachEvent) delete payload.outreachEvent;
    try {
      if (mode === "edit") {
        await updateFollowUp(initialData._id, payload);
      } else {
        if (!form.prospect) { setError("Please select a person."); setSaving(false); return; }
        await createFollowUp(form.prospect, payload);
      }
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">{mode === "edit" ? "Update Follow-Up" : "Schedule Follow-Up"}</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {mode === "create" ? (
            <>
              <div>
                <label className={LBL}>Person <span className="text-red-500">*</span></label>
                <select value={form.prospect} onChange={(e) => set("prospect", e.target.value)} className={SEL}>
                  <option value="">Select person…</option>
                  {prospects.map((p) => <option key={p._id} value={p._id}>{p.firstName} {p.lastName}{p.phone ? ` · ${p.phone}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL}>Outreach Event <span className="text-red-500">*</span></label>
                <select value={form.outreachEvent} onChange={(e) => set("outreachEvent", e.target.value)} className={SEL}>
                  <option value="">Select event…</option>
                  {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
                </select>
              </div>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Scheduled Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.scheduledDate} onChange={(e) => set("scheduledDate", e.target.value)} className={INP} />
            </div>
            <div>
              <label className={LBL}>Method</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={SEL}>
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="visit">Visit</option>
                <option value="email">Email</option>
                <option value="in-person">In-Person</option>
                <option value="church-visit">Church Visit</option>
                <option value="personal-meeting">Personal Meeting</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={SEL}>
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="no-response">No Response</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="completed">Completed</option>
                <option value="not-interested">Not Interested</option>
                <option value="connected-to-church">Connected to Church</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Next Follow-Up</label>
              <input type="date" value={form.nextFollowUpDate} onChange={(e) => set("nextFollowUpDate", e.target.value)} className={INP} />
            </div>
          </div>
          <div>
            <label className={LBL}>Notes / Outcome</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="What happened during this follow-up?" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div>
            <label className={LBL}>Assigned To</label>
            <select value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} className={SEL}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName}{m.phoneNumber ? ` · ${m.phoneNumber}` : ""}</option>)}
            </select>
          </div>
          {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 shrink-0">
          <button onClick={onClose} className="h-11 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="h-11 rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Saving…" : mode === "edit" ? "Update" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Follow-Up Details Modal ───────────────────────────────────────
export function FollowUpDetailsModal({ open, followUp, onClose }) {
  if (!open || !followUp) return null;

  const statusKey = followUp.status || followUp.outcome || "";
  const dateVal = followUp.scheduledDate || followUp.followUpDate;
  const prospectName = `${followUp.prospect?.firstName || ""} ${followUp.prospect?.lastName || ""}`.trim() || "Not Specified";

  const fields = [
    { label: "Prospect", value: prospectName },
    { label: "Phone", value: followUp.prospect?.phone || "Not Specified" },
    { label: "Scheduled Date", value: fmtDate(dateVal) },
    { label: "Method", value: TYPE_LABELS[followUp.type] || followUp.type || "Not Specified" },
    { label: "Status", value: null, badge: true },
    { label: "Assigned To", value: followUp.assignedTo ? `${followUp.assignedTo.firstName} ${followUp.assignedTo.lastName}` : "Not Specified" },
    { label: "Outreach Event", value: followUp.outreachEvent?.title || "Not Specified" },
    { label: "Next Follow-Up", value: followUp.nextFollowUpDate ? fmtDate(followUp.nextFollowUpDate) : "Not Specified" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">Follow-Up Details</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* Prospect header */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-sm">
              {(prospectName[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">{prospectName}</div>
              {followUp.prospect?.phone ? <div className="text-xs text-gray-400">{followUp.prospect.phone}</div> : null}
            </div>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{f.label}</div>
                <div className="mt-0.5 text-sm text-gray-800">
                  {f.badge ? <StatusBadge status={statusKey} /> : f.value}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {followUp.notes ? (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes / Outcome</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap rounded-lg bg-gray-50 border border-gray-100 p-3">{followUp.notes}</div>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 shrink-0">
          <button onClick={onClose} className="h-11 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Follow-Up Row ─────────────────────────────────────────────────
const TYPE_LABELS = {
  call: "Call", whatsapp: "WhatsApp", visit: "Visit", email: "Email", "in-person": "In-Person", text: "SMS", other: "Other",
};

function FollowUpRow({ fu, isOverdue, onEdit, onDelete, onView, canWrite, canDelete }) {
  return (
    <tr className={`max-md:text-xs text-gray-700 text-sm ${isOverdue ? "bg-red-50/40" : ""}`}>
      <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">
        <div className="font-semibold text-gray-900 text-sm truncate">
          {fu.prospect?.firstName} {fu.prospect?.lastName}
        </div>
      </td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDate(fu.scheduledDate)}</td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6"><StatusBadge status={fu.status} /></td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6 truncate max-w-[10rem]">
        {fu.assignedTo ? `${fu.assignedTo.firstName} ${fu.assignedTo.lastName}` : "Not Specified"}
      </td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6 truncate max-w-[14rem]">{fu.outreachEvent?.title || "Not Specified"}</td>
      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
        <TableKebabMenu items={[
          { label: "View", onClick: () => onView(fu) },
          canWrite && { label: "Edit", onClick: () => onEdit(fu) },
          canDelete && { label: "Delete", onClick: () => onDelete(fu), danger: true },
        ]} />
      </td>
    </tr>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────
export default function FollowUpsTab({ setHeaderAction }) {
  const { can } = useContext(PermissionContext) || {};
  const canCreate = typeof can === "function" ? can("outreach", "create") : false;
  const canWrite = typeof can === "function" ? can("outreach", "update") : false;
  const canDelete = typeof can === "function" ? can("outreach", "delete") : false;

  const [stats, setStats] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("today"); // "today" | "overdue" | "upcoming" | "all"
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [clientPage, setClientPage] = useState(1);

  const PAGE_SIZE = 10;

  const [prospects, setProspects] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingFU, setEditingFU] = useState(null);
  const [detailsFU, setDetailsFU] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadStats = useCallback(async () => {
    try { const r = await getFollowUpsStats(); setStats(r?.data?.data || null); } catch { setStats(null); }
  }, []);

  const fetchFollowUps = useCallback(async (page = 1, overrides = {}) => {
    setLoading(true);
    try {
      const params = { page, limit: 25, status: filterStatus || undefined, search: filterSearch || undefined, dateFrom: filterDateFrom || undefined, dateTo: filterDateTo || undefined, ...overrides };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await getAllFollowUps(params);
      setFollowUps(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, total: 0, pages: 1 });
    } catch { setFollowUps([]); } finally { setLoading(false); }
  }, [filterStatus, filterSearch, filterDateFrom, filterDateTo]);

  useEffect(() => {
    loadStats();
    fetchFollowUps();
    getAllProspects({ limit: 100 }).then((r) => setProspects(r.data?.data || [])).catch(() => {});
    getOutreachEvents({ limit: 100 }).then((r) => setEvents(r.data?.data || [])).catch(() => {});
    getMembers({ limit: 200, status: "active" }).then((r) => setMembers(r.data?.members || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!setHeaderAction) return;
    if (!canCreate) { setHeaderAction(null); return; }
    setHeaderAction(
      <button onClick={() => { setEditingFU(null); setFormMode("create"); setFormOpen(true); }} className="cck-allow-icons h-9 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        Schedule
      </button>
    );
    return () => setHeaderAction(null);
  }, [canCreate, setHeaderAction]);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const rawItems = (view === "overdue" ? stats?.overdueList : view === "today" ? stats?.todayList : view === "upcoming" ? stats?.upcomingList : followUps) || [];

  // Apply client-side search + date filtering for today/overdue/upcoming views
  // (for "all" view, filtering is done server-side via fetchFollowUps)
  const filteredStatsItems = useMemo(() => {
    if (view === "all") return rawItems;
    let list = rawItems;
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      list = list.filter((fu) => {
        const name = `${fu.prospect?.firstName || ""} ${fu.prospect?.lastName || ""}`.trim().toLowerCase();
        const assignedTo = `${fu.assignedTo?.firstName || ""} ${fu.assignedTo?.lastName || ""}`.trim().toLowerCase();
        return name.includes(q) || assignedTo.includes(q);
      });
    }
    if (filterStatus) {
      list = list.filter((fu) => fu.status === filterStatus);
    }
    if (filterDateFrom || filterDateTo) {
      list = list.filter((fu) => {
        const d = (fu.scheduledDate || fu.followUpDate || "").slice(0, 10);
        if (!d) return false;
        if (filterDateFrom && d < filterDateFrom) return false;
        if (filterDateTo && d > filterDateTo) return false;
        return true;
      });
    }
    return list;
  }, [view, rawItems, filterSearch, filterStatus, filterDateFrom, filterDateTo]);
  const overdueItems = filteredStatsItems;

  // Client-side pagination for today/overdue/upcoming views
  // (the "all" view is paginated server-side via fetchFollowUps)
  const clientTotalPages = Math.ceil(overdueItems.length / PAGE_SIZE);
  const paginatedItems = overdueItems.slice((clientPage - 1) * PAGE_SIZE, clientPage * PAGE_SIZE);
  const itemsToRender = view === "all" ? overdueItems : paginatedItems;

  const isOverdue = (fu) => {
    if (!fu.scheduledDate) return false;
    const d = fu.scheduledDate.slice(0, 10);
    return d < todayStr && !["completed", "not-interested", "connected-to-church"].includes(fu.status);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteFollowUp(deleteTarget._id); setDeleteTarget(null); loadStats(); fetchFollowUps(); }
    catch { } finally { setDeleting(false); }
  };

  const VIEW_TABS = [
    { key: "today", label: "Today", count: stats?.dueToday || 0, color: "text-amber-600" },
    { key: "overdue", label: "Overdue", count: stats?.overdue || 0, color: "text-red-600" },
    { key: "upcoming", label: "Next 7 Days", count: stats?.upcoming || 0, color: "text-blue-600" },
    { key: "all", label: "All", count: pagination.total, color: "text-gray-600" },
  ];

  return (
    <div className="mt-6">
      {/* Sub-view tabs — single row, no wrapping */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {VIEW_TABS.map((t) => (
          <button key={t.key} onClick={() => { setView(t.key); setClientPage(1); if (t.key === "all") fetchFollowUps(1); }} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors shrink-0 ${view === t.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {t.label}
            <span className={`text-xs font-bold ${view === t.key ? "text-white/80" : t.color}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-gray-900 text-sm">
                {view === "today" ? "Due Today" : view === "overdue" ? "Overdue Follow-Ups" : view === "upcoming" ? "Next 7 Days" : "All Follow-Ups"}
              </div>
              <div className="text-gray-500 text-xs">Track and manage follow-up contacts</div>
            </div>
          </div>
          <div className="hidden md:flex md:items-center md:gap-3">
            <FilterBar
              searchValue={filterSearch}
              onSearchChange={(v) => { setFilterSearch(v); setClientPage(1); fetchFollowUps(1, { search: v || undefined }); }}
              searchPlaceholder="Search prospect or assigned to…"
              selects={[
                {
                  key: "status",
                  value: filterStatus,
                  onChange: (v) => { setFilterStatus(v); setClientPage(1); fetchFollowUps(1, { status: v || undefined }); },
                  placeholder: "All Statuses",
                  options: [
                    { label: "Pending", value: "pending" },
                    { label: "Contacted", value: "contacted" },
                    { label: "No Response", value: "no-response" },
                    { label: "Rescheduled", value: "rescheduled" },
                    { label: "Completed", value: "completed" },
                    { label: "Not Interested", value: "not-interested" },
                    { label: "Connected to Church", value: "connected-to-church" },
                  ],
                },
              ]}
              dateFrom={filterDateFrom}
              dateTo={filterDateTo}
              onDateApply={(from, to) => { setFilterDateFrom(from); setFilterDateTo(to); setClientPage(1); fetchFollowUps(1, { dateFrom: from || undefined, dateTo: to || undefined }); }}
            />
          </div>
            <MobileFilterBar
              searchValue={filterSearch}
              onSearchChange={(v) => { setFilterSearch(v); setClientPage(1); fetchFollowUps(1, { search: v || undefined }); }}
              searchPlaceholder="Search prospect or assigned to…"
              dateFrom={filterDateFrom}
              dateTo={filterDateTo}
              onDateApply={(from, to) => { setFilterDateFrom(from); setFilterDateTo(to); setClientPage(1); fetchFollowUps(1, { dateFrom: from || undefined, dateTo: to || undefined }); }}
              filters={[
                {
                  key: "status",
                  label: "Status",
                  value: filterStatus,
                  defaultValue: "",
                  options: [
                    { label: "All Statuses", value: "" },
                    { label: "Pending", value: "pending" },
                    { label: "Contacted", value: "contacted" },
                    { label: "No Response", value: "no-response" },
                    { label: "Rescheduled", value: "rescheduled" },
                    { label: "Completed", value: "completed" },
                    { label: "Not Interested", value: "not-interested" },
                    { label: "Connected to Church", value: "connected-to-church" },
                  ],
                },
              ]}
              onApply={(pending) => {
                const v = pending.status || "";
                setFilterStatus(v);
                setClientPage(1);
                fetchFollowUps(1, { status: v || undefined });
              }}
            />
        </div>

        {loading && view === "all" ? (
          <div className="overflow-x-auto animate-pulse">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  {[0,1,2,3,4,5].map(i => <th key={i} className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[0,1,2,3].map(i => (
                  <tr key={i} className="text-sm">
                    <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-gray-200" /><div className="h-4 w-24 rounded bg-gray-200" /></div></td>
                    {[0,1,2,3,4].map(j => <td key={j} className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : overdueItems.length === 0 ? (
          <EmptyState
            compact
            illustration={filterSearch || filterStatus || filterDateFrom || filterDateTo ? "search" : "followUps"}
            title={filterSearch || filterStatus || filterDateFrom || filterDateTo
              ? "No follow-ups found"
              : view === "today" ? "No follow-ups today" : view === "overdue" ? "No overdue follow-ups" : view === "upcoming" ? "No upcoming follow-ups" : "No follow-ups yet"}
            description={filterSearch || filterStatus || filterDateFrom || filterDateTo
              ? "We couldn't find any follow-ups matching your filters."
              : view === "overdue" ? "You're all caught up." : "Schedule follow-ups to stay connected with prospects."}
            actionLabel={filterSearch || filterStatus || filterDateFrom || filterDateTo ? "Clear Filters" : null}
            onAction={filterSearch || filterStatus || filterDateFrom || filterDateTo
              ? () => { setFilterSearch(""); setFilterStatus(""); setFilterDateFrom(""); setFilterDateTo(""); }
              : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Prospect</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Scheduled</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Assigned To</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Outreach</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itemsToRender.map((fu) => (
                  <FollowUpRow
                    key={fu._id} fu={fu}
                    isOverdue={view === "overdue" || isOverdue(fu)}
                    onView={(x) => setDetailsFU(x)}
                    onEdit={(x) => { setEditingFU(x); setFormMode("edit"); setFormOpen(true); }}
                    onDelete={(x) => setDeleteTarget(x)}
                    canWrite={canWrite} canDelete={canDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "all" ? (
          <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3">
            <button disabled={pagination.page <= 1} onClick={() => fetchFollowUps(pagination.page - 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm">Prev</button>
            <div className="text-gray-600 text-sm">Page {pagination.page}</div>
            <button disabled={pagination.page >= pagination.pages} onClick={() => fetchFollowUps(pagination.page + 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm">Next</button>
          </div>
        ) : null}

        {view !== "all" ? (
          <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3">
            <button disabled={clientPage <= 1} onClick={() => setClientPage(p => p - 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm">Prev</button>
            <div className="text-gray-600 text-sm">Page {clientPage}</div>
            <button disabled={clientPage >= clientTotalPages} onClick={() => setClientPage(p => p + 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm">Next</button>
          </div>
        ) : null}
      </div>

      <FollowUpFormModal
        open={formOpen} mode={formMode} initialData={editingFU}
        prospects={prospects} events={events} members={members}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); loadStats(); fetchFollowUps(pagination.page); }}
      />

      <FollowUpDetailsModal
        open={!!detailsFU}
        followUp={detailsFU}
        onClose={() => setDetailsFU(null)}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Delete this follow-up?</div>
            <p className="text-xs text-gray-400 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 h-10 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
