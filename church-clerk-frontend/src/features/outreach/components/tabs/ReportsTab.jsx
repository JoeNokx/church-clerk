import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getOutreachEvents, getAllProspects, getAllFollowUps, getOutreachTeams, getTeamStats,
} from "../../services/outreach.api.js";
import { getMembers } from "../../../member/services/member.api.js";

// ── Helpers ───────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_STYLES = {
  planned: "bg-blue-100 text-blue-700",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const STAGE_LABELS = {
  reached: "Reached", contacted: "Contacted", interested: "Interested",
  "visited-church": "Visited Church", connected: "Connected",
  "new-believer": "New Believer", member: "Member",
};

const FU_STATUS_LABELS = {
  pending: "Pending", contacted: "Contacted", "no-response": "No Response",
  rescheduled: "Rescheduled", completed: "Completed",
  "not-interested": "Not Interested", "connected-to-church": "Connected to Church",
};

const TYPE_LABELS = {
  "street-evangelism": "Street Evangelism", "house-to-house": "House-to-House",
  "crusade": "Crusade", "medical": "Medical Outreach",
  "community-service": "Community Service", "youth": "Youth Outreach",
  "prayer-walk": "Prayer Walk", "other": "Other",
};

const HOW_REACHED_LABELS = {
  street: "Street", "house-visit": "House Visit", referral: "Referral",
  online: "Online", phone: "Phone", event: "Event", other: "Other",
};

const DECISION_LABELS = {
  none: "None", firstTimeSalvation: "First-Time Salvation", rededication: "Rededication",
  baptismInterest: "Baptism Interest", churchVisit: "Church Visit",
};

// ── CSV Export ────────────────────────────────────────────────────
function exportCSV(filename, headers, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── UI atoms ──────────────────────────────────────────────────────
const INP = "h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:border-blue-500 bg-white";

function ReportSelector({ active, onChange }) {
  const reports = [
    { key: "events", label: "Outreach Events" },
    { key: "people", label: "People Reached" },
    { key: "followups", label: "Follow-Ups" },
    { key: "teams", label: "Team Participation" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {reports.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${active === r.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function SummaryRow({ items }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{it.label}</div>
          <div className="mt-0.5 font-bold text-gray-900 text-lg tabular-nums">{it.value}</div>
          {it.sub ? <div className="text-[10px] text-gray-400 mt-0.5">{it.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

function TableShell({ title, count, onExport, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-[11px] font-semibold">{count}</span>
        </div>
        {onExport ? (
          <button onClick={onExport} className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Export CSV
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function ReportsTab() {
  const [reportType, setReportType] = useState("events");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  const [events, setEvents] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [members, setMembers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      if (reportType === "events") {
        const res = await getOutreachEvents({ limit: 200, ...params });
        setEvents(res.data?.data || []);
      } else if (reportType === "people") {
        const res = await getAllProspects({ limit: 200, ...params });
        setProspects(res.data?.data || []);
      } else if (reportType === "followups") {
        const res = await getAllFollowUps({ limit: 200, ...params });
        setFollowUps(res.data?.data || []);
      } else if (reportType === "teams") {
        const [teamsRes, statsRes, membersRes] = await Promise.all([
          getOutreachTeams(),
          getTeamStats(),
          getMembers({ limit: 300 }),
        ]);
        setTeams(teamsRes.data?.data || []);
        setTeamStats(statsRes.data?.data || null);
        setMembers(membersRes.data?.members || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [reportType, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (dateFrom) list = list.filter((e) => new Date(e.date) >= new Date(dateFrom));
    if (dateTo) list = list.filter((e) => new Date(e.date) <= new Date(dateTo + "T23:59:59"));
    return list;
  }, [events, dateFrom, dateTo]);

  const filteredProspects = useMemo(() => {
    let list = prospects;
    if (dateFrom) list = list.filter((p) => new Date(p.createdAt) >= new Date(dateFrom));
    if (dateTo) list = list.filter((p) => new Date(p.createdAt) <= new Date(dateTo + "T23:59:59"));
    return list;
  }, [prospects, dateFrom, dateTo]);

  const filteredFollowUps = useMemo(() => {
    let list = followUps;
    if (dateFrom) list = list.filter((f) => new Date(f.scheduledDate) >= new Date(dateFrom));
    if (dateTo) list = list.filter((f) => new Date(f.scheduledDate) <= new Date(dateTo + "T23:59:59"));
    return list;
  }, [followUps, dateFrom, dateTo]);

  // ── Events report ──
  const eventsSummary = useMemo(() => {
    const total = filteredEvents.length;
    const completed = filteredEvents.filter((e) => e.status === "completed").length;
    const planned = filteredEvents.filter((e) => e.status === "planned").length;
    const ongoing = filteredEvents.filter((e) => e.status === "ongoing").length;
    const cancelled = filteredEvents.filter((e) => e.status === "cancelled").length;
    const totalReached = filteredEvents.reduce((sum, e) => sum + (e.prospectCount || 0), 0);
    const totalDecisions = filteredEvents.reduce((sum, e) => sum + (e.decisionCount || 0), 0);
    return { total, completed, planned, ongoing, cancelled, totalReached, totalDecisions };
  }, [filteredEvents]);

  const handleExportEvents = () => {
    const headers = ["Title", "Type", "Date", "End Date", "Location", "Status", "Prospects", "Decisions", "Coordinator"];
    const rows = filteredEvents.map((e) => [
      e.title, TYPE_LABELS[e.type] || e.type || "", fmtDate(e.date), e.endDate ? fmtDate(e.endDate) : "",
      e.location || "", e.status, e.prospectCount || 0, e.decisionCount || 0,
      e.coordinator ? (Array.isArray(e.coordinator) ? e.coordinator.map((c) => `${c.firstName} ${c.lastName}`).join("; ") : `${e.coordinator.firstName} ${e.coordinator.lastName}`) : "",
    ]);
    exportCSV(`outreach-events-report-${Date.now()}.csv`, headers, rows);
  };

  // ── People report ──
  const peopleSummary = useMemo(() => {
    const total = filteredProspects.length;
    const salvations = filteredProspects.filter((p) => p.acceptedChrist).length;
    const converted = filteredProspects.filter((p) => p.convertedToMember).length;
    const visitors = filteredProspects.filter((p) => p.markedAsVisitor).length;
    const interested = filteredProspects.filter((p) => p.stage === "interested" || p.stage === "visited-church").length;
    const connected = filteredProspects.filter((p) => p.stage === "connected" || p.stage === "member").length;
    return { total, salvations, converted, visitors, interested, connected };
  }, [filteredProspects]);

  const handleExportPeople = () => {
    const headers = ["First Name", "Last Name", "Phone", "Email", "Gender", "Age Group", "Community", "How Reached", "Stage", "Decision", "Accepted Christ", "Converted to Member", "Marked as Visitor", "Outreach Event", "Date Recorded"];
    const rows = filteredProspects.map((p) => [
      p.firstName, p.lastName || "", p.phone || "", p.email || "",
      p.gender || "", p.ageGroup || "", p.community || p.address || "",
      HOW_REACHED_LABELS[p.howReached] || p.howReached || "",
      STAGE_LABELS[p.stage] || p.stage || "",
      DECISION_LABELS[p.decision] || p.decision || "",
      p.acceptedChrist ? "Yes" : "No",
      p.convertedToMember ? "Yes" : "No",
      p.markedAsVisitor ? "Yes" : "No",
      p.outreachEvent?.title || "Personal / None",
      fmtDate(p.createdAt),
    ]);
    exportCSV(`people-reached-report-${Date.now()}.csv`, headers, rows);
  };

  // ── Follow-ups report ──
  const fuSummary = useMemo(() => {
    const total = filteredFollowUps.length;
    const completed = filteredFollowUps.filter((f) => f.status === "completed").length;
    const pending = filteredFollowUps.filter((f) => f.status === "pending").length;
    const contacted = filteredFollowUps.filter((f) => f.status === "contacted").length;
    const noResponse = filteredFollowUps.filter((f) => f.status === "no-response").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, contacted, noResponse, completionRate };
  }, [filteredFollowUps]);

  const handleExportFollowUps = () => {
    const headers = ["Prospect", "Phone", "Outreach Event", "Scheduled Date", "Type", "Status", "Assigned To", "Next Follow-Up", "Notes"];
    const rows = filteredFollowUps.map((f) => [
      `${f.prospect?.firstName || ""} ${f.prospect?.lastName || ""}`,
      f.prospect?.phone || "",
      f.outreachEvent?.title || "",
      fmtDate(f.scheduledDate),
      TYPE_LABELS[f.type] || f.type || "",
      FU_STATUS_LABELS[f.status] || f.status || "",
      f.assignedTo ? `${f.assignedTo.firstName} ${f.assignedTo.lastName}` : "",
      f.nextFollowUpDate ? fmtDate(f.nextFollowUpDate) : "",
      f.notes || "",
    ]);
    exportCSV(`follow-ups-report-${Date.now()}.csv`, headers, rows);
  };

  // ── Team participation report ──
  const teamParticipation = useMemo(() => {
    if (!teamStats) return [];
    const memberMap = Object.fromEntries(members.map((m) => [String(m._id), m]));
    return (teamStats.topParticipants || []).map((p) => {
      const m = memberMap[p.memberId];
      return {
        memberId: p.memberId,
        name: m ? `${m.firstName} ${m.lastName}` : "Unknown",
        phone: m?.phoneNumber || "",
        participationCount: p.count,
        events: p.events || [],
      };
    });
  }, [teamStats, members]);

  const teamSummary = useMemo(() => {
    const totalTeams = teams.length;
    const activeTeams = teams.filter((t) => t.status === "active").length;
    const totalMembers = teams.reduce((sum, t) => sum + (t.members?.length || 0), 0);
    const uniqueVolunteers = teamStats?.totalUniqueVolunteers || 0;
    const totalEventAssignments = teamParticipation.reduce((sum, p) => sum + p.participationCount, 0);
    return { totalTeams, activeTeams, totalMembers, uniqueVolunteers, totalEventAssignments };
  }, [teams, teamStats, teamParticipation]);

  const handleExportTeams = () => {
    const headers = ["Member Name", "Phone", "Outreach Participations", "Events"];
    const rows = teamParticipation.map((p) => [
      p.name, p.phone, p.participationCount,
      p.events.map((e) => `${e.title} (${fmtDate(e.date)})`).join("; "),
    ]);
    exportCSV(`team-participation-report-${Date.now()}.csv`, headers, rows);
  };

  return (
    <div className="mt-6 space-y-5">
      {/* Report type selector */}
      <ReportSelector active={reportType} onChange={setReportType} />

      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={INP} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={INP} />
        </div>
        {(dateFrom || dateTo) ? (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50">Clear</button>
        ) : null}
        <div className="ml-auto text-xs text-gray-400">
          {dateFrom || dateTo ? `Filtered: ${dateFrom || "…"} → ${dateTo || "…"}` : "All dates"}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[0,1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />)}</div>
          <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : (
        <>
          {/* ── Events Report ── */}
          {reportType === "events" ? (
            <>
              <SummaryRow items={[
                { label: "Total Outreaches", value: eventsSummary.total },
                { label: "Completed", value: eventsSummary.completed },
                { label: "Planned", value: eventsSummary.planned },
                { label: "Ongoing", value: eventsSummary.ongoing },
                { label: "People Reached", value: eventsSummary.totalReached },
                { label: "Decisions", value: eventsSummary.totalDecisions },
              ]} />
              <TableShell title="Outreach Events" count={filteredEvents.length} onExport={handleExportEvents}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Location</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right">Reached</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right hidden lg:table-cell">Decisions</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Coordinator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No outreach events in this range</td></tr>
                      ) : filteredEvents.map((e) => (
                        <tr key={e._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 truncate max-w-[16rem]">{e.title}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell">{TYPE_LABELS[e.type] || e.type?.replace(/-/g, " ") || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(e.date)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell truncate max-w-[12rem]">{e.location || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[e.status] || "bg-gray-100 text-gray-600"}`}>{e.status}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800 text-right tabular-nums">{e.prospectCount || 0}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-700 text-right tabular-nums hidden lg:table-cell">{e.decisionCount || 0}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden xl:table-cell truncate max-w-[12rem]">
                            {e.coordinator ? (Array.isArray(e.coordinator) ? e.coordinator.map((c) => `${c.firstName} ${c.lastName}`).join(", ") : `${e.coordinator.firstName} ${e.coordinator.lastName}`) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableShell>
            </>
          ) : null}

          {/* ── People Reached Report ── */}
          {reportType === "people" ? (
            <>
              <SummaryRow items={[
                { label: "Total People", value: peopleSummary.total },
                { label: "Salvations", value: peopleSummary.salvations },
                { label: "Converted to Member", value: peopleSummary.converted },
                { label: "Marked as Visitor", value: peopleSummary.visitors },
                { label: "Interested / Visited", value: peopleSummary.interested },
                { label: "Connected / Member", value: peopleSummary.connected },
              ]} />
              <TableShell title="People Reached" count={filteredProspects.length} onExport={handleExportPeople}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Community</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">How Reached</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Outreach</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Recorded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProspects.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No people recorded in this range</td></tr>
                      ) : filteredProspects.map((p) => (
                        <tr key={p._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">{p.firstName} {p.lastName}</div>
                            {p.acceptedChrist ? <span className="text-[10px] font-bold text-green-600">✓ Saved</span> : null}
                            {p.convertedToMember ? <span className="ml-1 text-[10px] font-bold text-emerald-600">Member</span> : null}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell whitespace-nowrap">{p.phone || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell truncate max-w-[10rem]">{p.community || p.address || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[11px] font-semibold">
                              {STAGE_LABELS[p.stage] || p.stage || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">{HOW_REACHED_LABELS[p.howReached] || p.howReached || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell truncate max-w-[12rem]">{p.outreachEvent?.title || "Personal"}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableShell>
            </>
          ) : null}

          {/* ── Follow-Ups Report ── */}
          {reportType === "followups" ? (
            <>
              <SummaryRow items={[
                { label: "Total Follow-Ups", value: fuSummary.total },
                { label: "Completed", value: fuSummary.completed },
                { label: "Pending", value: fuSummary.pending },
                { label: "Contacted", value: fuSummary.contacted },
                { label: "No Response", value: fuSummary.noResponse },
                { label: "Completion Rate", value: `${fuSummary.completionRate}%` },
              ]} />
              <TableShell title="Follow-Ups" count={filteredFollowUps.length} onExport={handleExportFollowUps}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Prospect</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Scheduled</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Type</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Assigned To</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Outreach</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Next Follow-Up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFollowUps.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No follow-ups in this range</td></tr>
                      ) : filteredFollowUps.map((f) => (
                        <tr key={f._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {f.prospect?.firstName} {f.prospect?.lastName || ""}
                            {f.prospect?.phone ? <div className="text-[11px] text-gray-400 font-normal">{f.prospect.phone}</div> : null}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell whitespace-nowrap">{fmtDate(f.scheduledDate)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${f.status === "completed" ? "bg-green-100 text-green-700" : f.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                              {FU_STATUS_LABELS[f.status] || f.status || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{TYPE_LABELS[f.type] || f.type || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{f.assignedTo ? `${f.assignedTo.firstName} ${f.assignedTo.lastName}` : "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell truncate max-w-[12rem]">{f.outreachEvent?.title || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell whitespace-nowrap">{f.nextFollowUpDate ? fmtDate(f.nextFollowUpDate) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableShell>
            </>
          ) : null}

          {/* ── Team Participation Report ── */}
          {reportType === "teams" ? (
            <>
              <SummaryRow items={[
                { label: "Total Teams", value: teamSummary.totalTeams },
                { label: "Active Teams", value: teamSummary.activeTeams },
                { label: "Total Members", value: teamSummary.totalMembers },
                { label: "Unique Volunteers", value: teamSummary.uniqueVolunteers },
                { label: "Event Assignments", value: teamSummary.totalEventAssignments },
              ]} />
              <TableShell title="Top Participating Members" count={teamParticipation.length} onExport={handleExportTeams}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">#</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right">Participations</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Outreaches Attended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamParticipation.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No team participation data yet</td></tr>
                      ) : teamParticipation.map((p, i) => (
                        <tr key={p.memberId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs font-semibold text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{p.name}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell">{p.phone || "—"}</td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-700 text-right tabular-nums">{p.participationCount}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                            <div className="space-y-0.5 max-w-[20rem]">
                              {p.events.slice(0, 3).map((e) => (
                                <div key={e.id} className="truncate">
                                  <span className="text-gray-700">{e.title}</span>
                                  <span className="text-gray-400 ml-1">({fmtDate(e.date)})</span>
                                </div>
                              ))}
                              {p.events.length > 3 ? <div className="text-[10px] text-gray-400">+{p.events.length - 3} more</div> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableShell>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
