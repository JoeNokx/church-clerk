// services/attendanceAbsenceService.js
// Per-service attendance streaks and the member status automation built on
// them (absent streak >= 10 -> dormant, present streak >= 3 -> active again).
//
// Streaks only move on explicit marks: a session where the member was marked
// absent grows the absent streak and breaks the present streak, a session
// where they were marked present does the opposite, and a session where they
// weren't marked at all is skipped entirely (marking is often partial — an
// unmarked member shouldn't gain or lose streak because of it).
// Sessions with no marks at all are skipped too (attendance was never taken).
//
// Manual override: when a user sets a member's status to something that
// contradicts the automation's current verdict, `attendanceStatusOverride`
// is armed on the member (see updateMember). While armed, the automation
// leaves the member alone; once the streak that justified the override is
// gone (they attend after being reactivated, or miss after being manually
// dormant-ed), the flag is released and the rules apply normally again.
import ServiceIndividualAttendance from "../models/serviceIndividualAttendanceModel.js";
import Member from "../models/memberModel.js";

export const ATTENDANCE_MEMBER_STATUSES = ["active", "dormant", "temporarily_away"];
export const ABSENT_DORMANT_THRESHOLD = 10;
export const PRESENT_ACTIVE_THRESHOLD = 3;

// Streaks beyond this window can't matter for the thresholds in play and
// keep the sweep bounded for churches with long histories.
const SESSION_WINDOW = 600;

const toIdSet = (arr) => new Set((Array.isArray(arr) ? arr : []).map((x) => String(x)));

/**
 * Load the church's recent sessions newest-first as normalized mark sets.
 * A session with nobody marked present or absent hasn't been taken yet —
 * it must not count as a miss for anyone, so it's filtered out.
 */
const loadSessionMarks = async (churchId, { serviceType = "", year = "", month = "" } = {}) => {
  const query = { church: churchId };
  if (serviceType) query.serviceType = serviceType;
  // Period filter — restrict the streak window to services dated within a
  // month of a year (month alone means the whole year).
  const y = parseInt(year, 10);
  const mo = parseInt(month, 10);
  if (y >= 2000 && y <= 2100) {
    const from = mo >= 1 && mo <= 12 ? mo - 1 : 0;
    const to = mo >= 1 && mo <= 12 ? mo : 12;
    query.date = { $gte: new Date(Date.UTC(y, from, 1)), $lt: new Date(Date.UTC(y, to, 1)) };
  }
  // Consecutive = service date order: the service that happened later is
  // the later one, regardless of when its record was created.
  const docs = await ServiceIndividualAttendance.find(query)
    .select("date serviceType presentMembers absentMembers")
    .sort({ date: -1, createdAt: -1 })
    .limit(SESSION_WINDOW)
    .lean();
  return docs
    .map((s) => ({ date: s.date, serviceType: s.serviceType, present: toIdSet(s.presentMembers), absent: toIdSet(s.absentMembers) }))
    .filter((s) => s.present.size > 0 || s.absent.size > 0);
};

/**
 * Walk sessions newest -> oldest per member and count:
 *   absentStreak  — consecutive most-recent sessions not attended
 *   presentStreak — consecutive most-recent sessions attended
 *   lastAttended  — date of the most recent attended session
 */
const computeMemberStreaks = (sessions, members) => {
  const result = new Map();
  for (const m of members) {
    const id = String(m._id);
    let absentStreak = 0;
    let presentStreak = 0;
    let lastAttended = null;
    let absentBroken = false;
    let presentBroken = false;
    for (const s of sessions) {
      if (s.present.has(id)) {
        if (!presentBroken) presentStreak += 1;
        absentBroken = true;
        if (!lastAttended) lastAttended = s.date;
      } else if (s.absent.has(id)) {
        if (!absentBroken) absentStreak += 1;
        presentBroken = true;
      }
      // unmarked sessions are skipped — they neither count nor break a streak
      if (absentBroken && presentBroken) break;
    }
    result.set(id, { absentStreak, presentStreak, lastAttended });
  }
  return result;
};

/**
 * The auto-transition a manual status set would contradict, if any.
 * Returns "dormant" (automation would dormant an active member with a
 * long absent streak), "active" (automation would reactivate a dormant
 * member on a present streak), or null when the manual choice agrees
 * with the automation and no override is needed.
 */
export const getAttendanceOverrideBlock = async (churchId, memberId, newStatus) => {
  if (newStatus !== "active" && newStatus !== "dormant") return null;
  const member = await Member.findOne({ _id: memberId, church: churchId }).select("dateJoined createdAt").lean();
  if (!member) return null;
  const sessions = await loadSessionMarks(churchId);
  const s = computeMemberStreaks(sessions, [member]).get(String(member._id)) || { absentStreak: 0, presentStreak: 0 };
  if (newStatus === "active" && s.absentStreak >= ABSENT_DORMANT_THRESHOLD) return "dormant";
  if (newStatus === "dormant" && s.presentStreak >= PRESENT_ACTIVE_THRESHOLD) return "active";
  return null;
};

/**
 * Re-evaluate member statuses after attendance data changed. Call after the
 * write is committed — the session collection must reflect the new state.
 */
export const applyAttendanceStatusTransitions = async (churchId, { memberIds = null } = {}) => {
  const sessions = await loadSessionMarks(churchId);

  const memberQuery = { church: churchId, status: { $in: ["active", "dormant"] } };
  if (Array.isArray(memberIds) && memberIds.length) memberQuery._id = { $in: memberIds };
  const members = await Member.find(memberQuery)
    .select("status dateJoined createdAt attendanceStatusOverride attendanceStatusOverrideBlocks")
    .lean();
  if (!members.length) return { toDormant: 0, toActive: 0 };

  const streaks = computeMemberStreaks(sessions, members);

  const ops = [];
  let toDormant = 0;
  let toActive = 0;
  for (const m of members) {
    const s = streaks.get(String(m._id));
    if (!s) continue;
    if (m.attendanceStatusOverride) {
      // The override only holds while the verdict it contradicted still does.
      const stillBlocking = m.attendanceStatusOverrideBlocks === "dormant"
        ? s.absentStreak >= ABSENT_DORMANT_THRESHOLD
        : s.presentStreak >= PRESENT_ACTIVE_THRESHOLD;
      if (stillBlocking) continue;
      ops.push(Member.findByIdAndUpdate(m._id, {
        attendanceStatusOverride: false,
        attendanceStatusOverrideBlocks: null,
      }));
      continue;
    }
    if (m.status === "active" && s.absentStreak >= ABSENT_DORMANT_THRESHOLD) {
      toDormant += 1;
      ops.push(Member.findByIdAndUpdate(m._id, { status: "dormant" }));
    } else if (m.status === "dormant" && s.presentStreak >= PRESENT_ACTIVE_THRESHOLD) {
      toActive += 1;
      ops.push(Member.findByIdAndUpdate(m._id, { status: "active" }));
    }
  }
  if (ops.length) await Promise.all(ops);
  return { toDormant, toActive };
};

/**
 * Members whose consecutive missed-services streak meets `threshold`.
 */
/**
 * Count each member's marked absences within a period session set, plus the
 * most recent service date they were marked present (over all sessions).
 */
const computeAbsenceCounts = (periodSessions, allSessions, members) => {
  const result = new Map();
  for (const m of members) {
    const id = String(m._id);
    let absentCount = 0;
    for (const s of periodSessions) if (s.absent.has(id)) absentCount += 1;
    let lastAttended = null;
    for (const s of allSessions) {
      if (s.present.has(id)) { lastAttended = s.date; break; }
    }
    result.set(id, { absentCount, lastAttended });
  }
  return result;
};

export const listAbsentees = async (churchId, { threshold = 3, serviceType = "", search = "", year = "", month = "", page = 1, limit = 20 } = {}) => {
  const minStreak = Math.max(1, parseInt(threshold, 10) || 3);
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const y = parseInt(year, 10);
  const mo = parseInt(month, 10);
  const yearValid = y >= 2000 && y <= 2100;
  const periodActive = yearValid && mo >= 1 && mo <= 12;

  const [allSessions, periodSessions, serviceTypes] = await Promise.all([
    loadSessionMarks(churchId, { serviceType, year: !periodActive && yearValid ? year : "" }),
    periodActive ? loadSessionMarks(churchId, { serviceType, year, month }) : Promise.resolve(null),
    ServiceIndividualAttendance.distinct("serviceType", { church: churchId }),
  ]);

  const memberQuery = { church: churchId, status: { $in: ATTENDANCE_MEMBER_STATUSES } };
  if (search && String(search).trim()) {
    const term = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = { $regex: term, $options: "i" };
    memberQuery.$or = [{ firstName: rx }, { lastName: rx }, { phoneNumber: rx }];
  }
  const members = await Member.find(memberQuery)
    .select("firstName lastName phoneNumber status streetAddress city dateJoined createdAt attendanceStatusOverride")
    .lean();

  let rows;
  if (periodActive) {
    // Period mode — everyone marked absent at least once in the month, the
    // metric is how many times (count, not consecutive streak).
    const counts = computeAbsenceCounts(periodSessions, allSessions, members);
    rows = members
      .map((m) => {
        const c = counts.get(String(m._id)) || { absentCount: 0, lastAttended: null };
        return { member: m, absentStreak: c.absentCount, absentCount: c.absentCount, lastAttended: c.lastAttended };
      })
      .filter((r) => r.absentCount >= 1);
  } else {
    const streaks = computeMemberStreaks(allSessions, members);
    rows = members
      .map((m) => ({ member: m, ...streaks.get(String(m._id)) }))
      .filter((r) => r.absentStreak >= minStreak);
  }
  rows.sort((a, b) => {
    if (b.absentStreak !== a.absentStreak) return b.absentStreak - a.absentStreak;
    const an = `${a.member.firstName || ""} ${a.member.lastName || ""}`.trim();
    const bn = `${b.member.firstName || ""} ${b.member.lastName || ""}`.trim();
    return an.localeCompare(bn);
  });

  const total = rows.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const paged = rows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return {
    absentees: paged,
    threshold: minStreak,
    dormantThreshold: ABSENT_DORMANT_THRESHOLD,
    metric: periodActive ? "count" : "streak",
    period: periodActive ? { year: y, month: mo } : null,
    serviceTypes: (Array.isArray(serviceTypes) ? serviceTypes : []).filter(Boolean).sort(),
    pagination: {
      totalResult: total,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    },
  };
};

/**
 * The specific services a member was marked absent for — paginated, same
 * filters (serviceType / month+year) as the absentees list they came from.
 */
export const listMemberMissedServices = async (churchId, memberId, { serviceType = "", year = "", month = "", page = 1, limit = 10 } = {}) => {
  const member = await Member.findOne({ _id: memberId, church: churchId })
    .select("firstName lastName phoneNumber status streetAddress city")
    .lean();
  if (!member) return null;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  const query = { church: churchId, absentMembers: memberId };
  if (serviceType) query.serviceType = serviceType;
  const y = parseInt(year, 10);
  const mo = parseInt(month, 10);
  if (y >= 2000 && y <= 2100) {
    const from = mo >= 1 && mo <= 12 ? mo - 1 : 0;
    const to = mo >= 1 && mo <= 12 ? mo : 12;
    query.date = { $gte: new Date(Date.UTC(y, from, 1)), $lt: new Date(Date.UTC(y, to, 1)) };
  }

  const [services, total] = await Promise.all([
    ServiceIndividualAttendance.find(query)
      .select("date serviceType mainSpeaker")
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    ServiceIndividualAttendance.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;
  return {
    member,
    services,
    pagination: {
      totalResult: total,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    },
  };
};
