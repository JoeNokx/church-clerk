// utils/memberStatusSnapshot.js
// Reconstructs member counts/statuses at a past date boundary from the
// append-only MemberStatusHistory log. Used by dashboard and member KPIs
// for month-on-month comparisons — when history coverage is incomplete,
// callers must treat the previous value as unavailable rather than invent one.
import Member from "../models/memberModel.js";
import MemberStatusHistory from "../models/memberStatusHistoryModel.js";

// Lazy baseline: members with no history rows get one stamped "now".
// Idempotent via the partial unique index on (church, member, source="baseline").
const seedMissingMemberBaselines = async (churchId) => {
  if (!churchId) return;

  const memberIdsWithHistory = await MemberStatusHistory.distinct("member", { church: churchId });
  const missingHistory = await Member.find({ church: churchId, _id: { $nin: memberIdsWithHistory } })
    .select("_id status")
    .lean();
  if (!missingHistory.length) return;

  const stamp = new Date();
  await MemberStatusHistory.insertMany(
    missingHistory.map((m) => ({
      church: churchId,
      member: m._id,
      fromStatus: null,
      toStatus: m.status,
      changedAt: stamp,
      source: "baseline"
    })),
    { ordered: false }
  ).catch((e) => {
    if (e?.code !== 11000) throw e;
  });
};

// Reconstructs each member's status as of `boundary` from their latest
// history entry before it.
//
// Returns {
//   hasComparisonData: boolean — false when any member created before the
//     boundary lacks a history entry at or before it (counts is then null),
//   memberCount: number of members created before `boundary` that still exist,
//   counts: { "<status>": n } per-status totals at the boundary, or null
// }
const getMemberStatusSnapshotAt = async (churchId, boundary) => {
  const memberFilter = { createdAt: { $lt: boundary } };
  if (churchId) memberFilter.church = churchId;
  const memberIdsAtBoundary = await Member.find(memberFilter).distinct("_id");

  const historyFilter = { member: { $in: memberIdsAtBoundary }, changedAt: { $lt: boundary } };
  if (churchId) historyFilter.church = churchId;

  const coveredIds = await MemberStatusHistory.distinct("member", historyFilter);
  const hasComparisonData = coveredIds.length === memberIdsAtBoundary.length;
  if (!hasComparisonData) {
    return { hasComparisonData, memberCount: memberIdsAtBoundary.length, counts: null };
  }

  const statusAtBoundary = await MemberStatusHistory.aggregate([
    { $match: historyFilter },
    { $sort: { changedAt: -1 } },
    { $group: { _id: "$member", toStatus: { $first: "$toStatus" } } },
    { $group: { _id: "$toStatus", n: { $sum: 1 } } }
  ]);

  const counts = {};
  for (const row of statusAtBoundary) counts[row._id] = row.n;
  return { hasComparisonData, memberCount: memberIdsAtBoundary.length, counts };
};

export { seedMissingMemberBaselines, getMemberStatusSnapshotAt };
