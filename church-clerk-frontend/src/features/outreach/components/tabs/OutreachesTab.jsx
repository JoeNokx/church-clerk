import { useCallback, useContext, useEffect, useState } from "react";
import PermissionContext from "../../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../../shared/hooks/useDashboardNavigator.js";
import {
  getOutreachEvents, createOutreachEvent, updateOutreachEvent, deleteOutreachEvent,
  getOutreachTeams,
} from "../../services/outreach.api.js";
import { getMembers } from "../../../member/services/member.api.js";

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const TYPE_LABELS = {
  "street-evangelism": "Street Evangelism",
  "house-to-house": "House-to-House",
  "community-outreach": "Community Outreach",
  "school-outreach": "School Outreach",
  "hospital-outreach": "Hospital Outreach",
  "prison-outreach": "Prison Outreach",
  "market-outreach": "Market Outreach",
  "campus-outreach": "Campus Outreach",
  crusade: "Crusade",
  "personal-evangelism": "Personal Evangelism",
  online: "Online",
  "special-campaign": "Special Campaign",
  other: "Other",
};

const STATUS_STYLES = {
  planned: "bg-blue-100 text-blue-700", ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

const INP = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500";
const SEL = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-white";
const LBL = "block text-xs font-semibold text-gray-500 mb-1";

// ── Chip Multi-Select ───────────────────────────────────────────────
function ChipSelect({ label, placeholder, options, selected, onAdd, onRemove, getLabel }) {
  const available = options.filter((o) => !selected.includes(o._id));
  return (
    <div>
      <label className={LBL}>{label}</label>
      <select
        value=""
        onChange={(e) => { if (e.target.value) onAdd(e.target.value); }}
        className={SEL}
      >
        <option value="">{placeholder}</option>
        {available.map((o) => <option key={o._id} value={o._id}>{getLabel(o)}</option>)}
      </select>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {selected.map((id) => {
            const o = options.find((x) => x._id === id);
            return o ? (
              <span key={id} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700">
                {getLabel(o)}
                <button type="button" onClick={() => onRemove(id)} className="ml-0.5 text-indigo-400 hover:text-indigo-700 font-bold">×</button>
              </span>
            ) : null;
          })}
        </div>
      ) : null}
    </div>
  );
}

// ── Event Form Modal ──────────────────────────────────────────────
function EventFormModal({ open, mode, initialData, members, teams, onClose, onSaved }) {
  const empty = {
    title: "", date: "", endDate: "", startTime: "", endTime: "",
    location: "", area: "", type: "street-evangelism", description: "",
    objective: "", targetCount: "", notes: "", status: "planned",
    coordinator: [], teams: [],
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialData) {
      setForm({
        title: initialData.title || "",
        date: initialData.date ? initialData.date.slice(0, 10) : "",
        endDate: initialData.endDate ? initialData.endDate.slice(0, 10) : "",
        startTime: initialData.startTime || "",
        endTime: initialData.endTime || "",
        location: initialData.location || "",
        area: initialData.area || "",
        type: initialData.type || "street-evangelism",
        description: initialData.description || "",
        objective: initialData.objective || "",
        targetCount: initialData.targetCount ?? "",
        notes: initialData.notes || "",
        status: initialData.status || "planned",
        coordinator: Array.isArray(initialData.coordinator)
          ? initialData.coordinator.map((c) => (typeof c === "object" ? c._id : c)).filter(Boolean)
          : [],
        teams: Array.isArray(initialData.teams)
          ? initialData.teams.map((t) => (typeof t === "object" ? t._id : t)).filter(Boolean)
          : [],
      });
    } else { setForm(empty); }
    setError("");
  }, [open, mode, initialData]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) { setError("Title and date are required."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (payload.targetCount === "") delete payload.targetCount;
      if (mode === "edit") await updateOutreachEvent(initialData._id, payload);
      else await createOutreachEvent(payload);
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">{mode === "edit" ? "Edit Outreach Event" : "New Outreach Event"}</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={LBL}>Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Community Evangelism Drive" className={INP} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={INP} />
            </div>
            <div>
              <label className={LBL}>End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={INP} />
            </div>
            <div>
              <label className={LBL}>End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Type</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={SEL}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={SEL}>
                <option value="planned">Planned</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Location</label>
              <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Venue / address" className={INP} />
            </div>
            <div>
              <label className={LBL}>Community / Area</label>
              <input value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="Neighborhood" className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Target People Count</label>
              <input type="number" min="0" value={form.targetCount} onChange={(e) => set("targetCount", e.target.value)} placeholder="e.g. 100" className={INP} />
            </div>
          </div>
          <ChipSelect
            label="Coordinator(s)"
            placeholder="Add coordinator…"
            options={members}
            selected={form.coordinator}
            getLabel={(m) => `${m.firstName} ${m.lastName}`}
            onAdd={(id) => set("coordinator", [...form.coordinator, id])}
            onRemove={(id) => set("coordinator", form.coordinator.filter((x) => x !== id))}
          />
          <ChipSelect
            label="Outreach Team(s)"
            placeholder="Add team…"
            options={teams}
            selected={form.teams}
            getLabel={(t) => t.name}
            onAdd={(id) => set("teams", [...form.teams, id])}
            onRemove={(id) => set("teams", form.teams.filter((x) => x !== id))}
          />
          <div>
            <label className={LBL}>Objective</label>
            <textarea value={form.objective} onChange={(e) => set("objective", e.target.value)} rows={2} placeholder="What do you aim to achieve?" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div>
            <label className={LBL}>Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Brief description of the outreach" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div>
            <label className={LBL}>Internal Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notes for the team" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 shrink-0">
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="h-11 rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────
function DeleteModal({ open, eventTitle, onCancel, onConfirm, deleting }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="font-semibold text-gray-900 text-sm">Delete Outreach Event</div>
        </div>
        <p className="text-sm text-gray-600 mb-1">Delete <strong>"{eventTitle}"</strong>?</p>
        <p className="text-xs text-gray-400 mb-6">All prospects and follow-ups will also be deleted. This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 h-10 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────
function EventCard({ event, onEdit, onDelete, onView, canWrite, canDelete }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[event.status] || "bg-gray-100 text-gray-600"}`}>{event.status}</span>
            <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-600 capitalize">{TYPE_LABELS[event.type] || event.type}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{event.title}</h3>
          {event.referenceId ? <div className="text-[11px] text-gray-400 mt-0.5">{event.referenceId}</div> : null}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canWrite ? (
            <button onClick={() => onEdit(event)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          ) : null}
          {canDelete ? (
            <button onClick={() => onDelete(event)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : null}
        </div>
      </div>
      <div className="space-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-gray-400"><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <span>{fmtDate(event.date)}{event.startTime ? " · " + event.startTime : ""}</span>
        </div>
        {event.location || event.area ? (
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-gray-400"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" /></svg>
            <span className="truncate">{event.location || event.area}</span>
          </div>
        ) : null}
        {event.targetCount ? (
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-gray-400"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" /></svg>
            <span>Target: {event.targetCount} people</span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-5 w-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">{event.prospectCount || 0}</span>
          <span className="text-gray-500">people</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-5 w-5 rounded-md bg-green-50 text-green-600 flex items-center justify-center text-[10px] font-bold">{event.decisionCount || 0}</span>
          <span className="text-gray-500">decisions</span>
        </div>
        <button onClick={() => onView(event)} className="ml-auto text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1">
          Details
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────
export default function OutreachesTab() {
  const { can } = useContext(PermissionContext) || {};
  const canCreate = typeof can === "function" ? can("outreach", "create") : false;
  const canUpdate = typeof can === "function" ? can("outreach", "update") : false;
  const canDelete = typeof can === "function" ? can("outreach", "delete") : false;
  const { toPage } = useDashboardNavigator();

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", status: "", type: "" });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);

  const fetchEvents = useCallback(async (page = 1, overrides = {}) => {
    setLoading(true);
    try {
      const params = { page, limit: 12, ...filters, ...overrides };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await getOutreachEvents(params);
      setEvents(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, total: 0, pages: 1 });
    } catch { setEvents([]); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => {
    fetchEvents();
    getMembers({ limit: 200, status: "active" }).then((r) => setMembers(r.data?.members || [])).catch(() => {});
    getOutreachTeams().then((r) => setTeams(r.data?.data || [])).catch(() => {});
  }, []);

  const handleFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    const p = { ...next }; Object.keys(p).forEach((k) => { if (!p[k]) delete p[k]; });
    fetchEvents(1, p);
  };

  const handleSaved = () => { setFormOpen(false); fetchEvents(pagination.page); };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteOutreachEvent(deleteTarget._id); setDeleteTarget(null); fetchEvents(1); }
    catch { } finally { setDeleting(false); }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2 flex-1">
          <input value={filters.search} onChange={(e) => handleFilter("search", e.target.value)} placeholder="Search events…" className="h-9 flex-1 min-w-44 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:border-blue-500" />
          <select value={filters.status} onChange={(e) => handleFilter("status", e.target.value)} className="h-9 rounded-lg border border-gray-200 px-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 bg-white">
            <option value="">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={filters.type} onChange={(e) => handleFilter("type", e.target.value)} className="h-9 rounded-lg border border-gray-200 px-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 bg-white">
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {canCreate ? (
          <button onClick={() => { setEditingEvent(null); setFormMode("create"); setFormOpen(true); }} className="h-9 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            New Event
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2,3,4,5].map(i => <div key={i} className="h-52 rounded-2xl border border-gray-200 bg-gray-100 animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-20 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </div>
          <div className="font-semibold text-gray-900 text-sm">No outreach events</div>
          <div className="mt-1 text-xs text-gray-400">Plan your first outreach event</div>
          {canCreate ? (
            <button onClick={() => { setEditingEvent(null); setFormMode("create"); setFormOpen(true); }} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              New Event
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                onEdit={(e) => { setEditingEvent(e); setFormMode("edit"); setFormOpen(true); }}
                onDelete={(e) => setDeleteTarget(e)}
                onView={(e) => toPage("outreach-event-details", { id: e._id })}
                canWrite={canUpdate}
                canDelete={canDelete}
              />
            ))}
          </div>
          {pagination.pages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchEvents(pagination.page - 1)} className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-700 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages}</span>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchEvents(pagination.page + 1)} className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-700 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          ) : null}
        </>
      )}

      <EventFormModal open={formOpen} mode={formMode} initialData={editingEvent} members={members} teams={teams} onClose={() => setFormOpen(false)} onSaved={handleSaved} />
      <DeleteModal open={!!deleteTarget} eventTitle={deleteTarget?.title || ""} onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} deleting={deleting} />
    </div>
  );
}
