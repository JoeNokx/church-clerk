import { useCallback, useEffect, useState } from "react";
import {
  getPastoralAppointments,
  getPastoralAppointmentStats,
  createPastoralAppointment,
  updatePastoralAppointment,
  deletePastoralAppointment,
  getCareCases,
} from "../services/memberCare.api.js";
import { MemberSelect, MemberMultiSelect } from "./MemberSelect.jsx";
import { assigneeNames } from "../../../shared/utils/followUps.js";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_CATEGORIES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_LOCATIONS,
  labelFor,
  formatDate,
  memberName,
} from "../constants.js";

const INP = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500";
const SEL = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-white";
const LBL = "block text-xs font-semibold text-gray-500 mb-1";

const STATUS_STYLES = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  "no-show": "bg-red-100 text-red-700",
  rescheduled: "bg-purple-100 text-purple-700",
};

const ACTIVE_STATUSES = ["scheduled", "confirmed", "rescheduled"];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m || 0), 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function personName(appt) {
  return memberName(appt?.member) !== "—" ? memberName(appt?.member) : appt?.attendeeName || "Not Specified";
}

function PersonTag({ appt }) {
  return appt?.member ? (
    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Member</span>
  ) : (
    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">External</span>
  );
}

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {labelFor(APPOINTMENT_STATUSES, status)}
    </span>
  );
}

// ── Appointment Form Modal ─────────────────────────────────────────
function AppointmentFormModal({ open, mode, initialData, onClose, onSaved }) {
  const empty = {
    type: "counseling-session",
    category: "general",
    appointmentDate: "",
    startTime: "",
    durationMinutes: 60,
    location: "church-office",
    locationDetails: "",
    status: "scheduled",
    confidential: false,
    notes: "",
    outcomeNotes: "",
    linkedCase: "",
  };
  const [form, setForm] = useState(empty);
  const [personType, setPersonType] = useState("member"); // "member" | "external"
  const [member, setMember] = useState(null);
  const [attendeeName, setAttendeeName] = useState("");
  const [assignedTo, setAssignedTo] = useState([]);
  const [openCases, setOpenCases] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setMember(null);
    setAttendeeName("");
    setAssignedTo([]);
    setError("");
    if (mode === "edit" && initialData) {
      setPersonType(initialData.member ? "member" : "external");
      setMember(initialData.member || null);
      setAttendeeName(initialData.attendeeName || "");
      setAssignedTo(Array.isArray(initialData.assignedTo) ? initialData.assignedTo : []);
      setForm({
        type: initialData.type || "counseling-session",
        category: initialData.category || "general",
        appointmentDate: initialData.appointmentDate ? initialData.appointmentDate.slice(0, 10) : "",
        startTime: initialData.startTime || "",
        durationMinutes: initialData.durationMinutes || 60,
        location: initialData.location || "church-office",
        locationDetails: initialData.locationDetails || "",
        status: initialData.status || "scheduled",
        confidential: !!initialData.confidential,
        notes: initialData.notes || "",
        outcomeNotes: initialData.outcomeNotes || "",
        linkedCase: initialData.linkedCase?._id || initialData.linkedCase || "",
      });
    } else {
      setPersonType("member");
      setForm(empty);
    }
    getCareCases({ status: "open", limit: 100 })
      .then((r) => setOpenCases(r?.data?.careCases || r?.data?.data?.careCases || []))
      .catch(() => setOpenCases([]));
  }, [open, mode, initialData]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.appointmentDate) { setError("Please pick a date."); return; }
    if (personType === "member" && !member?._id) { setError("Please select a member."); return; }
    if (personType === "external" && !attendeeName.trim()) { setError("Please enter the person's name."); return; }
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      memberId: personType === "member" ? member?._id : null,
      attendeeName: personType === "external" ? attendeeName.trim() : "",
      assignedTo: assignedTo.map((m) => m._id),
      durationMinutes: Number(form.durationMinutes) || 60,
      linkedCase: form.linkedCase || null,
      locationDetails: form.locationDetails || undefined,
      notes: form.notes || undefined,
      outcomeNotes: form.outcomeNotes || undefined,
      startTime: form.startTime || undefined,
    };
    try {
      if (mode === "edit") await updatePastoralAppointment(initialData._id, payload);
      else await createPastoralAppointment(payload);
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">{mode === "edit" ? "Update Appointment" : "Schedule Appointment"}</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={LBL}>Who is this for?</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { key: "member", label: "Member" },
                { key: "external", label: "External Person" },
              ].map((o) => (
                <label key={o.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${personType === o.key ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="apptPersonType" checked={personType === o.key} onChange={() => setPersonType(o.key)} className="h-3.5 w-3.5 accent-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          {personType === "member" ? (
            <div>
              <label className={LBL}>Member</label>
              <MemberSelect value={member} onSelect={setMember} onClear={() => setMember(null)} placeholder="Search member…" />
            </div>
          ) : (
            <div>
              <label className={LBL}>Name</label>
              <input className={INP} value={attendeeName} onChange={(e) => setAttendeeName(e.target.value)} placeholder="Full name of the person" />
            </div>
          )}

          <div>
            <label className={LBL}>Type</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {APPOINTMENT_TYPES.map((o) => (
                <label key={o.value} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${form.type === o.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="apptType" checked={form.type === o.value} onChange={() => set("type", o.value)} className="h-3.5 w-3.5 accent-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Category</label>
              <select className={SEL} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {APPOINTMENT_CATEGORIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL}>Linked Care Case (optional)</label>
              <select className={SEL} value={form.linkedCase} onChange={(e) => set("linkedCase", e.target.value)}>
                <option value="">None</option>
                {openCases.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL}>Date</label>
              <input type="date" className={INP} value={form.appointmentDate} onChange={(e) => set("appointmentDate", e.target.value)} />
            </div>
            <div>
              <label className={LBL}>Start Time</label>
              <input type="time" className={INP} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </div>
            <div>
              <label className={LBL}>Duration (minutes)</label>
              <input type="number" min={5} step={5} className={INP} value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />
            </div>
            <div>
              <label className={LBL}>Location</label>
              <select className={SEL} value={form.location} onChange={(e) => set("location", e.target.value)}>
                {APPOINTMENT_LOCATIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={LBL}>Location Details (optional)</label>
            <input className={INP} value={form.locationDetails} onChange={(e) => set("locationDetails", e.target.value)} placeholder="e.g. Room 2, Zoom link, address…" />
          </div>

          <div>
            <label className={LBL}>Pastor / Counselor</label>
            <MemberMultiSelect values={assignedTo} onChange={setAssignedTo} placeholder="Search members to assign…" />
          </div>

          {mode === "edit" ? (
            <div>
              <label className={LBL}>Status</label>
              <select className={SEL} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {APPOINTMENT_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ) : null}

          <div>
            <label className={LBL}>Notes</label>
            <textarea className={`${INP} h-auto py-2`} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Purpose, preparation notes…" />
          </div>

          {mode === "edit" && form.status === "completed" ? (
            <div>
              <label className={LBL}>Outcome Notes</label>
              <textarea className={`${INP} h-auto py-2`} rows={3} value={form.outcomeNotes} onChange={(e) => set("outcomeNotes", e.target.value)} placeholder="Session outcome, next steps…" />
            </div>
          ) : null}

          <label className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={form.confidential} onChange={(e) => set("confidential", e.target.checked)} className="h-4 w-4 accent-blue-600" />
            <span className="text-sm font-medium text-gray-700">Confidential — visible to church administrators only</span>
          </label>

          {error ? <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 shrink-0">
          <button onClick={onClose} className="h-11 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Appointment Details Modal ──────────────────────────────────────
function AppointmentDetailsModal({ open, appointment, onClose }) {
  if (!open || !appointment) return null;

  const name = personName(appointment);
  const when = formatDate(appointment.appointmentDate);
  const time = fmtTime(appointment.startTime);

  const fields = [
    { label: "Type", value: labelFor(APPOINTMENT_TYPES, appointment.type) },
    { label: "Category", value: labelFor(APPOINTMENT_CATEGORIES, appointment.category) },
    { label: "Date", value: when },
    { label: "Time", value: time ? `${time}${appointment.durationMinutes ? ` • ${appointment.durationMinutes} min` : ""}` : appointment.durationMinutes ? `${appointment.durationMinutes} min` : "Not Specified" },
    { label: "Location", value: `${labelFor(APPOINTMENT_LOCATIONS, appointment.location)}${appointment.locationDetails ? ` — ${appointment.locationDetails}` : ""}` },
    { label: "Status", value: null, badge: true },
    { label: "Pastor / Counselor", value: assigneeNames(appointment) || "Not Specified" },
    { label: "Linked Care Case", value: appointment.linkedCase?.title || "None" },
    { label: "Reference", value: appointment.referenceId || "Not Specified" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">Appointment Details</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-sm">
              {(name[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">
                {name}
                <span className="ml-1.5 align-middle"><PersonTag appt={appointment} /></span>
              </div>
              {appointment.member?.phoneNumber ? <div className="text-xs text-gray-400">{appointment.member.phoneNumber}</div> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{f.label}</div>
                <div className="mt-0.5 text-sm text-gray-800">
                  {f.badge ? <StatusBadge status={appointment.status} /> : f.value}
                </div>
              </div>
            ))}
          </div>

          {appointment.confidential ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Confidential — visible to church administrators only
            </div>
          ) : null}

          {appointment.notes ? (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap rounded-lg bg-gray-50 border border-gray-100 p-3">{appointment.notes}</div>
            </div>
          ) : null}

          {appointment.outcomeNotes ? (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Outcome</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap rounded-lg bg-gray-50 border border-gray-100 p-3">{appointment.outcomeNotes}</div>
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

// ── Appointment Row ────────────────────────────────────────────────
function AppointmentRow({ appt, onEdit, onDelete, onView, onStatusRequest }) {
  const guarded = useGuardedAction();
  const name = personName(appt);
  const active = ACTIVE_STATUSES.includes(appt.status);

  const items = [
    { label: "View Details", onClick: () => onView(appt) },
    { label: "Edit", onClick: () => guarded(() => onEdit(appt), "memberCare", "update") },
    active && { label: "Mark Completed", onClick: () => guarded(() => onStatusRequest(appt, "completed"), "memberCare", "update") },
    appt.status === "scheduled" && { label: "Mark Confirmed", onClick: () => guarded(() => onStatusRequest(appt, "confirmed"), "memberCare", "update") },
    active && { label: "Mark No-Show", onClick: () => guarded(() => onStatusRequest(appt, "no-show"), "memberCare", "update") },
    active && { label: "Cancel Appointment", onClick: () => guarded(() => onStatusRequest(appt, "cancelled"), "memberCare", "update"), danger: true },
    { label: "Delete", onClick: () => guarded(() => onDelete(appt), "memberCare", "delete"), danger: true },
  ].filter(Boolean);

  return (
    <tr className="text-sm hover:bg-gray-50/60">
      <td className="sticky left-0 z-10 bg-white max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">
        <div className="font-semibold text-gray-900">
          <span className="md:hidden">{truncateMobileName(name)}</span>
          <span className="hidden md:inline">{truncateDesktopName(name)}</span>
          <span className="ml-1.5 align-middle"><PersonTag appt={appt} /></span>
        </div>
        {appt.referenceId ? <div className="text-xs text-gray-400">{appt.referenceId}</div> : null}
      </td>
      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">
        <div className="font-medium text-gray-800">{labelFor(APPOINTMENT_TYPES, appt.type)}</div>
        <div className="text-xs text-gray-400">{labelFor(APPOINTMENT_CATEGORIES, appt.category)}</div>
      </td>
      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">
        <div className="font-medium text-gray-800">{formatDate(appt.appointmentDate) || "Not Specified"}</div>
        <div className="text-xs text-gray-400">
          {fmtTime(appt.startTime)}{appt.durationMinutes ? ` • ${appt.durationMinutes} min` : ""}
        </div>
      </td>
      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">
        <div className="text-gray-700">{labelFor(APPOINTMENT_LOCATIONS, appt.location)}</div>
        {appt.locationDetails ? <div className="text-xs text-gray-400 max-w-[160px] truncate">{appt.locationDetails}</div> : null}
      </td>
      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6 text-gray-700">{assigneeNames(appt) || "Not Specified"}</td>
      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><StatusBadge status={appt.status} /></td>
      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><TableKebabMenu items={items} /></td>
    </tr>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────
export default function PastoralCareTab({ setHeaderAction }) {
  const guarded = useGuardedAction();

  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("upcoming"); // "upcoming" | "today" | "all"
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editing, setEditing] = useState(null);
  const [details, setDetails] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { appt, status, title, message, confirmLabel, danger }
  const [confirming, setConfirming] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const r = await getPastoralAppointmentStats();
      setStats(r?.data?.stats || r?.data?.data || null);
    } catch { setStats(null); }
  }, []);

  const viewParams = (v) => {
    if (v === "upcoming") return { upcoming: true };
    if (v === "today") return { dateFrom: todayISO(), dateTo: todayISO() };
    return {};
  };

  const fetchAppointments = useCallback(async (page = 1, overrides = {}, v = view) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        status: filterStatus || undefined,
        type: filterType || undefined,
        search: filterSearch || undefined,
        dateFrom: filterDateFrom && v !== "today" ? filterDateFrom : undefined,
        dateTo: filterDateTo && v !== "today" ? filterDateTo : undefined,
        ...viewParams(v),
        ...overrides,
      };
      Object.keys(params).forEach((k) => { if (params[k] === undefined || params[k] === "") delete params[k]; });
      const res = await getPastoralAppointments(params);
      const payload = res?.data;
      setAppointments(payload?.appointments || payload?.data || []);
      const p = payload?.pagination || {};
      setPagination({ page: p.currentPage || p.page || 1, total: p.totalResult || p.total || 0, pages: p.totalPages || p.pages || 1 });
    } catch { setAppointments([]); } finally { setLoading(false); }
  }, [filterStatus, filterType, filterSearch, filterDateFrom, filterDateTo, view, limit]);

  useEffect(() => {
    loadStats();
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (!setHeaderAction) return;
    setHeaderAction(
      <button onClick={() => guarded(() => { setEditing(null); setFormMode("create"); setFormOpen(true); }, "memberCare", "create")} className="cck-allow-icons h-9 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        Schedule
      </button>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction]);

  const switchView = (v) => {
    setView(v);
    fetchAppointments(1, {}, v);
  };

  const STATUS_CONFIRM = {
    completed: { title: "Mark as completed?", message: "will be recorded as completed.", confirmLabel: "Mark Completed", danger: false },
    confirmed: { title: "Confirm this appointment?", message: "will be marked as confirmed.", confirmLabel: "Confirm", danger: false },
    "no-show": { title: "Mark as no-show?", message: "will be recorded as not attended.", confirmLabel: "Mark No-Show", danger: true },
    cancelled: { title: "Cancel this appointment?", message: "will be cancelled. This can be changed later by editing the appointment.", confirmLabel: "Cancel Appointment", danger: true },
  };

  const handleStatusRequest = (appt, status) => {
    const meta = STATUS_CONFIRM[status];
    if (!meta) return;
    setConfirmAction({ appt, status, ...meta });
  };

  const handleStatusConfirm = async () => {
    if (!confirmAction) return;
    setConfirming(true);
    try {
      await updatePastoralAppointment(confirmAction.appt._id, { status: confirmAction.status });
      setConfirmAction(null);
      loadStats();
      fetchAppointments(pagination.page);
    } catch { /* keep dialog open on failure */ } finally { setConfirming(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePastoralAppointment(deleteTarget._id);
      setDeleteTarget(null);
      loadStats();
      fetchAppointments(pagination.page);
    } catch { /* keep modal open on failure */ } finally { setDeleting(false); }
  };

  const hasFilters = Boolean(filterStatus || filterType || String(filterSearch || "").trim() || (view !== "today" && (filterDateFrom || filterDateTo)));

  const VIEW_TABS = [
    { key: "upcoming", label: "Upcoming", count: stats?.upcoming ?? 0, color: "text-blue-600" },
    { key: "today", label: "Today", count: stats?.today ?? 0, color: "text-amber-600" },
    { key: "all", label: "All", count: stats?.total ?? pagination.total, color: "text-gray-600" },
  ];

  const heading = view === "upcoming" ? "Upcoming Appointments" : view === "today" ? "Today's Schedule" : "All Appointments";

  return (
    <div className="mt-6">
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {VIEW_TABS.map((t) => (
          <button key={t.key} onClick={() => switchView(t.key)} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors shrink-0 ${view === t.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {t.label}
            <span className={`text-xs font-bold ${view === t.key ? "text-white/80" : t.color}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-gray-900 text-sm">{heading}</div>
              <div className="text-gray-500 text-xs">Counseling sessions and pastoral appointments</div>
            </div>
          </div>
          <div className="hidden md:flex md:items-center md:gap-3">
            <FilterBar
              searchValue={filterSearch}
              onSearchChange={(v) => { setFilterSearch(v); fetchAppointments(1, { search: v || undefined }); }}
              searchPlaceholder="Search person or reference…"
              selects={[
                {
                  key: "type",
                  value: filterType,
                  onChange: (v) => { setFilterType(v); fetchAppointments(1, { type: v || undefined }); },
                  placeholder: "All Types",
                  options: APPOINTMENT_TYPES.map((o) => ({ label: o.label, value: o.value })),
                },
                {
                  key: "status",
                  value: filterStatus,
                  onChange: (v) => { setFilterStatus(v); fetchAppointments(1, { status: v || undefined }); },
                  placeholder: "All Statuses",
                  options: APPOINTMENT_STATUSES.map((o) => ({ label: o.label, value: o.value })),
                },
              ]}
              dateFrom={filterDateFrom}
              dateTo={filterDateTo}
              onDateApply={(from, to) => { setFilterDateFrom(from); setFilterDateTo(to); fetchAppointments(1, { dateFrom: from || undefined, dateTo: to || undefined }); }}
            />
          </div>
          <MobileFilterBar
            searchValue={filterSearch}
            onSearchChange={(v) => { setFilterSearch(v); fetchAppointments(1, { search: v || undefined }); }}
            searchPlaceholder="Search person or reference…"
            dateFrom={filterDateFrom}
            dateTo={filterDateTo}
            onDateApply={(from, to) => { setFilterDateFrom(from); setFilterDateTo(to); fetchAppointments(1, { dateFrom: from || undefined, dateTo: to || undefined }); }}
            filters={[
              {
                key: "type",
                label: "Type",
                value: filterType,
                defaultValue: "",
                options: [{ label: "All Types", value: "" }, ...APPOINTMENT_TYPES.map((o) => ({ label: o.label, value: o.value }))],
              },
              {
                key: "status",
                label: "Status",
                value: filterStatus,
                defaultValue: "",
                options: [{ label: "All Statuses", value: "" }, ...APPOINTMENT_STATUSES.map((o) => ({ label: o.label, value: o.value }))],
              },
            ]}
            onApply={(pending) => {
              const ty = pending.type || "";
              const st = pending.status || "";
              setFilterType(ty);
              setFilterStatus(st);
              fetchAppointments(1, { type: ty || undefined, status: st || undefined });
            }}
          />
        </div>

        {loading ? (
          <div className="overflow-x-auto animate-pulse">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => <th key={i} className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="text-sm">
                    <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    {[0, 1, 2, 3, 4].map((j) => <td key={j} className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : appointments.length === 0 ? (
          <EmptyState
            compact
            illustration={hasFilters ? "search" : "memberCare"}
            title={hasFilters
              ? "No appointments found"
              : view === "today" ? "Nothing scheduled today" : view === "upcoming" ? "No upcoming appointments" : "No appointments yet"}
            description={hasFilters
              ? "We couldn't find any appointments matching your filters."
              : "Schedule counseling sessions and pastoral appointments to keep pastoral care organized."}
            actionLabel={hasFilters ? "Clear Filters" : null}
            onAction={hasFilters
              ? () => { setFilterSearch(""); setFilterStatus(""); setFilterType(""); setFilterDateFrom(""); setFilterDateTo(""); fetchAppointments(1, { search: undefined, status: undefined, type: undefined, dateFrom: undefined, dateTo: undefined }); }
              : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Person</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">When</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Location</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Pastor / Counselor</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.map((appt) => (
                  <AppointmentRow
                    key={appt._id}
                    appt={appt}
                    onView={setDetails}
                    onEdit={(x) => { setEditing(x); setFormMode("edit"); setFormOpen(true); }}
                    onDelete={setDeleteTarget}
                    onStatusRequest={handleStatusRequest}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pagination={{
            currentPage: pagination.page || 1,
            totalPages: Math.max(1, pagination.pages || 1),
            totalResult: pagination.total || 0,
            prevPage: (pagination.page || 1) > 1 ? pagination.page - 1 : null,
            nextPage: (pagination.page || 1) < (pagination.pages || 1) ? pagination.page + 1 : null,
          }}
          rowsCount={appointments.length}
          limit={limit}
          onLimitChange={(n) => { setLimit(n); fetchAppointments(1, { limit: n }); }}
          onPageChange={(p) => fetchAppointments(p)}
          itemName="appointments"
          filtered={hasFilters}
        />
      </div>

      <AppointmentFormModal
        open={formOpen}
        mode={formMode}
        initialData={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); loadStats(); fetchAppointments(pagination.page); }}
      />

      <AppointmentDetailsModal
        open={!!details}
        appointment={details}
        onClose={() => setDetails(null)}
      />

      {confirmAction ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">{confirmAction.title}</div>
            <p className="text-xs text-gray-400 mb-5">
              <span className="font-semibold text-gray-600">{personName(confirmAction.appt)}</span>
              {"'s appointment "}
              {confirmAction.message}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleStatusConfirm}
                disabled={confirming}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-60 ${confirmAction.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {confirming ? "Saving…" : confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Delete this appointment?</div>
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
