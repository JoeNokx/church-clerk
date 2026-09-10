import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import BackButton from "../../../shared/components/BackButton/index.jsx";

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
import { FollowUpFormModal, FollowUpDetailsModal } from "../components/tabs/FollowUpsTab.jsx";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";

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
  if (!v) return "Not Specified";
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
    <tr className="max-md:text-xs text-gray-700 text-sm">
      <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">
        <div className="font-semibold text-gray-900 text-sm">{prospect.firstName} {prospect.lastName || ""}</div>
      </td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
        <Badge label={DECISION_LABELS[prospect.decision] || prospect.decision} className={DECISION_STYLES[prospect.decision] || "bg-gray-100 text-gray-500"} />
      </td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
        <Badge label={prospect.interestLevel || "Not Specified"} className={INTEREST_STYLES[prospect.interestLevel] || "bg-gray-100 text-gray-500"} />
      </td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6 text-xs text-gray-500">
        {prospect.gender ? <span className="capitalize">{prospect.gender}</span> : "Not Specified"}
        {prospect.ageGroup ? <span className="ml-1 capitalize text-gray-400">· {prospect.ageGroup}</span> : null}
      </td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6 text-xs text-gray-500">
        {prospect.followUpCount || 0}
      </td>
      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
        <TableKebabMenu items={[
          { label: "View", onClick: () => onView(prospect) },
          canWrite && { label: "Schedule Follow-Up", onClick: () => onAddFollowUp(prospect) },
          canWrite && { label: "Edit", onClick: () => onEdit(prospect) },
          canDelete && { label: "Delete", onClick: () => onDelete(prospect), danger: true },
        ]} />
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
function FollowUpRow({ followUp, onEdit, onDelete, onView, canWrite, canDelete }) {
  const statusKey = followUp.status || followUp.outcome || "";
  const dateVal = followUp.scheduledDate || followUp.followUpDate;
  return (
    <tr className="max-md:text-xs text-gray-700 text-sm">
      <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">
        <div className="font-semibold text-gray-900 text-sm">
          {followUp.prospect?.firstName} {followUp.prospect?.lastName || ""}
        </div>
      </td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6 text-xs text-gray-600">{fmtDate(dateVal)}</td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
        <span className="text-xs text-gray-600 capitalize">{FOLLOWUP_TYPE_LABELS[followUp.type] || followUp.type}</span>
      </td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
        <Badge label={STATUS_OUTCOME_LABELS[statusKey] || statusKey?.replace(/-/g, " ") || "Not Specified"} className={STATUS_OUTCOME_STYLES[statusKey] || "bg-gray-100 text-gray-500"} />
      </td>
      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6 text-xs text-gray-500">
        {followUp.nextFollowUpDate ? fmtDate(followUp.nextFollowUpDate) : "Not Specified"}
      </td>
      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
        <TableKebabMenu items={[
          { label: "View", onClick: () => onView(followUp) },
          canWrite && { label: "Edit", onClick: () => onEdit(followUp) },
          canDelete && { label: "Delete", onClick: () => onDelete(followUp), danger: true },
        ]} />
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
  const [detailsFU, setDetailsFU] = useState(null);

  const [deleteModal, setDeleteModal] = useState({ open: false, type: "", id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);

  const [prospectSearch, setProspectSearch] = useState("");
  const [prospectDateFrom, setProspectDateFrom] = useState("");
  const [prospectDateTo, setProspectDateTo] = useState("");
  const [fuSearch, setFuSearch] = useState("");
  const [fuDateFrom, setFuDateFrom] = useState("");
  const [fuDateTo, setFuDateTo] = useState("");

  const [prospectsPage, setProspectsPage] = useState(1);
  const [followUpsPage, setFollowUpsPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const filteredProspects = useMemo(() => {
    let list = prospects;
    if (prospectSearch.trim()) {
      const q = prospectSearch.toLowerCase();
      list = list.filter((p) => {
        const name = `${p.firstName || ""} ${p.lastName || ""}`.trim().toLowerCase();
        const phone = (p.phoneNumber || "").toLowerCase();
        return name.includes(q) || phone.includes(q);
      });
    }
    if (prospectDateFrom || prospectDateTo) {
      list = list.filter((p) => {
        const d = (p.createdAt || "").slice(0, 10);
        if (!d) return false;
        if (prospectDateFrom && d < prospectDateFrom) return false;
        if (prospectDateTo && d > prospectDateTo) return false;
        return true;
      });
    }
    return list;
  }, [prospects, prospectSearch, prospectDateFrom, prospectDateTo]);

  const prospectsTotalPages = Math.ceil(filteredProspects.length / PAGE_SIZE);
  const paginatedProspects = filteredProspects.slice((prospectsPage - 1) * PAGE_SIZE, prospectsPage * PAGE_SIZE);

  const filteredFollowUps = useMemo(() => {
    let list = followUps;
    if (fuSearch.trim()) {
      const q = fuSearch.toLowerCase();
      list = list.filter((f) => {
        const name = `${f.prospect?.firstName || ""} ${f.prospect?.lastName || ""}`.trim().toLowerCase();
        const assignedTo = `${f.assignedTo?.firstName || ""} ${f.assignedTo?.lastName || ""}`.trim().toLowerCase();
        return name.includes(q) || assignedTo.includes(q);
      });
    }
    if (fuDateFrom || fuDateTo) {
      list = list.filter((f) => {
        const d = (f.scheduledDate || f.followUpDate || "").slice(0, 10);
        if (!d) return false;
        if (fuDateFrom && d < fuDateFrom) return false;
        if (fuDateTo && d > fuDateTo) return false;
        return true;
      });
    }
    return list;
  }, [followUps, fuSearch, fuDateFrom, fuDateTo]);

  const followUpsTotalPages = Math.ceil(filteredFollowUps.length / PAGE_SIZE);
  const paginatedFollowUps = filteredFollowUps.slice((followUpsPage - 1) * PAGE_SIZE, followUpsPage * PAGE_SIZE);

  if (!eventId) return (
    <div className="text-center py-20 text-gray-500">
      <p>No event selected.</p>
      <BackButton onClick={() => toPage("outreach", backParams)} className="mt-4 mb-0" />
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
      <BackButton onClick={() => toPage("outreach", backParams)} className="mt-4 mb-0" />
    </div>
  );

  const teamAll = [event.teamLeader, ...(event.teamMembers || [])].filter(Boolean).reduce((acc, m) => {
    if (!acc.find(x => String(x._id) === String(m._id))) acc.push(m);
    return acc;
  }, []);

  return (
    <div className="max-w-5xl">
      {/* Back + Header */}
      <BackButton onClick={() => toPage("outreach", backParams)} />

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
                  className="cck-allow-icons inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  {team.name}
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
              <div>
                <div className="font-semibold text-gray-900 text-sm">People Reached</div>
                <div className="text-gray-500 text-xs">Everyone encountered during this outreach</div>
              </div>
              <FilterBar
                searchValue={prospectSearch}
                onSearchChange={(v) => { setProspectSearch(v); setProspectsPage(1); }}
                searchPlaceholder="Search by name or phone…"
                dateFrom={prospectDateFrom}
                dateTo={prospectDateTo}
                onDateApply={(from, to) => { setProspectDateFrom(from); setProspectDateTo(to); setProspectsPage(1); }}
              />
              <MobileFilterBar
                searchValue={prospectSearch}
                onSearchChange={(v) => { setProspectSearch(v); setProspectsPage(1); }}
                searchPlaceholder="Search by name or phone…"
                dateFrom={prospectDateFrom}
                dateTo={prospectDateTo}
                onDateApply={(from, to) => { setProspectDateFrom(from); setProspectDateTo(to); setProspectsPage(1); }}
              />
              {canCreate ? (
                <button onClick={() => setProspectForm({ open: true, mode: "create", data: null })} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800">
                  <span className="text-base leading-none">+</span> Record Person
                </button>
              ) : null}
            </div>

            {prospectsLoading ? (
              <div className="p-6 space-y-3">{[0,1,2].map(i => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>
            ) : prospects.length === 0 ? (
              <div className="p-4 md:p-6 lg:p-8">
                <EmptyState
                  compact
                  illustration={prospectSearch || prospectDateFrom || prospectDateTo ? "search" : "peopleReached"}
                  title={prospectSearch || prospectDateFrom || prospectDateTo ? "No people found" : "No people recorded yet"}
                  description={prospectSearch || prospectDateFrom || prospectDateTo ? "We couldn't find anyone matching your filters." : "Record the first person reached during this outreach."}
                  actionLabel={prospectSearch || prospectDateFrom || prospectDateTo ? "Clear Filters" : (canCreate ? "Record Person" : null)}
                  onAction={prospectSearch || prospectDateFrom || prospectDateTo ? () => { setProspectSearch(""); setProspectDateFrom(""); setProspectDateTo(""); } : (canCreate ? () => setProspectForm({ open: true, mode: "create", data: null }) : undefined)}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Person</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Decision</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Interest</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Demographics</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Follow-ups</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedProspects.map((p) => (
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
            <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3">
              <button
                type="button"
                onClick={() => setProspectsPage(p => p - 1)}
                disabled={prospectsPage <= 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Prev
              </button>
              <div className="text-gray-600 text-sm">Page {prospectsPage}</div>
              <button
                type="button"
                onClick={() => setProspectsPage(p => p + 1)}
                disabled={prospectsPage >= prospectsTotalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {/* Follow-ups Tab */}
        {activeTab === "followups" ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Follow-up Log</div>
                <div className="text-gray-500 text-xs">All follow-up contacts made for this outreach event</div>
              </div>
              <FilterBar
                searchValue={fuSearch}
                onSearchChange={(v) => { setFuSearch(v); setFollowUpsPage(1); }}
                searchPlaceholder="Search prospect or assigned to…"
                dateFrom={fuDateFrom}
                dateTo={fuDateTo}
                onDateApply={(from, to) => { setFuDateFrom(from); setFuDateTo(to); setFollowUpsPage(1); }}
              />
              <MobileFilterBar
                searchValue={fuSearch}
                onSearchChange={(v) => { setFuSearch(v); setFollowUpsPage(1); }}
                searchPlaceholder="Search prospect or assigned to…"
                dateFrom={fuDateFrom}
                dateTo={fuDateTo}
                onDateApply={(from, to) => { setFuDateFrom(from); setFuDateTo(to); setFollowUpsPage(1); }}
              />
            </div>

            {followUpsLoading ? (
              <div className="p-6 space-y-3">{[0,1,2].map(i => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>
            ) : followUps.length === 0 ? (
              <div className="p-4 md:p-6 lg:p-8">
                <EmptyState
                  compact
                  illustration={fuSearch || fuDateFrom || fuDateTo ? "search" : "followUps"}
                  title={fuSearch || fuDateFrom || fuDateTo ? "No follow-ups found" : "No follow-ups recorded yet"}
                  description={fuSearch || fuDateFrom || fuDateTo ? "We couldn't find any follow-ups matching your filters." : "Schedule follow-ups from the Prospects tab to stay connected with people."}
                  actionLabel={fuSearch || fuDateFrom || fuDateTo ? "Clear Filters" : null}
                  onAction={fuSearch || fuDateFrom || fuDateTo ? () => { setFuSearch(""); setFuDateFrom(""); setFuDateTo(""); } : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Prospect</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Method</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Outcome</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Next Date</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedFollowUps.map((f) => (
                      <FollowUpRow
                        key={f._id}
                        followUp={f}
                        onView={(fu) => setDetailsFU(fu)}
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
            <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3">
              <button
                type="button"
                onClick={() => setFollowUpsPage(p => p - 1)}
                disabled={followUpsPage <= 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Prev
              </button>
              <div className="text-gray-600 text-sm">Page {followUpsPage}</div>
              <button
                type="button"
                onClick={() => setFollowUpsPage(p => p + 1)}
                disabled={followUpsPage >= followUpsTotalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
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

      <FollowUpDetailsModal
        open={!!detailsFU}
        followUp={detailsFU}
        onClose={() => setDetailsFU(null)}
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
