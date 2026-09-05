import { useCallback, useContext, useEffect, useState } from "react";
import PermissionContext from "../../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../../shared/hooks/useDashboardNavigator.js";
import {
  getFollowUpsStats, getAllFollowUps, createFollowUp, updateFollowUp, deleteFollowUp,
  getAllProspects, getOutreachEvents,
} from "../../services/outreach.api.js";
import { getMembers } from "../../../member/services/member.api.js";
import EmptyState from "../../../../shared/components/EmptyState/index.jsx";

const INP = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500";
const SEL = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-white";
const LBL = "block text-xs font-semibold text-gray-500 mb-1";

function fmtDate(v) {
  if (!v) return "—";
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
  const label = status?.replace(/-/g, " ") || "—";
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

// ── Follow-Up Row ─────────────────────────────────────────────────
const TYPE_LABELS = {
  call: "Call", whatsapp: "WhatsApp", visit: "Visit", email: "Email", "in-person": "In-Person", text: "SMS", other: "Other",
};

function FollowUpRow({ fu, isOverdue, onEdit, onDelete, onView, canWrite, canDelete }) {
  return (
    <tr className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${isOverdue ? "bg-red-50/40 hover:bg-red-50" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${isOverdue ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-700"}`}>
            {fu.type === "call" ? "📞" : fu.type === "whatsapp" ? "💬" : fu.type === "visit" ? "🚶" : fu.type === "email" ? "✉" : "📋"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm truncate">
                {fu.prospect?.firstName} {fu.prospect?.lastName}
              </span>
              {isOverdue ? <span className="rounded-full bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5">Overdue</span> : null}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">{TYPE_LABELS[fu.type] || fu.type}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell whitespace-nowrap">{fmtDate(fu.scheduledDate)}</td>
      <td className="px-4 py-3"><StatusBadge status={fu.status} /></td>
      <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell truncate max-w-[10rem]">
        {fu.assignedTo ? `${fu.assignedTo.firstName} ${fu.assignedTo.lastName}` : "—"}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell truncate max-w-[14rem]">{fu.outreachEvent?.title || "—"}</td>
      <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell max-w-[16rem] truncate">{fu.notes || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => onView(fu)} className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap">View</button>
          {canWrite ? (
            <button onClick={() => onEdit(fu)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          ) : null}
          {canDelete ? (
            <button onClick={() => onDelete(fu)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────
export default function FollowUpsTab() {
  const { can } = useContext(PermissionContext) || {};
  const canCreate = typeof can === "function" ? can("outreach", "create") : false;
  const canWrite = typeof can === "function" ? can("outreach", "update") : false;
  const canDelete = typeof can === "function" ? can("outreach", "delete") : false;
  const { toPage } = useDashboardNavigator();

  const [stats, setStats] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("overdue"); // "overdue" | "today" | "upcoming" | "all"
  const [filterStatus, setFilterStatus] = useState("");

  const [prospects, setProspects] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingFU, setEditingFU] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadStats = useCallback(async () => {
    try { const r = await getFollowUpsStats(); setStats(r?.data?.data || null); } catch { setStats(null); }
  }, []);

  const fetchFollowUps = useCallback(async (page = 1, overrides = {}) => {
    setLoading(true);
    try {
      const params = { page, limit: 25, status: filterStatus || undefined, ...overrides };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await getAllFollowUps(params);
      setFollowUps(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, total: 0, pages: 1 });
    } catch { setFollowUps([]); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => {
    loadStats();
    fetchFollowUps();
    getAllProspects({ limit: 100 }).then((r) => setProspects(r.data?.data || [])).catch(() => {});
    getOutreachEvents({ limit: 100 }).then((r) => setEvents(r.data?.data || [])).catch(() => {});
    getMembers({ limit: 200, status: "active" }).then((r) => setMembers(r.data?.members || [])).catch(() => {});
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const overdueItems = (view === "overdue" ? stats?.overdueList : view === "today" ? stats?.todayList : view === "upcoming" ? stats?.upcomingList : followUps) || [];

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
    { key: "overdue", label: "Overdue", count: stats?.overdue || 0, color: "text-red-600" },
    { key: "today", label: "Today", count: stats?.dueToday || 0, color: "text-amber-600" },
    { key: "upcoming", label: "Next 7 Days", count: stats?.upcoming || 0, color: "text-blue-600" },
    { key: "all", label: "All", count: pagination.total, color: "text-gray-600" },
  ];

  return (
    <div className="mt-6">
      {/* Sub-view tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {VIEW_TABS.map((t) => (
          <button key={t.key} onClick={() => { setView(t.key); if (t.key === "all") fetchFollowUps(1); }} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${view === t.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {t.label}
            <span className={`text-xs font-bold ${view === t.key ? "text-white/80" : t.color}`}>{t.count}</span>
          </button>
        ))}
        {canCreate ? (
          <button onClick={() => { setEditingFU(null); setFormMode("create"); setFormOpen(true); }} className="ml-auto h-9 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Schedule
          </button>
        ) : null}
      </div>

      {/* Filter bar — show for "all" view */}
      {view === "all" ? (
        <div className="flex gap-2 mb-3">
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); fetchFollowUps(1, { status: e.target.value || undefined }); }} className="h-9 rounded-lg border border-gray-200 px-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 bg-white">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="no-response">No Response</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="completed">Completed</option>
            <option value="not-interested">Not Interested</option>
            <option value="connected-to-church">Connected to Church</option>
          </select>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {view === "overdue" ? "Overdue Follow-Ups" : view === "today" ? "Due Today" : view === "upcoming" ? "Next 7 Days" : "All Follow-Ups"}
          </span>
          {view === "all" ? <span className="text-xs text-gray-400">{pagination.total} total</span> : null}
        </div>

        {loading && view === "all" ? (
          <div className="p-4 space-y-3">
            {[0,1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : overdueItems.length === 0 ? (
          <EmptyState
            compact
            illustration="followUps"
            title={view === "overdue" ? "No overdue follow-ups" : view === "today" ? "No follow-ups today" : "No upcoming follow-ups"}
            description={view === "overdue" ? "You're all caught up." : "Schedule follow-ups to stay connected with prospects."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Prospect</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Scheduled</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Assigned To</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Outreach</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {overdueItems.map((fu) => (
                  <FollowUpRow
                    key={fu._id} fu={fu}
                    isOverdue={view === "overdue" || isOverdue(fu)}
                    onView={(x) => toPage("prospect-details", { id: x.prospect?._id, from: "followups" })}
                    onEdit={(x) => { setEditingFU(x); setFormMode("edit"); setFormOpen(true); }}
                    onDelete={(x) => setDeleteTarget(x)}
                    canWrite={canWrite} canDelete={canDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "all" && pagination.pages > 1 ? (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
            <button disabled={pagination.page <= 1} onClick={() => fetchFollowUps(pagination.page - 1)} className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-700 disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <span className="text-xs text-gray-400">Page {pagination.page} of {pagination.pages}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => fetchFollowUps(pagination.page + 1)} className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-700 disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        ) : null}
      </div>

      <FollowUpFormModal
        open={formOpen} mode={formMode} initialData={editingFU}
        prospects={prospects} events={events} members={members}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); loadStats(); fetchFollowUps(pagination.page); }}
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
