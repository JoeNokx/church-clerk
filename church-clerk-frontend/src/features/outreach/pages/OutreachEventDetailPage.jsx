import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import Button from "../../../shared/components/Button/index.jsx";
import {
  getOutreachEventById,
  updateOutreachEvent,
  getProspectsByEvent,
  createProspect,
  updateProspect,
  deleteProspect,
  getFollowUpsByEvent,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
} from "../services/outreach.api.js";

// ─── Constants & Helpers ─────────────────────────────────────────
const DECISION_LABELS = {
  none: "No Decision",
  firstTimeSalvation: "First-Time Salvation",
  rededication: "Rededication",
  baptismInterest: "Baptism Interest",
  churchVisit: "Church Visit",
};
const DECISION_STYLES = {
  none: "bg-gray-100 text-gray-500",
  firstTimeSalvation: "bg-green-100 text-green-700",
  rededication: "bg-blue-100 text-blue-700",
  baptismInterest: "bg-purple-100 text-purple-700",
  churchVisit: "bg-amber-100 text-amber-700",
};
const INTEREST_STYLES = { low: "bg-red-100 text-red-600", medium: "bg-amber-100 text-amber-700", high: "bg-green-100 text-green-700" };
const OUTCOME_LABELS = {
  "not-reached": "Not Reached",
  "not-interested": "Not Interested",
  interested: "Interested",
  "attended-service": "Attended Service",
  "joined-church": "Joined Church",
};
const OUTCOME_STYLES = {
  "not-reached": "bg-gray-100 text-gray-500",
  "not-interested": "bg-red-100 text-red-600",
  interested: "bg-amber-100 text-amber-700",
  "attended-service": "bg-blue-100 text-blue-700",
  "joined-church": "bg-green-100 text-green-700",
};
const STATUS_STYLES = { planned: "bg-blue-100 text-blue-700", ongoing: "bg-amber-100 text-amber-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-600" };
const FOLLOWUP_TYPE_LABELS = { call: "Phone Call", visit: "Home Visit", text: "Text/SMS", email: "Email", "in-person": "In-Person" };

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}

function Badge({ label, className }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>;
}

function Avatar({ name, photo, size = "sm" }) {
  const s = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return photo
    ? <img src={photo} alt={name} className={`${s} rounded-full object-cover`} />
    : <div className={`${s} rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center`}>{initials}</div>;
}

// ─── Prospect Form Modal ──────────────────────────────────────────
function ProspectFormModal({ open, mode, initialData, eventId, onClose, onSaved }) {
  const empty = { firstName: "", lastName: "", phone: "", email: "", address: "", gender: "", ageGroup: "", decision: "none", interestLevel: "medium", notes: "" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(mode === "edit" && initialData
      ? { firstName: initialData.firstName || "", lastName: initialData.lastName || "", phone: initialData.phone || "", email: initialData.email || "", address: initialData.address || "", gender: initialData.gender || "", ageGroup: initialData.ageGroup || "", decision: initialData.decision || "none", interestLevel: initialData.interestLevel || "medium", notes: initialData.notes || "" }
      : empty);
    setError("");
  }, [open, mode, initialData]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.firstName.trim()) { setError("First name is required."); return; }
    setSaving(true); setError("");
    try {
      if (mode === "edit") await updateProspect(eventId, initialData._id, form);
      else await createProspect(eventId, form);
      onSaved?.();
    } catch (err) { setError(err?.response?.data?.message || "Something went wrong."); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">{mode === "edit" ? "Edit Prospect" : "Add Prospect"}</h2>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">First Name <span className="text-red-500">*</span></label>
              <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name</label>
              <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Area / Neighborhood" className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
              <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Age Group</label>
              <select value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
                <option value="">Select</option>
                <option value="child">Child</option>
                <option value="teenager">Teenager</option>
                <option value="youth">Youth</option>
                <option value="adult">Adult</option>
                <option value="elderly">Elderly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Decision</label>
              <select value={form.decision} onChange={(e) => set("decision", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
                {Object.entries(DECISION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Interest Level</label>
              <select value={form.interestLevel} onChange={(e) => set("interestLevel", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Any additional info about this person…" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </form>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 shrink-0">
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <Button type="submit" variant="primary" onClick={handleSubmit} loading={saving} loadingText="Saving…" className="h-11 rounded-lg px-6 text-sm">
            {mode === "edit" ? "Save Changes" : "Add Prospect"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Follow-up Form Modal ─────────────────────────────────────────
function FollowUpFormModal({ open, mode, initialData, prospectId, eventId, onClose, onSaved }) {
  const empty = { followUpDate: "", type: "call", notes: "", outcome: "not-reached", nextFollowUpDate: "" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(mode === "edit" && initialData
      ? { followUpDate: fmtDateInput(initialData.followUpDate), type: initialData.type || "call", notes: initialData.notes || "", outcome: initialData.outcome || "not-reached", nextFollowUpDate: fmtDateInput(initialData.nextFollowUpDate) }
      : empty);
    setError("");
  }, [open, mode, initialData]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.followUpDate) { setError("Follow-up date is required."); return; }
    setSaving(true); setError("");
    try {
      if (mode === "edit") await updateFollowUp(initialData._id, form);
      else await createFollowUp(prospectId, { ...form, outreachEvent: eventId });
      onSaved?.();
    } catch (err) { setError(err?.response?.data?.message || "Something went wrong."); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">{mode === "edit" ? "Edit Follow-up" : "Record Follow-up"}</h2>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Follow-up Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Method</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
                {Object.entries(FOLLOWUP_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Outcome</label>
            <select value={form.outcome} onChange={(e) => set("outcome", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
              {Object.entries(OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Next Follow-up Date</label>
            <input type="date" value={form.nextFollowUpDate} onChange={(e) => set("nextFollowUpDate", e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="What was discussed?" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </form>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 shrink-0">
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <Button type="submit" variant="primary" onClick={handleSubmit} loading={saving} loadingText="Saving…" className="h-11 rounded-lg px-6 text-sm">
            {mode === "edit" ? "Save Changes" : "Record"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Prospect Row ─────────────────────────────────────────────────
function ProspectRow({ prospect, onEdit, onDelete, onAddFollowUp, canWrite, canDelete }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={`${prospect.firstName} ${prospect.lastName || ""}`} size="sm" />
          <div>
            <div className="font-semibold text-gray-900 text-sm">{prospect.firstName} {prospect.lastName || ""}</div>
            {prospect.phone ? <div className="text-xs text-gray-500">{prospect.phone}</div> : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <Badge label={DECISION_LABELS[prospect.decision] || prospect.decision} className={DECISION_STYLES[prospect.decision] || "bg-gray-100 text-gray-500"} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <Badge label={prospect.interestLevel || "—"} className={INTEREST_STYLES[prospect.interestLevel] || "bg-gray-100 text-gray-500"} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
        {prospect.gender ? <span className="capitalize">{prospect.gender}</span> : "—"}
        {prospect.ageGroup ? <span className="ml-1 capitalize text-gray-400">· {prospect.ageGroup}</span> : null}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
        {prospect.followUpCount || 0}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          {canWrite ? (
            <button onClick={() => onAddFollowUp(prospect)} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 whitespace-nowrap">
              + Follow-up
            </button>
          ) : null}
          {canWrite ? (
            <button onClick={() => onEdit(prospect)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          ) : null}
          {canDelete ? (
            <button onClick={() => onDelete(prospect)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

// ─── Follow-up Row ────────────────────────────────────────────────
function FollowUpRow({ followUp, onEdit, onDelete, canWrite, canDelete }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-900 text-sm">
          {followUp.prospect?.firstName} {followUp.prospect?.lastName || ""}
        </div>
        {followUp.prospect?.phone ? <div className="text-xs text-gray-400">{followUp.prospect.phone}</div> : null}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(followUp.followUpDate)}</td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-gray-600 capitalize">{FOLLOWUP_TYPE_LABELS[followUp.type] || followUp.type}</span>
      </td>
      <td className="px-4 py-3">
        <Badge label={OUTCOME_LABELS[followUp.outcome] || followUp.outcome} className={OUTCOME_STYLES[followUp.outcome] || "bg-gray-100 text-gray-500"} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
        {followUp.nextFollowUpDate ? fmtDate(followUp.nextFollowUpDate) : "—"}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 max-w-xs truncate">{followUp.notes || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          {canWrite ? (
            <button onClick={() => onEdit(followUp)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          ) : null}
          {canDelete ? (
            <button onClick={() => onDelete(followUp)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

// ─── Team Role Labels ────────────────────────────────────────────
const TEAM_ROLE_LABELS = {
  "team-leader": "Team Leader", evangelist: "Evangelist", counselor: "Counselor",
  "prayer-team": "Prayer Team", "follow-up-team": "Follow-Up Team",
  transport: "Transport", registration: "Registration", media: "Media", volunteer: "Volunteer",
};

// ─── Team Detail Card ─────────────────────────────────────────────
function TeamDetailCard({ team }) {
  const members = team.members || [];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm leading-snug">{team.name}</div>
          {team.description ? <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{team.description}</div> : null}
        </div>
      </div>

      {/* Member count badge */}
      <div className="flex items-center gap-2 mb-3 pt-2 border-t border-gray-100">
        <span className="inline-flex rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[11px] font-semibold">{members.length} {members.length === 1 ? "member" : "members"}</span>
      </div>

      {/* Members */}
      {members.length > 0 ? (
        <div className="space-y-2">
          {members.map((m, i) => {
            const mem = typeof m.member === "object" ? m.member : null;
            if (!mem) return null;
            const location = mem.community || mem.address || null;
            return (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {(mem.firstName?.[0] || "?").toUpperCase()}{(mem.lastName?.[0] || "").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{mem.firstName} {mem.lastName || ""}</div>
                  <div className="flex flex-wrap gap-x-2 mt-0.5">
                    {mem.phoneNumber ? <span className="text-xs text-gray-500">{mem.phoneNumber}</span> : null}
                    {location ? (
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 shrink-0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" /></svg>
                        {location}
                      </span>
                    ) : null}
                  </div>
                </div>
                {m.role ? (
                  <span className="shrink-0 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap">
                    {TEAM_ROLE_LABELS[m.role] || m.role}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic text-center py-3">No members in this team</div>
      )}
    </div>
  );
}

// ─── Confirm Delete ────────────────────────────────────────────────
function ConfirmDelete({ open, title, body, onCancel, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="font-semibold text-gray-900 text-sm">{title}</div>
        </div>
        <p className="text-sm text-gray-500 mb-6">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 h-11 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────
export default function OutreachEventDetailPage() {
  const { can } = useContext(PermissionContext) || {};
  const canWrite = typeof can === "function" ? can("outreach", "update") : false;
  const canCreate = typeof can === "function" ? can("outreach", "create") : false;
  const canDelete = typeof can === "function" ? can("outreach", "delete") : false;

  const { toPage } = useDashboardNavigator();
  const location = useLocation();
  const eventId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search]);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("prospects");

  const eventTeams = useMemo(() => (Array.isArray(event?.teams) ? event.teams : []), [event]);

  const [prospects, setProspects] = useState([]);
  const [prospectsLoading, setProspectsLoading] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);

  const [prospectForm, setProspectForm] = useState({ open: false, mode: "create", data: null });
  const [followUpForm, setFollowUpForm] = useState({ open: false, mode: "create", data: null, prospectId: null });

  const [deleteModal, setDeleteModal] = useState({ open: false, type: "", id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try { const res = await getOutreachEventById(eventId); setEvent(res.data?.data || null); }
    catch { setEvent(null); } finally { setLoading(false); }
  }, [eventId]);

  const fetchProspects = useCallback(async () => {
    if (!eventId) return;
    setProspectsLoading(true);
    try { const res = await getProspectsByEvent(eventId); setProspects(res.data?.data || []); }
    catch { setProspects([]); } finally { setProspectsLoading(false); }
  }, [eventId]);

  const fetchFollowUps = useCallback(async () => {
    if (!eventId) return;
    setFollowUpsLoading(true);
    try { const res = await getFollowUpsByEvent(eventId); setFollowUps(res.data?.data || []); }
    catch { setFollowUps([]); } finally { setFollowUpsLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchEvent(); fetchProspects(); fetchFollowUps(); }, [eventId]);

  const handleStatusChange = async (newStatus) => {
    if (!event || statusUpdating) return;
    setStatusUpdating(true);
    try { await updateOutreachEvent(eventId, { status: newStatus }); fetchEvent(); }
    catch { } finally { setStatusUpdating(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    setDeleting(true);
    try {
      if (deleteModal.type === "prospect") {
        await deleteProspect(eventId, deleteModal.id);
        fetchProspects(); fetchFollowUps();
      } else if (deleteModal.type === "followup") {
        await deleteFollowUp(deleteModal.id);
        fetchFollowUps();
      }
      setDeleteModal({ open: false, type: "", id: null, name: "" });
    } catch { } finally { setDeleting(false); }
  };

  if (!eventId) return (
    <div className="text-center py-20 text-gray-500">
      <p>No event selected.</p>
      <button onClick={() => toPage("outreach")} className="mt-4 text-blue-700 font-semibold hover:underline text-sm">← Back to Outreach</button>
    </div>
  );

  if (loading) return (
    <div className="max-w-5xl space-y-4">
      <div className="h-8 w-64 rounded bg-gray-200 animate-pulse" />
      <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
      <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" />
    </div>
  );

  if (!event) return (
    <div className="text-center py-20 text-gray-500">
      <p>Event not found.</p>
      <button onClick={() => toPage("outreach")} className="mt-4 text-blue-700 font-semibold hover:underline text-sm">← Back to Outreach</button>
    </div>
  );

  const teamAll = [event.teamLeader, ...(event.teamMembers || [])].filter(Boolean).reduce((acc, m) => {
    if (!acc.find(x => String(x._id) === String(m._id))) acc.push(m);
    return acc;
  }, []);

  return (
    <div className="max-w-5xl">
      {/* Back + Header */}
      <button onClick={() => toPage("outreach")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        Back to Outreach
      </button>

      {/* Event Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge label={event.status} className={STATUS_STYLES[event.status] || "bg-gray-100 text-gray-600"} />
              <Badge label={event.type?.replace(/-/g, " ")} className="bg-indigo-100 text-indigo-700 capitalize" />
              {event.referenceId ? <span className="text-xs text-gray-400 font-mono">{event.referenceId}</span> : null}
            </div>
            <h1 className="font-bold text-gray-900 text-xl md:text-2xl">{event.title}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-400"><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                {fmtDate(event.date)}{event.endDate ? ` – ${fmtDate(event.endDate)}` : ""}
              </span>
              {event.location ? (
                <span className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-400"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" /></svg>
                  {event.location}
                </span>
              ) : null}
            </div>
            {event.description ? <p className="mt-3 text-sm text-gray-600 leading-relaxed">{event.description}</p> : null}
          </div>

          {/* Quick status actions */}
          {canWrite && event.status !== "completed" && event.status !== "cancelled" ? (
            <div className="flex flex-wrap gap-2 shrink-0">
              {event.status === "planned" ? (
                <button onClick={() => handleStatusChange("ongoing")} disabled={statusUpdating} className="h-9 px-4 rounded-lg bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60">Mark Ongoing</button>
              ) : null}
              {event.status !== "completed" ? (
                <button onClick={() => handleStatusChange("completed")} disabled={statusUpdating} className="h-9 px-4 rounded-lg bg-green-700 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-60">Mark Complete</button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-700">{event.prospectCount || 0}</div>
            <div className="text-xs text-gray-500 mt-0.5">Prospects</div>
          </div>
          <div className="text-center border-x border-gray-100">
            <div className="text-2xl font-bold text-green-700">{event.decisionCount || 0}</div>
            <div className="text-xs text-gray-500 mt-0.5">Decisions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-700">{followUps.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Follow-ups</div>
          </div>
        </div>

        {/* Team */}
        {teamAll.length > 0 ? (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-500 mb-2">TEAM</div>
            <div className="flex flex-wrap gap-2">
              {teamAll.map((m) => (
                <div key={m._id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                  <Avatar name={`${m.firstName} ${m.lastName || ""}`} photo={m.photoUrl} size="sm" />
                  <span className="text-xs font-semibold text-gray-700">{m.firstName} {m.lastName || ""}</span>
                  {String(m._id) === String(event.teamLeader?._id) ? <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 font-semibold">Leader</span> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <div className="flex gap-1 border-b border-gray-200">
          {[
          { key: "prospects", label: `Prospects (${prospects.length})` },
          { key: "followups", label: `Follow-ups (${followUps.length})` },
          { key: "teams", label: `Teams (${eventTeams.length})` },
        ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${activeTab === tab.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Prospects Tab */}
        {activeTab === "prospects" ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-gray-900 text-sm">People Reached</div>
                <div className="text-xs text-gray-500 mt-0.5">Everyone encountered during this outreach</div>
              </div>
              {canCreate ? (
                <button onClick={() => setProspectForm({ open: true, mode: "create", data: null })} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800">
                  <span className="text-base leading-none">+</span> Add Prospect
                </button>
              ) : null}
            </div>

            {prospectsLoading ? (
              <div className="p-6 space-y-3">{[0,1,2].map(i => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>
            ) : prospects.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-sm">
                <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-blue-50 text-blue-400 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </div>
                No prospects recorded yet.
                {canCreate ? <div className="mt-1 text-xs">Click <strong>Add Prospect</strong> to start recording.</div> : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">Person</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Decision</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Interest</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Demographics</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Follow-ups</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.map((p) => (
                      <ProspectRow
                        key={p._id}
                        prospect={p}
                        onEdit={(prospect) => setProspectForm({ open: true, mode: "edit", data: prospect })}
                        onDelete={(prospect) => setDeleteModal({ open: true, type: "prospect", id: prospect._id, name: `${prospect.firstName} ${prospect.lastName || ""}` })}
                        onAddFollowUp={(prospect) => setFollowUpForm({ open: true, mode: "create", data: null, prospectId: prospect._id })}
                        canWrite={canWrite}
                        canDelete={canDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* Teams Tab */}
        {activeTab === "teams" ? (
          <div className="mt-4">
            {eventTeams.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </div>
                <div className="font-semibold text-gray-900 text-sm">No teams linked</div>
                <div className="text-xs text-gray-400 mt-1">Edit this event and add outreach teams to it</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eventTeams.map((team) => <TeamDetailCard key={team._id} team={team} />)}
              </div>
            )}
          </div>
        ) : null}

        {/* Follow-ups Tab */}
        {activeTab === "followups" ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Follow-up Log</div>
                <div className="text-xs text-gray-500 mt-0.5">All follow-up contacts made for this outreach event</div>
              </div>
            </div>

            {followUpsLoading ? (
              <div className="p-6 space-y-3">{[0,1,2].map(i => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>
            ) : followUps.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-sm">
                <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-amber-50 text-amber-400 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </div>
                No follow-ups recorded yet.
                <div className="mt-1 text-xs">Go to the <strong>Prospects</strong> tab and click <strong>+ Follow-up</strong> on any person.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">Prospect</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Method</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">Outcome</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Next Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Notes</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {followUps.map((f) => (
                      <FollowUpRow
                        key={f._id}
                        followUp={f}
                        onEdit={(fu) => setFollowUpForm({ open: true, mode: "edit", data: fu, prospectId: fu.prospect?._id })}
                        onDelete={(fu) => setDeleteModal({ open: true, type: "followup", id: fu._id, name: `follow-up on ${fmtDate(fu.followUpDate)}` })}
                        canWrite={canWrite}
                        canDelete={canDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Modals */}
      <ProspectFormModal
        open={prospectForm.open}
        mode={prospectForm.mode}
        initialData={prospectForm.data}
        eventId={eventId}
        onClose={() => setProspectForm({ open: false, mode: "create", data: null })}
        onSaved={() => { setProspectForm({ open: false, mode: "create", data: null }); fetchProspects(); fetchEvent(); }}
      />

      <FollowUpFormModal
        open={followUpForm.open}
        mode={followUpForm.mode}
        initialData={followUpForm.data}
        prospectId={followUpForm.prospectId}
        eventId={eventId}
        onClose={() => setFollowUpForm({ open: false, mode: "create", data: null, prospectId: null })}
        onSaved={() => { setFollowUpForm({ open: false, mode: "create", data: null, prospectId: null }); fetchFollowUps(); fetchProspects(); fetchEvent(); }}
      />

      <ConfirmDelete
        open={deleteModal.open}
        title={deleteModal.type === "prospect" ? "Remove Prospect" : "Delete Follow-up"}
        body={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
        onCancel={() => setDeleteModal({ open: false, type: "", id: null, name: "" })}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
