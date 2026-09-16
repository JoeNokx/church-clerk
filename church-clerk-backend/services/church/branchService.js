import Church from "../../models/churchModel.js";
import Member from "../../models/memberModel.js";
import Attendance from "../../models/attendanceModel.js";
import Event from "../../models/eventModel.js";
import Income from "../../models/financeModel/incomeExpenseModel/incomeModel.js";
import Expense from "../../models/financeModel/incomeExpenseModel/expenseModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import { buildPaginationParams, buildPaginationResponse } from "../../utils/paginationHelper.js";
import { buildSearchQuery } from "../../utils/searchHelper.js";

async function getBranchesPaginated({ churchId, search, page, limit }) {
  const { skip } = buildPaginationParams({ page, limit });

  const baseQuery = {
    parentChurch: churchId
  };

  const query = { ...baseQuery };

  if (search) {
    const searchFields = ["name", "pastor", "streetAddress", "city", "region", "country"];
    Object.assign(query, buildSearchQuery(search, searchFields));
  }

  const branches = await Church.find(query)
    .select("name pastor streetAddress city region country phoneNumber email memberCount")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalBranches = await Church.countDocuments(query);
  const pagination = buildPaginationResponse(totalBranches, page, limit);

  return { branches, totalBranches, pagination };
}

async function getBranchKPIs({ churchId }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const baseKpiAgg = await Church.aggregate([
    { $match: { parentChurch: churchId } },
    {
      $group: {
        _id: null,
        totalBranches: { $sum: 1 },
        totalMembers: { $sum: "$memberCount" }
      }
    }
  ]);

  const kpi = baseKpiAgg[0] || { totalBranches: 0, totalMembers: 0 };

  // Previous-month snapshots for change/diff
  const [branchesLastMonthAgg, membersLastMonthAgg] = await Promise.all([
    Church.countDocuments({ parentChurch: churchId, createdAt: { $lt: startOfMonth } }),
    Church.aggregate([
      { $match: { parentChurch: churchId, createdAt: { $lt: startOfMonth } } },
      { $group: { _id: null, totalMembers: { $sum: "$memberCount" } } }
    ]),
  ]);

  const totalMembersLastMonth = membersLastMonthAgg[0]?.totalMembers || 0;

  const pctChange = (current, previous) => {
    const c = Number(current || 0);
    const p = Number(previous || 0);
    if (!p) return c ? 100 : 0;
    return ((c - p) / p) * 100;
  };

  const branchesThisMonth = await Church.countDocuments({
    parentChurch: churchId,
    createdAt: { $gte: startOfMonth }
  });

  return {
    ...kpi,
    change: {
      totalBranches: pctChange(kpi.totalBranches, branchesLastMonthAgg),
      totalMembers: pctChange(kpi.totalMembers, totalMembersLastMonth),
    },
    diff: {
      totalBranches: kpi.totalBranches - branchesLastMonthAgg,
      totalMembers: kpi.totalMembers - totalMembersLastMonth,
    },
  };
}

async function getBranchesConsolidated({ churchId }) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const branches = await Church.find({ parentChurch: churchId })
    .select("name pastor city region country currency memberCount isActive logoUrl createdAt")
    .sort({ name: 1 })
    .lean();

  const ids = branches.map((b) => b._id);
  const emptyMonthly = { months: [], newMembers: [], attendance: [], services: [] };

  if (!ids.length) {
    return {
      generatedAt: now,
      branches: [],
      totals: {
        branches: 0,
        members: 0,
        activeMembers: 0,
        newMembersThisMonth: 0,
        attendanceLast30d: 0,
        servicesLast30d: 0,
        incomeThisMonth: 0,
        expenseThisMonth: 0,
        netThisMonth: 0,
        upcomingEvents: 0,
      },
      charts: {
        memberStatus: [],
        incomeByCategory: [],
        monthly: emptyMonthly,
      },
      upcomingEvents: [],
    };
  }

  const [
    memberStats,
    memberStatusAgg,
    newMembersMonthly,
    attendanceStats,
    attendanceMonthly,
    incomeStats,
    expenseStats,
    incomeByCategoryAgg,
    eventStats,
    upcomingEventDocs,
    subscriptions,
  ] = await Promise.all([
    Member.aggregate([
      { $match: { church: { $in: ids } } },
      {
        $group: {
          _id: "$church",
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          newThisMonth: { $sum: { $cond: [{ $gte: ["$dateJoined", startOfMonth] }, 1, 0] } },
          visitors: { $sum: { $cond: [{ $eq: ["$status", "visitor"] }, 1, 0] } },
        },
      },
    ]),
    Member.aggregate([
      { $match: { church: { $in: ids } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Member.aggregate([
      { $match: { church: { $in: ids }, dateJoined: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { y: { $year: "$dateJoined" }, m: { $month: "$dateJoined" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Attendance.aggregate([
      { $match: { church: { $in: ids } } },
      { $sort: { serviceDate: -1 } },
      {
        $group: {
          _id: "$church",
          lastServiceDate: { $first: "$serviceDate" },
          lastServiceType: { $first: "$serviceType" },
          lastServiceTotal: { $first: "$totalNumber" },
          recordsLast30d: { $sum: { $cond: [{ $gte: ["$serviceDate", thirtyDaysAgo] }, 1, 0] } },
          attendanceLast30d: { $sum: { $cond: [{ $gte: ["$serviceDate", thirtyDaysAgo] }, "$totalNumber", 0] } },
        },
      },
    ]),
    Attendance.aggregate([
      { $match: { church: { $in: ids }, serviceDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { y: { $year: "$serviceDate" }, m: { $month: "$serviceDate" } },
          total: { $sum: "$totalNumber" },
          services: { $sum: 1 },
        },
      },
    ]),
    Income.aggregate([
      { $match: { church: { $in: ids }, dateReceived: { $gte: startOfMonth } } },
      { $group: { _id: "$church", total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { church: { $in: ids }, dateSpent: { $gte: startOfMonth } } },
      { $group: { _id: "$church", total: { $sum: "$amount" } } },
    ]),
    Income.aggregate([
      { $match: { church: { $in: ids }, dateReceived: { $gte: startOfMonth } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),
    Event.aggregate([
      {
        $match: {
          church: { $in: ids },
          $or: [{ dateFrom: { $gte: startOfToday } }, { dateTo: { $gte: startOfToday } }],
        },
      },
      {
        $group: {
          _id: "$church",
          upcoming: { $sum: 1 },
        },
      },
    ]),
    Event.find({
      church: { $in: ids },
      $or: [{ dateFrom: { $gte: startOfToday } }, { dateTo: { $gte: startOfToday } }],
    })
      .select("church title category dateFrom dateTo venue")
      .sort({ dateFrom: 1 })
      .limit(6)
      .lean(),
    Subscription.find({ church: { $in: ids } })
      .select("church status plan")
      .populate("plan", "name")
      .lean(),
  ]);

  const toMap = (rows) => new Map(rows.map((r) => [String(r._id), r]));
  const memberMap = toMap(memberStats);
  const attendanceMap = toMap(attendanceStats);
  const incomeMap = toMap(incomeStats);
  const expenseMap = toMap(expenseStats);
  const eventMap = toMap(eventStats);
  const subscriptionMap = toMap(subscriptions.map((s) => ({ ...s, _id: s.church })));

  const branchNameMap = new Map(branches.map((b) => [String(b._id), b.name]));

  const rows = branches.map((b) => {
    const id = String(b._id);
    const m = memberMap.get(id);
    const a = attendanceMap.get(id);
    const inc = Number(incomeMap.get(id)?.total || 0);
    const exp = Number(expenseMap.get(id)?.total || 0);
    const ev = eventMap.get(id);
    const sub = subscriptionMap.get(id);
    const recordsLast30d = Number(a?.recordsLast30d || 0);
    const attendanceLast30d = Number(a?.attendanceLast30d || 0);

    return {
      _id: b._id,
      name: b.name,
      pastor: b.pastor || "",
      city: b.city || "",
      region: b.region || "",
      country: b.country || "",
      currency: b.currency || "GHS",
      logoUrl: b.logoUrl || "",
      memberCount: Number(b.memberCount || 0),
      createdAt: b.createdAt,
      members: {
        total: Number(m?.total || 0),
        active: Number(m?.active || 0),
        newThisMonth: Number(m?.newThisMonth || 0),
        visitors: Number(m?.visitors || 0),
      },
      attendance: {
        lastServiceDate: a?.lastServiceDate || null,
        lastServiceType: a?.lastServiceType || "",
        lastServiceTotal: Number(a?.lastServiceTotal || 0),
        servicesLast30d: recordsLast30d,
        attendanceLast30d,
        avgLast30d: recordsLast30d ? Math.round(attendanceLast30d / recordsLast30d) : 0,
      },
      finance: {
        incomeThisMonth: inc,
        expenseThisMonth: exp,
        netThisMonth: inc - exp,
      },
      events: {
        upcoming: Number(ev?.upcoming || 0),
      },
      subscription: {
        status: sub?.status || "none",
        plan: sub?.plan?.name || "",
      },
    };
  });

  // Build a fixed 6-month window for trend charts
  const monthKeys = [];
  const monthLabels = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${d.getMonth() + 1}`);
    monthLabels.push(d.toLocaleString("en", { month: "short" }));
  }
  const keyOf = (y, m) => `${y}-${m}`;
  const newMembersMap = new Map(newMembersMonthly.map((r) => [keyOf(r._id.y, r._id.m), r.count]));
  const attendanceMonthlyMap = new Map(attendanceMonthly.map((r) => [keyOf(r._id.y, r._id.m), r]));

  const monthly = {
    months: monthLabels,
    newMembers: monthKeys.map((k) => Number(newMembersMap.get(k) || 0)),
    attendance: monthKeys.map((k) => Number(attendanceMonthlyMap.get(k)?.total || 0)),
    services: monthKeys.map((k) => Number(attendanceMonthlyMap.get(k)?.services || 0)),
  };

  const memberStatus = memberStatusAgg
    .map((r) => ({ name: String(r._id || "unknown").replace(/_/g, " "), value: Number(r.count || 0) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const incomeByCategory = incomeByCategoryAgg
    .map((r) => ({ name: String(r._id || "Other"), value: Number(r.total || 0) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const totals = rows.reduce(
    (acc, r) => {
      acc.members += r.members.total;
      acc.activeMembers += r.members.active;
      acc.newMembersThisMonth += r.members.newThisMonth;
      acc.attendanceLast30d += r.attendance.attendanceLast30d;
      acc.servicesLast30d += r.attendance.servicesLast30d;
      acc.incomeThisMonth += r.finance.incomeThisMonth;
      acc.expenseThisMonth += r.finance.expenseThisMonth;
      acc.upcomingEvents += r.events.upcoming;
      return acc;
    },
    {
      branches: rows.length,
      members: 0,
      activeMembers: 0,
      newMembersThisMonth: 0,
      attendanceLast30d: 0,
      servicesLast30d: 0,
      incomeThisMonth: 0,
      expenseThisMonth: 0,
      upcomingEvents: 0,
    }
  );
  totals.netThisMonth = totals.incomeThisMonth - totals.expenseThisMonth;

  const upcomingEvents = upcomingEventDocs.map((e) => ({
    _id: e._id,
    title: e.title,
    category: e.category || "",
    dateFrom: e.dateFrom,
    dateTo: e.dateTo || null,
    venue: e.venue || "",
    branchName: branchNameMap.get(String(e.church)) || "",
  }));

  return {
    generatedAt: now,
    branches: rows,
    totals,
    charts: {
      memberStatus,
      incomeByCategory,
      monthly,
    },
    upcomingEvents,
  };
}

export { getBranchesPaginated, getBranchKPIs, getBranchesConsolidated };
