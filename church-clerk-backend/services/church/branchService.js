import Church from "../../models/churchModel.js";
import Member from "../../models/memberModel.js";
import ServiceIndividualAttendance from "../../models/serviceIndividualAttendanceModel.js";
import Program from "../../models/programModel.js";
import Income from "../../models/financeModel/incomeExpenseModel/incomeModel.js";
import Expense from "../../models/financeModel/incomeExpenseModel/expenseModel.js";
import TitheIndividual from "../../models/financeModel/tithesModel/titheIndividualModel.js";
import TitheAggregate from "../../models/financeModel/tithesModel/titheAggregateModel.js";
import Offering from "../../models/financeModel/offeringModel.js";
import SpecialFund from "../../models/financeModel/specialFundModel.js";
import WelfareContributions from "../../models/financeModel/welfareModel/welfareContributionModel.js";
import WelfareDisbursements from "../../models/financeModel/welfareModel/welfareDisbursementModel.js";
import ProjectContribution from "../../models/financeModel/projectModel/projectContributionModel.js";
import ProjectExpense from "../../models/financeModel/projectModel/projectExpenseModel.js";
import BusinessIncome from "../../models/financeModel/businessModel/businessIncomeModel.js";
import BusinessExpenses from "../../models/financeModel/businessModel/businessExpensesModel.js";
import GeneralExpenses from "../../models/generalExpenseModel.js";
import ProgramOffering from "../../models/programModel/programOfferingModel.js";
import CellOffering from "../../models/organisationModel/cellOfferingModel.js";
import GroupOffering from "../../models/organisationModel/groupOfferingModel.js";
import DepartmentOffering from "../../models/organisationModel/departmentOfferingModel.js";
import MinistryOffering from "../../models/organisationModel/ministryOfferingModel.js";
import PledgePayment from "../../models/financeModel/pledgeModel/pledgePaymentModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Visitor from "../../models/visitorsModel.js";
import OutreachProspect from "../../models/outreachModel/outreachProspectModel.js";
import OutreachFollowUp from "../../models/outreachModel/outreachFollowUpModel.js";
import { buildPaginationParams, buildPaginationResponse } from "../../utils/paginationHelper.js";
import { buildSearchQuery } from "../../utils/searchHelper.js";

const INCOME_SOURCES = [
  { key: "tithes", label: "Tithes", Model: TitheIndividual, dateField: "date", amountField: "amount" },
  { key: "tithesAggregate", label: "Tithes (Aggregate)", Model: TitheAggregate, dateField: "date", amountField: "amount" },
  { key: "offerings", label: "Offerings", Model: Offering, dateField: "serviceDate", amountField: "amount" },
  { key: "programOfferings", label: "Program Offerings", Model: ProgramOffering, dateField: "offeringDate", amountField: "amount" },
  { key: "cellOfferings", label: "Cell Offerings", Model: CellOffering, dateField: "date", amountField: "amount" },
  { key: "groupOfferings", label: "Group Offerings", Model: GroupOffering, dateField: "date", amountField: "amount" },
  { key: "departmentOfferings", label: "Department Offerings", Model: DepartmentOffering, dateField: "date", amountField: "amount" },
  { key: "ministryOfferings", label: "Ministry Offerings", Model: MinistryOffering, dateField: "date", amountField: "amount" },
  { key: "projectContributions", label: "Fundraising", Model: ProjectContribution, dateField: "date", amountField: "amount" },
  { key: "welfareContributions", label: "Welfare", Model: WelfareContributions, dateField: "date", amountField: "amount" },
  { key: "specialFunds", label: "Special Funds", Model: SpecialFund, dateField: "givingDate", amountField: "totalAmount" },
  { key: "businessIncome", label: "Business Ventures", Model: BusinessIncome, dateField: "date", amountField: "amount" },
  { key: "pledgesPaid", label: "Pledges Paid", Model: PledgePayment, dateField: "paymentDate", amountField: "amount" },
  { key: "otherIncome", label: "Other Income", Model: Income, dateField: "dateReceived", amountField: "amount" },
];

const EXPENSE_SOURCES = [
  { key: "generalExpenses", label: "General Expenses", Model: GeneralExpenses, dateField: "date", amountField: "amount" },
  { key: "welfareDisbursements", label: "Welfare Disbursements", Model: WelfareDisbursements, dateField: "date", amountField: "amount" },
  { key: "projectExpenses", label: "Fundraising Expenses", Model: ProjectExpense, dateField: "date", amountField: "amount" },
  { key: "businessExpenses", label: "Business Ventures", Model: BusinessExpenses, dateField: "date", amountField: "amount" },
  { key: "otherExpenses", label: "Other Expenses", Model: Expense, dateField: "dateSpent", amountField: "amount" },
];

async function getBranchesPaginated({ churchId, search, status, page, limit }) {
  const { skip } = buildPaginationParams({ page, limit });

  const query = { parentChurch: churchId };

  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus === "active") query.isActive = { $ne: false };
  if (normalizedStatus === "inactive") query.isActive = false;

  if (search) {
    const searchFields = ["name", "pastor", "streetAddress", "city", "region", "country"];
    Object.assign(query, buildSearchQuery(search, searchFields));
  }

  const branches = await Church.find(query)
    .select("name pastor streetAddress city region country phoneNumber email memberCount isActive createdAt")
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

  const branchIds = await Church.find({ parentChurch: churchId }).select("_id").lean();
  const branchIdList = branchIds.map((b) => b._id);

  const [activeBranches, activeBranchesPrev, newMembersThisMonth, newMembersLastMonth] = await Promise.all([
    Church.countDocuments({ parentChurch: churchId, isActive: { $ne: false } }),
    Church.countDocuments({ parentChurch: churchId, isActive: { $ne: false }, createdAt: { $lt: startOfMonth } }),
    branchIdList.length
      ? Member.countDocuments({ church: { $in: branchIdList }, dateJoined: { $gte: startOfMonth } })
      : 0,
    branchIdList.length
      ? Member.countDocuments({ church: { $in: branchIdList }, dateJoined: { $gte: startOfLastMonth, $lte: endOfLastMonth } })
      : 0,
  ]);

  return {
    ...kpi,
    activeBranches,
    newMembersThisMonth,
    change: {
      totalBranches: pctChange(kpi.totalBranches, branchesLastMonthAgg),
      totalMembers: pctChange(kpi.totalMembers, totalMembersLastMonth),
      activeBranches: pctChange(activeBranches, activeBranchesPrev),
      newMembersThisMonth: pctChange(newMembersThisMonth, newMembersLastMonth),
    },
    diff: {
      totalBranches: kpi.totalBranches - branchesLastMonthAgg,
      totalMembers: kpi.totalMembers - totalMembersLastMonth,
      activeBranches: activeBranches - activeBranchesPrev,
      newMembersThisMonth: newMembersThisMonth - newMembersLastMonth,
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
        upcomingPrograms: 0,
      },
      charts: {
        memberStatus: [],
        incomeByCategory: [],
        monthly: emptyMonthly,
      },
      upcomingPrograms: [],
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
    programStats,
    upcomingProgramDocs,
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
    ServiceIndividualAttendance.aggregate([
      { $match: { church: { $in: ids } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: "$church",
          lastServiceDate: { $first: "$date" },
          lastServiceType: { $first: "$serviceType" },
          lastServiceTotal: { $first: { $size: { $ifNull: ["$presentMembers", []] } } },
          recordsLast30d: { $sum: { $cond: [{ $gte: ["$date", thirtyDaysAgo] }, 1, 0] } },
          attendanceLast30d: { $sum: { $cond: [{ $gte: ["$date", thirtyDaysAgo] }, { $size: { $ifNull: ["$presentMembers", []] } }, 0] } },
        },
      },
    ]),
    ServiceIndividualAttendance.aggregate([
      { $match: { church: { $in: ids }, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { y: { $year: "$date" }, m: { $month: "$date" } },
          total: { $sum: { $size: { $ifNull: ["$presentMembers", []] } } },
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
    Program.aggregate([
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
    Program.find({
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
  const programMap = toMap(programStats);
  const subscriptionMap = toMap(subscriptions.map((s) => ({ ...s, _id: s.church })));

  const branchNameMap = new Map(branches.map((b) => [String(b._id), b.name]));

  const rows = branches.map((b) => {
    const id = String(b._id);
    const m = memberMap.get(id);
    const a = attendanceMap.get(id);
    const inc = Number(incomeMap.get(id)?.total || 0);
    const exp = Number(expenseMap.get(id)?.total || 0);
    const prog = programMap.get(id);
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
      programs: {
        upcoming: Number(prog?.upcoming || 0),
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
      acc.upcomingPrograms += r.programs.upcoming;
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
      upcomingPrograms: 0,
    }
  );
  totals.netThisMonth = totals.incomeThisMonth - totals.expenseThisMonth;

  const upcomingPrograms = upcomingProgramDocs.map((e) => ({
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
    upcomingPrograms,
  };
}

// All churches that make up the organisation: the headquarters itself + its branches
async function getOrgChurches(churchId) {
  const churches = await Church.find({
    $or: [{ _id: churchId }, { parentChurch: churchId }]
  })
    .select("name type city region currency")
    .sort({ name: 1 })
    .lean();

  return churches.map((c) => ({
    ...c,
    isHeadquarters: String(c._id) === String(churchId),
  }));
}

function resolveFinancePeriod(period) {
  const now = new Date();
  const p = String(period || "month").toLowerCase();

  if (p === "all") return { start: null, end: null, label: "All time" };
  if (p === "year") {
    return { start: new Date(now.getFullYear(), 0, 1), end: null, label: `${now.getFullYear()}` };
  }
  if (p === "last-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return {
      start,
      end,
      label: start.toLocaleDateString("en", { month: "long", year: "numeric" }),
    };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: null,
    label: now.toLocaleDateString("en", { month: "long", year: "numeric" }),
  };
}

function buildMonthWindow(now, count = 6) {
  const keys = [];
  const labels = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${d.getMonth() + 1}`);
    labels.push(d.toLocaleString("en", { month: "short" }));
  }
  return { keys, labels };
}

// Member-level listing across headquarters + branches
async function getBranchMembers({ churchId, page, limit, search, status, branchId }) {
  const { skip } = buildPaginationParams({ page, limit });
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const orgChurches = await getOrgChurches(churchId);
  let scope = orgChurches;
  if (branchId) {
    const match = orgChurches.find((c) => String(c._id) === String(branchId));
    scope = match ? [match] : [];
  }
  const scopeIds = scope.map((c) => c._id);

  const baseMatch = { church: { $in: scopeIds } };

  const [totalMembers, newThisMonth, activeMembers, monthlyAgg] = await Promise.all([
    scopeIds.length ? Member.countDocuments(baseMatch) : 0,
    scopeIds.length ? Member.countDocuments({ ...baseMatch, dateJoined: { $gte: startOfMonth } }) : 0,
    scopeIds.length ? Member.countDocuments({ ...baseMatch, status: "active" }) : 0,
    scopeIds.length
      ? Member.aggregate([
          { $match: { ...baseMatch, dateJoined: { $gte: sixMonthsAgo } } },
          { $group: { _id: { y: { $year: "$dateJoined" }, m: { $month: "$dateJoined" } }, count: { $sum: 1 } } },
        ])
      : [],
  ]);

  const query = { ...baseMatch };
  if (status) query.status = String(status);
  if (search) {
    Object.assign(query, buildSearchQuery(search, ["firstName", "lastName", "phoneNumber", "memberId", "email"]));
  }

  const [members, totalResult] = await Promise.all([
    Member.find(query)
      .select("firstName lastName phoneNumber memberId status dateJoined church")
      .populate("church", "name type")
      .sort({ dateJoined: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Member.countDocuments(query),
  ]);

  const pagination = buildPaginationResponse(totalResult, page, limit);
  const hqIdStr = String(churchId);

  const rows = members.map((m) => ({
    _id: m._id,
    name: [m.firstName, m.lastName].filter(Boolean).join(" "),
    memberId: m.memberId || "",
    phone: m.phoneNumber || "",
    status: m.status || "",
    dateJoined: m.dateJoined || null,
    branch: m.church
      ? {
          _id: m.church._id,
          name: m.church.name,
          isHeadquarters: String(m.church._id) === hqIdStr,
        }
      : null,
  }));

  const { keys, labels } = buildMonthWindow(now);
  const monthlyMap = new Map(monthlyAgg.map((r) => [`${r._id.y}-${r._id.m}`, r.count]));

  return {
    kpis: {
      totalMembers,
      newMembersThisMonth: newThisMonth,
      activeMembers,
      inactiveMembers: Math.max(0, totalMembers - activeMembers),
    },
    growth: {
      months: labels,
      newMembers: keys.map((k) => Number(monthlyMap.get(k) || 0)),
    },
    churches: orgChurches.map((c) => ({ _id: c._id, name: c.name, isHeadquarters: c.isHeadquarters })),
    pagination,
    members: rows,
  };
}

// Per-church attendance/visitor/outreach comparison across headquarters + branches
async function getBranchAttendanceRecords({ churchId, page, limit, search, branchId }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Most recent Sunday (today counts if today is Sunday)
  const sundayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const sundayEnd = new Date(sundayStart.getFullYear(), sundayStart.getMonth(), sundayStart.getDate(), 23, 59, 59, 999);

  const orgChurches = await getOrgChurches(churchId);
  const allIds = orgChurches.map((c) => c._id);
  const monthMatch = (field) => ({
    church: { $in: allIds },
    $expr: { $gte: [{ $ifNull: [`$${field}`, "$createdAt"] }, startOfMonth] },
  });

  const [sundayAgg, visitorAgg, convertedAgg, outreachAgg, followUpAgg] = await Promise.all([
    allIds.length
      ? ServiceIndividualAttendance.aggregate([
          { $match: { church: { $in: allIds }, date: { $gte: sundayStart, $lte: sundayEnd } } },
          { $group: { _id: "$church", total: { $sum: { $size: { $ifNull: ["$presentMembers", []] } } } } },
        ])
      : [],
    allIds.length
      ? Visitor.aggregate([
          { $match: { church: { $in: allIds }, createdAt: { $gte: startOfMonth } } },
          { $group: { _id: "$church", visitors: { $sum: 1 } } },
        ])
      : [],
    allIds.length
      ? Member.aggregate([
          { $match: { church: { $in: allIds }, visitorId: { $ne: null }, createdAt: { $gte: startOfMonth } } },
          { $group: { _id: "$church", total: { $sum: 1 } } },
        ])
      : [],
    allIds.length
      ? OutreachProspect.aggregate([
          { $match: monthMatch("dateReached") },
          { $group: { _id: "$church", total: { $sum: 1 } } },
        ])
      : [],
    allIds.length
      ? OutreachFollowUp.aggregate([
          { $match: monthMatch("followUpDate") },
          { $group: { _id: "$church", total: { $sum: 1 } } },
        ])
      : [],
  ]);

  const toMap = (rows, field = "total") =>
    new Map((rows || []).map((r) => [String(r._id), Number(r[field] || 0)]));
  const sundayMap = toMap(sundayAgg);
  const visitorMap = toMap(visitorAgg, "visitors");
  const convertedMap = toMap(convertedAgg);
  const outreachMap = toMap(outreachAgg);
  const followUpMap = toMap(followUpAgg);

  const normalizedSearch = String(search || "").trim().toLowerCase();
  let scope = orgChurches;
  if (branchId) {
    scope = scope.filter((c) => String(c._id) === String(branchId));
  }
  if (normalizedSearch) {
    scope = scope.filter((c) => String(c.name || "").toLowerCase().includes(normalizedSearch));
  }

  const ordered = [
    ...scope.filter((c) => c.isHeadquarters),
    ...scope.filter((c) => !c.isHeadquarters),
  ];

  const { skip } = buildPaginationParams({ page, limit });
  const pagination = buildPaginationResponse(ordered.length, page, limit);
  const pageRows = ordered.slice(skip, skip + limit);

  const rows = pageRows.map((c) => {
    const id = String(c._id);
    return {
      _id: c._id,
      name: c.name,
      city: c.city || "",
      region: c.region || "",
      isHeadquarters: c.isHeadquarters,
      thisSunday: sundayMap.get(id) || 0,
      visitorsThisMonth: visitorMap.get(id) || 0,
      convertedVisitorsThisMonth: convertedMap.get(id) || 0,
      outreachThisMonth: outreachMap.get(id) || 0,
      followUpsThisMonth: followUpMap.get(id) || 0,
    };
  });

  return {
    period: { sundayDate: sundayStart, month: startOfMonth },
    kpis: {
      thisSunday: sundayAgg.reduce((s, r) => s + Number(r.total || 0), 0),
      visitorsThisMonth: visitorAgg.reduce((s, r) => s + Number(r.visitors || 0), 0),
      convertedVisitorsThisMonth: convertedAgg.reduce((s, r) => s + Number(r.total || 0), 0),
      outreachThisMonth: outreachAgg.reduce((s, r) => s + Number(r.total || 0), 0),
    },
    churches: orgChurches.map((c) => ({ _id: c._id, name: c.name, isHeadquarters: c.isHeadquarters })),
    pagination,
    rows,
  };
}

// Income & expense breakdown per church (HQ + branches) across every money module
async function getBranchFinances({ churchId, period }) {
  const { start, end, label } = resolveFinancePeriod(period);

  const orgChurches = await getOrgChurches(churchId);
  const ids = orgChurches.map((c) => c._id);

  const dateMatch = (field) => {
    if (!start && !end) return {};
    const range = {};
    if (start) range.$gte = start;
    if (end) range.$lte = end;
    return { [field]: range };
  };

  const sumByChurch = ({ Model, dateField, amountField }) =>
    ids.length
      ? Model.aggregate([
          { $match: { church: { $in: ids }, ...dateMatch(dateField) } },
          { $group: { _id: "$church", total: { $sum: `$${amountField}` } } },
        ])
      : [];

  const [incomeAggs, expenseAggs] = await Promise.all([
    Promise.all(INCOME_SOURCES.map((s) => sumByChurch(s))),
    Promise.all(EXPENSE_SOURCES.map((s) => sumByChurch(s))),
  ]);

  const toMap = (rows) => new Map((rows || []).map((r) => [String(r._id), Number(r.total || 0)]));

  const incomeMaps = INCOME_SOURCES.map((s, i) => ({ key: s.key, map: toMap(incomeAggs[i]) }));
  const expenseMaps = EXPENSE_SOURCES.map((s, i) => ({ key: s.key, map: toMap(expenseAggs[i]) }));

  const ordered = [
    ...orgChurches.filter((c) => c.isHeadquarters),
    ...orgChurches.filter((c) => !c.isHeadquarters),
  ];

  const rows = ordered.map((c) => {
    const id = String(c._id);
    const income = {};
    const expenses = {};
    let incomeTotal = 0;
    let expenseTotal = 0;

    incomeMaps.forEach(({ key, map }) => {
      const v = map.get(id) || 0;
      income[key] = v;
      incomeTotal += v;
    });
    expenseMaps.forEach(({ key, map }) => {
      const v = map.get(id) || 0;
      expenses[key] = v;
      expenseTotal += v;
    });

    return {
      _id: c._id,
      name: c.name,
      isHeadquarters: c.isHeadquarters,
      currency: c.currency || "GHS",
      city: c.city || "",
      region: c.region || "",
      income,
      incomeTotal,
      expenses,
      expenseTotal,
      net: incomeTotal - expenseTotal,
    };
  });

  const sumSource = (maps) =>
    maps.map(({ key, map }) => ({
      key,
      total: [...map.values()].reduce((s, v) => s + v, 0),
    }));

  const incomeBySource = sumSource(incomeMaps).map((r) => ({
    ...r,
    label: INCOME_SOURCES.find((s) => s.key === r.key)?.label || r.key,
  }));
  const expenseBySource = sumSource(expenseMaps).map((r) => ({
    ...r,
    label: EXPENSE_SOURCES.find((s) => s.key === r.key)?.label || r.key,
  }));

  const totalIncome = incomeBySource.reduce((s, r) => s + r.total, 0);
  const totalExpenses = expenseBySource.reduce((s, r) => s + r.total, 0);
  const topIncomeSource = incomeBySource.reduce(
    (best, r) => (r.total > (best?.total || 0) ? r : best),
    null
  );
  const topBranch = rows.reduce(
    (best, r) => (r.incomeTotal > (best?.incomeTotal || 0) ? r : best),
    null
  );

  return {
    period: { key: String(period || "month").toLowerCase(), label },
    incomeSources: INCOME_SOURCES.map(({ key, label: l }) => ({ key, label: l })),
    expenseSources: EXPENSE_SOURCES.map(({ key, label: l }) => ({ key, label: l })),
    kpis: {
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      topIncomeSource: topIncomeSource && topIncomeSource.total > 0
        ? { key: topIncomeSource.key, label: topIncomeSource.label, total: topIncomeSource.total }
        : null,
      topBranch: topBranch && topBranch.incomeTotal > 0
        ? { _id: topBranch._id, name: topBranch.name, incomeTotal: topBranch.incomeTotal }
        : null,
    },
    totals: { totalIncome, totalExpenses, net: totalIncome - totalExpenses },
    incomeBySource,
    expenseBySource,
    branches: rows,
  };
}

export { getBranchesPaginated, getBranchKPIs, getBranchesConsolidated, getBranchMembers, getBranchAttendanceRecords, getBranchFinances };
