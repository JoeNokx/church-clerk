import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import BackButton from "../../../shared/components/BackButton/index.jsx";
import {
  getOutreachTeamById,
  getOutreachEvents,
  updateOutreachTeam,
  deleteOutreachTeam,
} from "../services/outreach.api.js";
import { getMembers } from "../../member/services/member.api.js";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";

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
  if (!v) return "Not Specified";
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
  const [memberSearch, setMemberSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [eventDateFrom, setEventDateFrom] = useState("");
  const [eventDateTo, setEventDateTo] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [outreachPage, setOutreachPage] = useState(1);

  const PAGE_SIZE = 10;

  const backParams = useMemo(() => {
    const params = {};
    if (fromTab === "overview") params.defaultTab = "overview";
    else if (fromTab === "outreaches") params.defaultTab = "outreaches";
    else params.defaultTab = "teams";
    return params;
  }, [fromTab]);

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

  const members = team?.members || [];
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m) => {
      const mem = typeof m.member === "object" ? m.member : null;
      const name = mem ? `${mem.firstName} ${mem.lastName || ""}`.trim() : String(m.member);
      return name.toLowerCase().includes(q) || (mem?.phoneNumber || "").toLowerCase().includes(q) || (mem?.email || "").toLowerCase().includes(q);
    });
  }, [members, memberSearch]);

  const membersTotalPages = Math.ceil(filteredMembers.length / PAGE_SIZE);
  const paginatedMembers = filteredMembers.slice((membersPage - 1) * PAGE_SIZE, membersPage * PAGE_SIZE);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (eventSearch.trim()) {
      const q = eventSearch.toLowerCase();
      list = list.filter((ev) => (ev.title || "").toLowerCase().includes(q) || (ev.location || "").toLowerCase().includes(q) || (ev.type || "").toLowerCase().includes(q));
    }
    if (eventDateFrom || eventDateTo) {
      list = list.filter((ev) => {
        const d = (ev.date || "").slice(0, 10);
        if (!d) return false;
        if (eventDateFrom && d < eventDateFrom) return false;
        if (eventDateTo && d > eventDateTo) return false;
        return true;
      });
    }
    return list;
  }, [events, eventSearch, eventDateFrom, eventDateTo]);

  const outreachTotalPages = Math.ceil(filteredEvents.length / PAGE_SIZE);
  const paginatedEvents = filteredEvents.slice((outreachPage - 1) * PAGE_SIZE, outreachPage * PAGE_SIZE);

  if (!teamId) return (
    <div className="text-center py-20 text-gray-500">
      <p>No team selected.</p>
      <BackButton onClick={() => toPage("outreach", backParams)} className="mt-4 mb-0" />
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
      <BackButton onClick={() => toPage("outreach", backParams)} className="mt-4 mb-0" />
    </div>
  );

  const tabs = [
    { key: "members", label: "Members", count: members.length },
    { key: "outreach", label: "Outreach", count: events.length },
  ];

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <BackButton onClick={() => toPage("outreach", backParams)} />

      {/* Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        {/* Name + actions row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-gray-900 text-xl md:text-2xl truncate">{team.name}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${TEAM_STATUS_STYLES[team.status] || "bg-gray-100 text-gray-500"}`}>
                  {team.status === "inactive" ? "Inactive" : "Active"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-gray-400">
                <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
                {team.dateCreated ? <span>Created {fmtDate(team.dateCreated)}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canWrite ? (
              <button onClick={() => toPage("outreach", { ...backParams, editTeamId: team._id })} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap">Edit</button>
            ) : null}
            {canDelete ? (
              <button onClick={() => setDeleteOpen(true)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-red-600 hover:bg-red-50 whitespace-nowrap">Delete</button>
            ) : null}
          </div>
        </div>
        {/* Description below */}
        {team.description ? (
          <>
            <hr className="my-3 border-gray-100" />
            <p className="text-sm text-gray-600 leading-relaxed">{team.description}</p>
          </>
        ) : null}
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
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Members</div>
                <div className="text-gray-500 text-xs">All members in this team</div>
              </div>
              <FilterBar
                searchValue={memberSearch}
                onSearchChange={(v) => { setMemberSearch(v); setMembersPage(1); }}
                searchPlaceholder="Search members…"
              />
              <MobileFilterBar
                searchValue={memberSearch}
                onSearchChange={(v) => { setMemberSearch(v); setMembersPage(1); }}
                searchPlaceholder="Search members…"
              />
            </div>
            {filteredMembers.length === 0 ? (
              <div className="p-4 md:p-6 lg:p-8">
                <EmptyState
                  compact
                  illustration={memberSearch ? "search" : "members"}
                  title={memberSearch ? "No members found" : "No members yet"}
                  description={memberSearch ? "We couldn't find any members matching your search." : "Add members to this team to get started."}
                  actionLabel={memberSearch ? "Clear Search" : null}
                  onAction={memberSearch ? () => { setMemberSearch(""); setMembersPage(1); } : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Member</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Phone</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Email</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Role</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedMembers.map((m, i) => {
                      const mem = typeof m.member === "object" ? m.member : null;
                      const name = mem ? `${mem.firstName} ${mem.lastName || ""}`.trim() : String(m.member);
                      const memberId = mem?._id || (typeof m.member === "string" ? m.member : null);
                      return (
                        <tr key={i} className="max-md:text-xs text-gray-700 text-sm">
                          <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">
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
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{mem?.phoneNumber || "Not Specified"}</td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{mem?.email || "Not Specified"}</td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m.role === "team-leader" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                              {ROLE_LABELS[m.role] || m.role || "Volunteer"}
                            </span>
                          </td>
                          <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                            <TableKebabMenu items={[
                              memberId && { label: "View", onClick: () => toPage("member-details", { id: memberId, from: "team" }, { state: { from: "team", teamId, fromTab } }) }
                            ]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3">
              <button
                type="button"
                onClick={() => setMembersPage(p => p - 1)}
                disabled={membersPage <= 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Prev
              </button>
              <div className="text-gray-600 text-sm">Page {membersPage}</div>
              <button
                type="button"
                onClick={() => setMembersPage(p => p + 1)}
                disabled={membersPage >= membersTotalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Outreach tab ── */}
        {activeTab === "outreach" ? (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Outreach Events</div>
                <div className="text-gray-500 text-xs">All outreaches assigned to this team</div>
              </div>
              <FilterBar
                searchValue={eventSearch}
                onSearchChange={(v) => { setEventSearch(v); setOutreachPage(1); }}
                searchPlaceholder="Search outreaches…"
                dateFrom={eventDateFrom}
                dateTo={eventDateTo}
                onDateApply={(from, to) => { setEventDateFrom(from); setEventDateTo(to); setOutreachPage(1); }}
              />
              <MobileFilterBar
                searchValue={eventSearch}
                onSearchChange={(v) => { setEventSearch(v); setOutreachPage(1); }}
                searchPlaceholder="Search outreaches…"
                dateFrom={eventDateFrom}
                dateTo={eventDateTo}
                onDateApply={(from, to) => { setEventDateFrom(from); setEventDateTo(to); setOutreachPage(1); }}
              />
            </div>
            {eventsLoading ? (
              <div className="space-y-2 p-4 md:p-6 lg:p-8">{[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}</div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-4 md:p-6 lg:p-8">
                <EmptyState
                  compact
                  illustration={eventSearch || eventDateFrom || eventDateTo ? "search" : "events"}
                  title={eventSearch || eventDateFrom || eventDateTo ? "No outreaches found" : "No outreaches assigned"}
                  description={eventSearch || eventDateFrom || eventDateTo ? "We couldn't find any outreaches matching your filters." : "This team has not been assigned to any outreach events yet."}
                  actionLabel={eventSearch || eventDateFrom || eventDateTo ? "Clear Filters" : null}
                  onAction={eventSearch || eventDateFrom || eventDateTo ? () => { setEventSearch(""); setEventDateFrom(""); setEventDateTo(""); setOutreachPage(1); } : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Outreach</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Location</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedEvents.map((ev) => (
                      <tr
                        key={ev._id}
                        className="max-md:text-xs text-gray-700 text-sm cursor-pointer"
                        onClick={() => toPage("outreach-event-details", { id: ev._id, from: "teams" })}
                      >
                        <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">
                          <div className="text-sm font-semibold text-gray-900">{ev.title}</div>
                          {ev.type ? <div className="text-[11px] text-gray-400 capitalize mt-0.5">{ev.type.replace(/-/g, " ")}</div> : null}
                        </td>
                        <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                          {fmtDate(ev.date)}{ev.endDate ? ` – ${fmtDate(ev.endDate)}` : ""}
                        </td>
                        <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{ev.location || "Not Specified"}</td>
                        <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${EVENT_STATUS_STYLES[ev.status] || "bg-gray-100 text-gray-600"}`}>
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3">
              <button
                type="button"
                onClick={() => setOutreachPage(p => p - 1)}
                disabled={outreachPage <= 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Prev
              </button>
              <div className="text-gray-600 text-sm">Page {outreachPage}</div>
              <button
                type="button"
                onClick={() => setOutreachPage(p => p + 1)}
                disabled={outreachPage >= outreachTotalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
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
