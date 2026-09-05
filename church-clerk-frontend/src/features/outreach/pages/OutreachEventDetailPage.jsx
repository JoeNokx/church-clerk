import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";

import {
  getOutreachEventById,
  updateOutreachEvent,
  getProspectsByEvent,
  deleteProspect,
  getFollowUpsByEvent,
  updateFollowUp,
  deleteFollowUp,
} from "../services/outreach.api.js";
import { getMembers } from "../../member/services/member.api.js";
import { PersonFormModal } from "../components/tabs/PeopleReachedTab.jsx";
import { FollowUpFormModal } from "../components/tabs/FollowUpsTab.jsx";

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



// ─── Prospect Row ─────────────────────────────────────────────────
function ProspectRow({ prospect, onEdit, onDelete, onAddFollowUp, onView, canWrite, canDelete }) {
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
          <button onClick={() => onView(prospect)} className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap">View</button>
          {canWrite ? (
            <button onClick={() => onAddFollowUp(prospect)} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 whitespace-nowrap">
              + Schedule Follow-Up
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

// Combined status/outcome labels for display
const STATUS_OUTCOME_LABELS = {
  ...OUTCOME_LABELS,
  pending: "Pending", contacted: "Contacted", "no-response": "No Response",
  rescheduled: "Rescheduled", completed: "Completed", "not-interested": "Not Interested",
  "connected-to-church": "Connected to Church",
};
const STATUS_OUTCOME_STYLES = {
  ...OUTCOME_STYLES,
  pending: "bg-amber-100 text-amber-700", contacted: "bg-blue-100 text-blue-700",
  "no-response": "bg-gray-100 text-gray-600", rescheduled: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700", "not-interested": "bg-red-100 text-red-600",
  "connected-to-church": "bg-emerald-100 text-emerald-700",
};

// ─── Follow-up Row ────────────────────────────────────────────────
function FollowUpRow({ followUp, onEdit, onDelete, canWrite, canDelete }) {
  const statusKey = followUp.status || followUp.outcome || "";
  const dateVal = followUp.scheduledDate || followUp.followUpDate;
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-900 text-sm">
          {followUp.prospect?.firstName} {followUp.prospect?.lastName || ""}
        </div>
        {followUp.prospect?.phone ? <div className="text-xs text-gray-400">{followUp.prospect.phone}</div> : null}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(dateVal)}</td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-gray-600 capitalize">{FOLLOWUP_TYPE_LABELS[followUp.type] || followUp.type}</span>
      </td>
      <td className="px-4 py-3">
        <Badge label={STATUS_OUTCOME_LABELS[statusKey] || statusKey?.replace(/-/g, " ") || "—"} className={STATUS_OUTCOME_STYLES[statusKey] || "bg-gray-100 text-gray-500"} />
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
  const fromTab = useMemo(() => new URLSearchParams(location.search).get("from") || "outreaches", [location.search]);

  const backParams = useMemo(() => {
    const params = {};
    if (fromTab === "overview") params.defaultTab = "overview";
    else if (fromTab === "people") params.defaultTab = "people";
    else params.defaultTab = "outreaches";
    return params;
  }, [fromTab]);

  const backLabel = fromTab === "overview" ? "Back to Overview" : fromTab === "people" ? "Back to People Reached" : "Back to Outreach";

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("prospects");

  const eventTeams = useMemo(() => (Array.isArray(event?.teams) ? event.teams : []), [event]);

  const [prospects, setProspects] = useState([]);
  const [prospectsLoading, setProspectsLoading] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [members, setMembers] = useState([]);

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

  useEffect(() => {
    fetchEvent(); fetchProspects(); fetchFollowUps();
    getMembers({ limit: 200, status: "active" }).then((r) => setMembers(r.data?.members || [])).catch(() => {});
  }, [eventId]);

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
      <button onClick={() => toPage("outreach", backParams)} className="mt-4 text-blue-700 font-semibold hover:underline text-sm">← {backLabel}</button>
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
      <button onClick={() => toPage("outreach", backParams)} className="mt-4 text-blue-700 font-semibold hover:underline text-sm">← {backLabel}</button>
    </div>
  );

  const teamAll = [event.teamLeader, ...(event.teamMembers || [])].filter(Boolean).reduce((acc, m) => {
    if (!acc.find(x => String(x._id) === String(m._id))) acc.push(m);
    return acc;
  }, []);

  return (
    <div className="max-w-5xl">
      {/* Back + Header */}
      <button onClick={() => toPage("outreach", backParams)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        {backLabel}
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

        {/* Team Members */}
        {teamAll.length > 0 ? (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-500 mb-2">TEAM MEMBERS</div>
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

        {/* Outreach Teams (clickable chips → navigate to Teams tab) */}
        {eventTeams.length > 0 ? (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-500 mb-2">OUTREACH TEAMS</div>
            <div className="flex flex-wrap gap-2">
              {eventTeams.map((team) => (
                <button
                  key={team._id}
                  type="button"
                  onClick={() => toPage("team-details", { id: team._id, from: fromTab })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /></svg>
                  {team.name}
                </button>
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
                  <span className="text-base leading-none">+</span> Record Person
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
                {canCreate ? <div className="mt-1 text-xs">Click <strong>Record Person</strong> to start recording.</div> : null}
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
                        onView={(prospect) => toPage("prospect-details", { id: prospect._id, from: fromTab })}
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
                <div className="mt-1 text-xs">Go to the <strong>Prospects</strong> tab and click <strong>Schedule Follow-Up</strong> on any person.</div>
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
                        onDelete={(fu) => setDeleteModal({ open: true, type: "followup", id: fu._id, name: `follow-up on ${fmtDate(fu.scheduledDate || fu.followUpDate)}` })}
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
      <PersonFormModal
        open={prospectForm.open}
        mode={prospectForm.mode}
        initialData={prospectForm.data}
        events={event ? [event] : []}
        defaultOutreachEventId={eventId}
        onClose={() => setProspectForm({ open: false, mode: "create", data: null })}
        onSaved={() => { setProspectForm({ open: false, mode: "create", data: null }); fetchProspects(); fetchEvent(); }}
      />

      <FollowUpFormModal
        open={followUpForm.open}
        mode={followUpForm.mode}
        initialData={followUpForm.data}
        prospects={prospects}
        events={event ? [event] : []}
        members={members}
        defaultValues={{ prospect: followUpForm.prospectId || "", outreachEvent: eventId || "" }}
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
