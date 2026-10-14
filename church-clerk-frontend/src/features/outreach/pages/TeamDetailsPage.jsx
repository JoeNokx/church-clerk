import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import BackButton from "../../../shared/components/BackButton/index.jsx";
import {
  getOutreachTeamById,
  getOutreachEvents,
  updateOutreachTeam,
} from "../services/outreach.api.js";
import { MemberSearchSelect } from "../components/tabs/TeamsTab.jsx";
import { getMembers } from "../../member/services/member.api.js";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

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

const SEL = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-white";
const LBL = "block text-xs font-semibold text-gray-500 mb-1";

// ── Add Member Modal ──────────────────────────────────────────────
function AddMemberModal({ open, team, allMembers, onClose, onSaved }) {
  const [picked, setPicked] = useState(null);
  const [role, setRole] = useState("volunteer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPicked(null); setRole("volunteer"); setError("");
  }, [open]);

  if (!open || !team) return null;

  const existing = new Set((team.members || []).map((m) => String(m.member?._id || m.member)));
  const available = allMembers.filter((m) => !existing.has(String(m._id)));

  const save = async () => {
    if (!picked) { setError("Pick a member to add."); return; }
    setSaving(true); setError("");
    try {
      const members = (team.members || []).map((m) => ({ member: m.member?._id || m.member, role: m.role || "volunteer" }));
      members.push({ member: picked._id, role });
      const res = await updateOutreachTeam(team._id, { members });
      onSaved?.(res?.data?.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Something went wrong.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900 text-base">Add Member to {team.name}</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={LBL}>Member <span className="text-red-500">*</span></label>
            {picked ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2">
                <Avatar name={`${picked.firstName} ${picked.lastName}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{picked.firstName} {picked.lastName}</div>
                  {picked.phoneNumber ? <div className="text-[11px] text-gray-400">{picked.phoneNumber}</div> : null}
                </div>
                <button type="button" onClick={() => setPicked(null)} className="text-xs font-semibold text-blue-700 hover:underline shrink-0">Change</button>
              </div>
            ) : (
              <>
                <MemberSearchSelect allMembers={available} onSelect={(id) => setPicked(available.find((m) => String(m._id) === String(id)) || null)} />
                {available.length === 0 && allMembers.length > 0 ? (
                  <p className="mt-1 text-[11px] text-gray-400">All active members are already in this team.</p>
                ) : null}
              </>
            )}
          </div>
          <div>
            <label className={LBL}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={SEL}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button onClick={onClose} className="h-10 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !picked} className="h-10 rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Adding…" : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamDetailsPage() {
  const guarded = useGuardedAction();
  const { can } = useContext(PermissionContext) || {};
  const canWrite = typeof can === "function" ? can("outreach", "update") : false;

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
  const [allMembers, setAllMembers] = useState([]);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [outreachPage, setOutreachPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
    getMembers({ limit: 200, status: "active" }).then((r) => setAllMembers(r.data?.members || [])).catch(() => {});
  }, [fetchTeam, fetchEvents]);

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

  const membersTotalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const paginatedMembers = filteredMembers.slice((membersPage - 1) * pageSize, membersPage * pageSize);

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

  const outreachTotalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = filteredEvents.slice((outreachPage - 1) * pageSize, outreachPage * pageSize);

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
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
                {canWrite ? (
                  <button
                    onClick={() => guarded(() => setAddMemberOpen(true))}
                    className="h-9 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 shrink-0"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    Add Member
                  </button>
                ) : null}
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
                          <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={name}>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={name} size="sm" />
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  <span className="sm:hidden">{truncateMobileName(name)}</span>
                                  <span className="hidden sm:inline">{truncateDesktopName(name)}</span>
                                </div>
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
            <Pagination
              pagination={{
                currentPage: membersPage,
                totalPages: membersTotalPages,
                totalResult: filteredMembers.length,
                prevPage: membersPage > 1 ? membersPage - 1 : null,
                nextPage: membersPage < membersTotalPages ? membersPage + 1 : null
              }}
              rowsCount={paginatedMembers.length}
              limit={pageSize}
              onLimitChange={(n) => { setPageSize(n); setMembersPage(1); setOutreachPage(1); }}
              onPageChange={setMembersPage}
              itemName="members"
              filtered={Boolean(String(memberSearch || "").trim())}
            />
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
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Outreach Date</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Location</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedEvents.map((ev) => (
                      <tr
                        key={ev._id}
                        className="max-md:text-xs text-gray-700 text-sm cursor-pointer"
                        onClick={() => toPage("outreach-event-details", { id: ev._id, from: "teams" })}
                      >
                        <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={ev.title}>
                          <div className="text-sm font-semibold text-gray-900">
                            <span className="sm:hidden">{truncateMobileName(ev.title)}</span>
                            <span className="hidden sm:inline">{truncateDesktopName(ev.title)}</span>
                          </div>
                          {ev.type ? <div className="text-[11px] text-gray-400 capitalize mt-0.5">{ev.type.replace(/-/g, " ")}</div> : null}
                        </td>
                        <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                          {fmtDate(ev.date)}{ev.endDate ? ` – ${fmtDate(ev.endDate)}` : ""}
                        </td>
                        <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={ev.location || "Not Specified"}><span className="sm:hidden">{truncateMobileName(ev.location || "Not Specified")}</span><span className="hidden sm:inline">{truncateDesktopName(ev.location || "Not Specified")}</span></td>
                        <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${EVENT_STATUS_STYLES[ev.status] || "bg-gray-100 text-gray-600"}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6" onClick={(e) => e.stopPropagation()}>
                          <TableKebabMenu items={[
                            { label: "View", onClick: () => toPage("outreach-event-details", { id: ev._id, from: "teams" }) }
                          ]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              pagination={{
                currentPage: outreachPage,
                totalPages: outreachTotalPages,
                totalResult: filteredEvents.length,
                prevPage: outreachPage > 1 ? outreachPage - 1 : null,
                nextPage: outreachPage < outreachTotalPages ? outreachPage + 1 : null
              }}
              rowsCount={paginatedEvents.length}
              limit={pageSize}
              onLimitChange={(n) => { setPageSize(n); setMembersPage(1); setOutreachPage(1); }}
              onPageChange={setOutreachPage}
              itemName="outreaches"
              filtered={Boolean(String(eventSearch || "").trim() || eventDateFrom || eventDateTo)}
            />
          </div>
        ) : null}
      </div>

      <AddMemberModal
        open={addMemberOpen}
        team={team}
        allMembers={allMembers}
        onClose={() => setAddMemberOpen(false)}
        onSaved={(updated) => { setAddMemberOpen(false); if (updated) setTeam(updated); else fetchTeam(); }}
      />
    </div>
  );
}
