import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import {
  getOutreachTeamById,
  getOutreachEvents,
  updateOutreachTeam,
  deleteOutreachTeam,
} from "../services/outreach.api.js";
import { getMembers } from "../../member/services/member.api.js";

const ROLE_OPTIONS = [
  { value: "team-leader", label: "Team Leader" },
  { value: "evangelist", label: "Evangelist" },
  { value: "counselor", label: "Counselor" },
  { value: "prayer-team", label: "Prayer Team" },
  { value: "follow-up-team", label: "Follow-Up Team" },
  { value: "transport", label: "Transport" },
  { value: "registration", label: "Registration" },
  { value: "media", label: "Media" },
  { value: "volunteer", label: "Volunteer" },
];
const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

const EVENT_STATUS_STYLES = {
  planned: "bg-blue-100 text-blue-700",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};
const TEAM_STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
};

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Avatar({ name, size = "md" }) {
  const parts = (name || "?").trim().split(/\s+/);
  const init = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div className={`${sz} rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 select-none`}>
      {init.toUpperCase() || "?"}
    </div>
  );
}

export default function TeamDetailsPage() {
  const { can } = useContext(PermissionContext) || {};
  const canWrite = typeof can === "function" ? can("outreach", "update") : false;
  const canDelete = typeof can === "function" ? can("outreach", "delete") : false;

  const { toPage } = useDashboardNavigator();
  const location = useLocation();
  const teamId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search]);
  const fromTab = useMemo(() => new URLSearchParams(location.search).get("from") || "teams", [location.search]);

  const [team, setTeam] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const backParams = useMemo(() => {
    const params = {};
    if (fromTab === "overview") params.defaultTab = "overview";
    else if (fromTab === "outreaches") params.defaultTab = "outreaches";
    else params.defaultTab = "teams";
    return params;
  }, [fromTab]);

  const backLabel = fromTab === "overview" ? "Back to Overview" : fromTab === "outreaches" ? "Back to Outreaches" : "Back to Teams";

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await getOutreachTeamById(teamId);
      setTeam(res?.data?.data || null);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const fetchEvents = useCallback(async () => {
    if (!teamId) return;
    setEventsLoading(true);
    try {
      const r = await getOutreachEvents({ limit: 200 });
      const all = r.data?.data || [];
      const teamEvents = all
        .filter((ev) => (ev.teams || []).some((t) => String(t._id || t) === String(teamId)))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setEvents(teamEvents);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
    fetchEvents();
  }, [fetchTeam, fetchEvents]);

  const handleDeleteConfirm = async () => {
    if (!team) return;
    setDeleting(true);
    try {
      await deleteOutreachTeam(team._id);
      toPage("outreach", backParams);
    } catch { } finally { setDeleting(false); }
  };

  if (!teamId) return (
    <div className="text-center py-20 text-gray-500">
      <p>No team selected.</p>
      <button onClick={() => toPage("outreach", backParams)} className="mt-4 text-blue-700 font-semibold hover:underline text-sm">← {backLabel}</button>
    </div>
  );

  if (loading) return (
    <div className="max-w-4xl space-y-4">
      <div className="h-5 w-32 rounded bg-gray-100 animate-pulse" />
      <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
      <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
    </div>
  );

  if (!team) return (
    <div className="text-center py-20 text-gray-500">
      <p>Team not found.</p>
      <button onClick={() => toPage("outreach", backParams)} className="mt-4 text-blue-700 font-semibold hover:underline text-sm">← {backLabel}</button>
    </div>
  );

  const members = team.members || [];
  const tabs = [
    { key: "members", label: "Members", count: members.length },
    { key: "outreach", label: "Outreach", count: events.length },
  ];

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <button onClick={() => toPage("outreach", backParams)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        {backLabel}
      </button>

      {/* Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-bold text-gray-900 text-xl md:text-2xl">{team.name}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TEAM_STATUS_STYLES[team.status] || "bg-gray-100 text-gray-500"}`}>
                  {team.status === "inactive" ? "Inactive" : "Active"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-gray-400">
                <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
                {team.dateCreated ? <span>Created {fmtDate(team.dateCreated)}</span> : null}
              </div>
              {team.description ? (
                <>
                  <hr className="my-2 border-gray-100" />
                  <p className="text-sm text-gray-600 leading-relaxed">{team.description}</p>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canWrite ? (
              <button onClick={() => toPage("outreach", { ...backParams, editTeamId: team._id })} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap">Edit</button>
            ) : null}
            {canDelete ? (
              <button onClick={() => setDeleteOpen(true)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${activeTab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
              {eventsLoading && t.key === "outreach" ? "…" : t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="mt-4">
        {/* ── Members tab ── */}
        {activeTab === "members" ? (
          members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-xs text-gray-400">
              No members in this team yet
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => {
                      const mem = typeof m.member === "object" ? m.member : null;
                      const name = mem ? `${mem.firstName} ${mem.lastName || ""}`.trim() : String(m.member);
                      const memberId = mem?._id || (typeof m.member === "string" ? m.member : null);
                      return (
                        <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={name} size="sm" />
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{name}</div>
                                {mem?.community || mem?.address ? (
                                  <div className="text-[11px] text-gray-400">{mem.community || mem.address}</div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell">{mem?.phoneNumber || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{mem?.email || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m.role === "team-leader" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                              {ROLE_LABELS[m.role] || m.role || "Volunteer"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {memberId ? (
                                <button
                                  onClick={() => toPage("member-details", { id: memberId, from: "team" }, { state: { from: "team", teamId, fromTab } })}
                                  className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                >
                                  View
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : null}

        {/* ── Outreach tab ── */}
        {activeTab === "outreach" ? (
          eventsLoading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}</div>
          ) : events.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400 rounded-xl border border-dashed border-gray-200">
              This team has not been assigned to any outreach events yet.
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Outreach</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Date</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Location</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr
                        key={ev._id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                        onClick={() => toPage("outreach-event-details", { id: ev._id, from: "teams" })}
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{ev.title}</div>
                          {ev.type ? <div className="text-[11px] text-gray-400 capitalize mt-0.5">{ev.type.replace(/-/g, " ")}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell whitespace-nowrap">
                          {fmtDate(ev.date)}{ev.endDate ? ` – ${fmtDate(ev.endDate)}` : ""}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{ev.location || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${EVENT_STATUS_STYLES[ev.status] || "bg-gray-100 text-gray-600"}`}>
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : null}
      </div>

      {/* Delete confirmation */}
      {deleteOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Delete "{team.name}"?</div>
            <p className="text-xs text-gray-400 mb-5">This will remove the team and all member assignments.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 h-10 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
