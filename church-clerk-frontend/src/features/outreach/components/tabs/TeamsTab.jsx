import { useCallback, useContext, useEffect, useRef, useState } from "react";
import PermissionContext from "../../../permissions/permission.store.js";
import { getOutreachTeams, createOutreachTeam, updateOutreachTeam, deleteOutreachTeam, getOutreachEvents } from "../../services/outreach.api.js";
import { getMembers } from "../../../member/services/member.api.js";
import EmptyState from "../../../../shared/components/EmptyState/index.jsx";

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
const INP = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500";
const LBL = "block text-xs font-semibold text-gray-500 mb-1";

const STATUS_STYLES = {
  planned: "bg-blue-100 text-blue-700",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ── Initials Avatar ───────────────────────────────────────────────
function Avatar({ name, size = "md" }) {
  const parts = (name || "?").split(" ");
  const init = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div className={`${sz} rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0`}>
      {init.toUpperCase() || "?"}
    </div>
  );
}

// ── Searchable member combobox ────────────────────────────────────
function MemberSearchSelect({ allMembers, onSelect }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = search
    ? allMembers.filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) || m.phoneNumber?.includes(search))
    : allMembers;

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const select = (m) => {
    onSelect(m._id);
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex-1">
      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search member to add…"
        className={INP}
        autoComplete="off"
      />
      {open && filtered.length > 0 ? (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m._id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(m)}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100"
            >
              <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
              <div>
                <div className="text-sm font-semibold text-gray-800">{m.firstName} {m.lastName}</div>
                {m.phoneNumber ? <div className="text-[11px] text-gray-400">{m.phoneNumber}</div> : null}
              </div>
            </button>
          ))}
        </div>
      ) : open && search ? (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg px-3 py-2 text-sm text-gray-400">
          No members match
        </div>
      ) : null}
    </div>
  );
}

// ── Team Form Modal ───────────────────────────────────────────────
function TeamFormModal({ open, mode, initialData, allMembers, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState([]); // [{member: id, role}]
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setMembers(
        (initialData.members || []).map((m) => ({
          member: typeof m.member === "object" ? m.member._id : m.member,
          role: m.role || "volunteer",
        }))
      );
    } else {
      setName(""); setDescription(""); setMembers([]);
    }
    setError("");
  }, [open, mode, initialData]);

  const addMember = (id) => {
    if (!id || members.some((m) => m.member === id)) return;
    setMembers((prev) => [...prev, { member: id, role: "volunteer" }]);
  };

  const removeMember = (id) => setMembers((prev) => prev.filter((m) => m.member !== id));
  const setRole = (id, role) => setMembers((prev) => prev.map((m) => m.member === id ? { ...m, role } : m));

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Team name is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = { name: name.trim(), description: description.trim(), members };
      if (mode === "edit") await updateOutreachTeam(initialData._id, payload);
      else await createOutreachTeam(payload);
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally { setSaving(false); }
  };

  if (!open) return null;
  const available = allMembers.filter((m) => !members.some((x) => x.member === m._id));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">{mode === "edit" ? "Edit Outreach Team" : "New Outreach Team"}</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={LBL}>Team Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Street Evangelism A-Team" className={INP} />
          </div>
          <div>
            <label className={LBL}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief description of this team" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div>
            <label className={LBL}>Add Member</label>
            <MemberSearchSelect allMembers={available} onSelect={addMember} />
            {available.length === 0 && allMembers.length > 0 ? (
              <p className="mt-1 text-[11px] text-gray-400">All active members have been added.</p>
            ) : null}
          </div>
          {members.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Team Members ({members.length})</div>
              {members.map(({ member, role }) => {
                const m = allMembers.find((x) => x._id === member);
                return (
                  <div key={member} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <Avatar name={m ? `${m.firstName} ${m.lastName}` : "?"} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{m ? `${m.firstName} ${m.lastName}` : member}</div>
                      {m?.phoneNumber ? <div className="text-[11px] text-gray-400">{m.phoneNumber}</div> : null}
                    </div>
                    <select value={role} onChange={(e) => setRole(member, e.target.value)} className="h-8 rounded-lg border border-gray-200 px-2 text-xs text-gray-700 bg-white focus:outline-none focus:border-blue-500">
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <button type="button" onClick={() => removeMember(member)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-400 hover:bg-red-50 shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic text-center py-4 rounded-xl border border-dashed border-gray-200">No members added yet</div>
          )}
          {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 shrink-0">
          <button onClick={onClose} className="h-11 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="h-11 rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Team"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Team Card ─────────────────────────────────────────────────────
function TeamCard({ team, onEdit, onDelete, onViewDetails, canWrite, canDelete }) {
  const memberCount = team.members?.length || 0;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{team.name}</div>
            {team.description ? <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{team.description}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canWrite ? (
            <button onClick={() => onEdit(team)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          ) : null}
          {canDelete ? (
            <button onClick={() => onDelete(team)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[11px] font-semibold">
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /></svg>
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
        <button
          onClick={() => onViewDetails(team)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
        >
          View Details
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}

// ── Team Detail Modal ─────────────────────────────────────────────
function TeamDetailModal({ team, open, onClose }) {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState("upcoming");

  useEffect(() => {
    if (!open || !team) return;
    setHistoryTab("upcoming");
    setEventsLoading(true);
    getOutreachEvents({ limit: 200 })
      .then((r) => {
        const all = r.data?.data || [];
        // Filter events where this team is listed
        const teamEvents = all.filter((ev) =>
          (ev.teams || []).some((t) => String(t._id || t) === String(team._id))
        );
        setEvents(teamEvents);
      })
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [open, team]);

  if (!open || !team) return null;

  const members = team.members || [];

  const upcoming = events.filter((e) => e.status === "planned");
  const ongoing = events.filter((e) => e.status === "ongoing");
  const past = events.filter((e) => e.status === "completed" || e.status === "cancelled");

  const historyGroups = { upcoming, ongoing, past };
  const historyTabs = [
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "ongoing", label: "Ongoing", count: ongoing.length },
    { key: "past", label: "Past", count: past.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[93vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 text-base truncate">{team.name}</div>
              {team.description ? <div className="text-xs text-gray-400 mt-0.5 truncate">{team.description}</div> : null}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0 ml-3">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Members Section */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Members
                <span className="ml-2 rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[11px] font-semibold">{members.length}</span>
              </h3>
            </div>
            {members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">No members in this team yet</div>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => {
                      const mem = typeof m.member === "object" ? m.member : null;
                      const name = mem ? `${mem.firstName} ${mem.lastName || ""}` : String(m.member);
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
                          <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell">
                            {mem?.phoneNumber || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                            {mem?.email || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m.role === "team-leader" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                              {ROLE_LABELS[m.role] || m.role || "Volunteer"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Outreach History Section */}
          <div className="px-5 pb-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Outreach History</h3>
            {/* History tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-4">
              {historyTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setHistoryTab(t.key)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${historyTab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  {t.label}
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${historyTab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {eventsLoading ? (
              <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}</div>
            ) : historyGroups[historyTab].length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No {historyTab} outreach events for this team.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Outreach</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Date</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Location</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyGroups[historyTab].map((ev) => (
                      <tr key={ev._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{ev.title}</div>
                          {ev.type ? <div className="text-[11px] text-gray-400 capitalize mt-0.5">{ev.type.replace(/-/g, " ")}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell whitespace-nowrap">
                          {fmtDate(ev.date)}{ev.endDate ? ` – ${fmtDate(ev.endDate)}` : ""}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{ev.location || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[ev.status] || "bg-gray-100 text-gray-600"}`}>
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────
export default function TeamsTab() {
  const { can } = useContext(PermissionContext) || {};
  const canCreate = typeof can === "function" ? can("outreach", "create") : false;
  const canWrite = typeof can === "function" ? can("outreach", "update") : false;
  const canDelete = typeof can === "function" ? can("outreach", "delete") : false;

  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingTeam, setEditingTeam] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTeam, setDetailTeam] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOutreachTeams();
      setTeams(res.data?.data || []);
    } catch { setTeams([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    getMembers({ limit: 200, status: "active" }).then((r) => setMembers(r.data?.members || [])).catch(() => {});
  }, [load]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteOutreachTeam(deleteTarget._id); setDeleteTarget(null); load(); }
    catch { } finally { setDeleting(false); }
  };

  const filtered = teams.filter((t) => !search || t.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams…"
          className="h-9 flex-1 min-w-44 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
        />
        {canCreate ? (
          <button onClick={() => { setEditingTeam(null); setFormMode("create"); setFormOpen(true); }} className="h-9 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Create Team
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration={search ? "search" : "teams"}
          title={search ? "No teams found" : "No outreach teams yet"}
          description={search
            ? "We couldn't find any teams matching your search."
            : "Create a team and add members to it."}
          actionLabel={search ? "Clear Search" : (canCreate ? "Create Team" : null)}
          onAction={search ? () => setSearch("") : (canCreate ? () => { setEditingTeam(null); setFormMode("create"); setFormOpen(true); } : undefined)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((team) => (
            <TeamCard
              key={team._id}
              team={team}
              onEdit={(t) => { setEditingTeam(t); setFormMode("edit"); setFormOpen(true); }}
              onDelete={(t) => setDeleteTarget(t)}
              onViewDetails={(t) => setDetailTeam(t)}
              canWrite={canWrite}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      <TeamFormModal
        open={formOpen} mode={formMode} initialData={editingTeam} allMembers={members}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(); }}
      />

      <TeamDetailModal
        team={detailTeam}
        open={!!detailTeam}
        onClose={() => setDetailTeam(null)}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Delete "{deleteTarget.name}"?</div>
            <p className="text-xs text-gray-400 mb-5">This will remove the team and all member assignments.</p>
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
