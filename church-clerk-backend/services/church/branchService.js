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
import OutreachSupport from "../../models/outreachModel/outreachSupportModel.js";
import OrganisationContribution from "../../models/organisationModel/organisationContributionModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Visitor from "../../models/visitorsModel.js";
import OutreachProspect from "../../models/outreachModel/outreachProspectModel.js";
import OutreachFollowUp from "../../models/outreachModel/outreachFollowUpModel.js";
import Budget from "../../models/financeModel/budgetingModel.js";
import { buildPaginationParams, buildPaginationResponse } from "../../utils/paginationHelper.js";
import { buildSearchQuery } from "../../utils/searchHelper.js";

// Same buckets the members module uses: "inactive" = dormant/temporarily away
// (still members), "former" = transferred/left/deceased. Visitors and
// uncategorised rows are excluded from member totals entirely.
const MEMBER_ACTIVE_STATUSES = ["active"];
const MEMBER_INACTIVE_STATUSES = ["dormant", "temporarily_away", "inactive"];
const MEMBER_FORMER_STATUSES = ["transferred", "left_church", "deceased", "former"];
const MEMBER_ALL_STATUSES = [...MEMBER_ACTIVE_STATUSES, ...MEMBER_INACTIVE_STATUSES, ...MEMBER_FORMER_STATUSES];

const INCOME_SOURCES = [
  { key: "tithes", label: "Tithes", queries: [
    { Model: TitheIndividual, dateField: "date", amountField: "amount" },
    { Model: TitheAggregate, dateField: "date", amountField: "amount" }
  ] },
  { key: "offerings", label: "Offerings", Model: Offering, dateField: "serviceDate", amountField: "amount" },
  { key: "programOfferings", label: "Programs Offerings, Seed & Pledges", Model: ProgramOffering, dateField: "offeringDate", amountField: "amount" },
  // Organisation contributions fold into their entity's line — no standalone
  // line, so nothing counts twice.
  { key: "cellOfferings", label: "Cell Offerings, Seed & Contributions", queries: [
    { Model: CellOffering, dateField: "date", amountField: "amount" },
    { Model: OrganisationContribution, dateField: "date", amountField: "amount", extraMatch: { entityType: "cell" } }
  ] },
  { key: "groupOfferings", label: "Groups Offerings, Seed & Contributions", queries: [
    { Model: GroupOffering, dateField: "date", amountField: "amount" },
    { Model: OrganisationContribution, dateField: "date", amountField: "amount", extraMatch: { entityType: "group" } }
  ] },
  { key: "departmentOfferings", label: "Department Offerings, Seed & Contributions", queries: [
    { Model: DepartmentOffering, dateField: "date", amountField: "amount" },
    { Model: OrganisationContribution, dateField: "date", amountField: "amount", extraMatch: { entityType: "department" } }
  ] },
  { key: "ministryOfferings", label: "Ministry Offerings, Seed & Contributions", queries: [
    { Model: MinistryOffering, dateField: "date", amountField: "amount" },
    { Model: OrganisationContribution, dateField: "date", amountField: "amount", extraMatch: { entityType: "ministry" } }
  ] },
  { key: "projectContributions", label: "Fundraising Contributions & Pledges", Model: ProjectContribution, dateField: "date", amountField: "amount" },
  { key: "welfareContributions", label: "Welfare Contributions", Model: WelfareContributions, dateField: "date", amountField: "amount" },
  { key: "outreachSupport", label: "Outreach Support", Model: OutreachSupport, dateField: "date", amountField: "amount" },
  { key: "specialFunds", label: "Special Funds", Model: SpecialFund, dateField: "givingDate", amountField: "totalAmount" },
  { key: "businessIncome", label: "Business Ventures Income", Model: BusinessIncome, dateField: "date", amountField: "amount" },
  { key: "otherIncome", label: "Other Income", Model: Income, dateField: "dateReceived", amountField: "amount" },
];

// Pledge payments roll up into their scope's income line: churchProject pledges
// -> Fundraising, program pledges -> Programs Offerings. Unscoped pledges
// aren't allowed and count nowhere.
const PLEDGE_SPLIT_BY_KEY = {
  projectContributions: "project",
  programOfferings: "program"
};

const EXPENSE_SOURCES = [
  { key: "generalExpenses", label: "General Expenses", Model: GeneralExpenses, dateField: "date", amountField: "amount",
    extraMatch: { cell: null, department: null, group: null, ministry: null, event: null, outreach: null } },
  { key: "programExpenses", label: "Programs Expenses", Model: GeneralExpenses, dateField: "date", amountField: "amount",
    extraMatch: { event: { $type: "objectId" } } },
  { key: "cellExpenses", label: "Cell Expenses", Model: GeneralExpenses, dateField: "date", amountField: "amount",
    extraMatch: { cell: { $type: "objectId" } } },
  { key: "departmentExpenses", label: "Department Expenses", Model: GeneralExpenses, dateField: "date", amountField: "amount",
    extraMatch: { department: { $type: "objectId" } } },
  { key: "groupExpenses", label: "Groups Expenses", Model: GeneralExpenses, dateField: "date", amountField: "amount",
    extraMatch: { group: { $type: "objectId" } } },
  { key: "ministryExpenses", label: "Ministry Expenses", Model: GeneralExpenses, dateField: "date", amountField: "amount",
    extraMatch: { ministry: { $type: "objectId" } } },
  { key: "outreachExpenses", label: "Outreach Expenses", Model: GeneralExpenses, dateField: "date", amountField: "amount",
    extraMatch: { outreach: { $type: "objectId" } } },
  { key: "welfareDisbursements", label: "Welfare Disbursements", Model: WelfareDisbursements, dateField: "date", amountField: "amount" },
  { key: "projectExpenses", label: "Fundraising Expenses", Model: ProjectExpense, dateField: "date", amountField: "amount" },
  { key: "businessExpenses", label: "Business Ventures Expenses", Model: BusinessExpenses, dateField: "date", amountField: "amount" },
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

function resolveFinancePeriod(period, { month, year } = {}) {
  const now = new Date();
  const p = String(period || "").toLowerCase();

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

  // Month + year selection: "March 2026". Defaults to the current month.
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const monthIdx = Number.isInteger(m) && m >= 1 && m <= 12 ? m - 1 : now.getMonth();
  const yearNum = Number.isInteger(y) && y >= 1900 && y <= 2200 ? y : now.getFullYear();
  const start = new Date(yearNum, monthIdx, 1);
  const end = new Date(yearNum, monthIdx + 1, 0, 23, 59, 59, 999);
  return {
    start,
    end,
    label: start.toLocaleDateString("en", { month: "long", year: "numeric" }),
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
  const kpiMatch = { ...baseMatch, status: { $in: MEMBER_ALL_STATUSES } };

  const [totalMembers, newThisMonth, activeMembers, inactiveMembers, monthlyAgg] = await Promise.all([
    scopeIds.length ? Member.countDocuments(kpiMatch) : 0,
    scopeIds.length ? Member.countDocuments({ ...kpiMatch, dateJoined: { $gte: startOfMonth } }) : 0,
    scopeIds.length ? Member.countDocuments({ ...kpiMatch, status: { $in: MEMBER_ACTIVE_STATUSES } }) : 0,
    scopeIds.length ? Member.countDocuments({ ...kpiMatch, status: { $in: MEMBER_INACTIVE_STATUSES } }) : 0,
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
      inactiveMembers,
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

  // "This Sunday" mirrors the dashboard: members present + visitors attached to
  // that Sunday's sessions, attributed to the session's church.
  const [sundayAgg, visitorAgg, convertedAgg, outreachAgg, followUpAgg] = await Promise.all([
    allIds.length
      ? ServiceIndividualAttendance.aggregate([
          { $match: { church: { $in: allIds }, date: { $gte: sundayStart, $lte: sundayEnd } } },
          { $group: { _id: "$church", total: { $sum: { $size: { $ifNull: ["$presentMembers", []] } } }, serviceIds: { $push: "$_id" } } },
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
          { $match: { church: { $in: allIds }, createdAt: { $gte: startOfMonth } } },
          { $group: { _id: "$church", total: { $sum: 1 } } },
        ])
      : [],
    allIds.length
      ? OutreachFollowUp.aggregate([
          { $match: { church: { $in: allIds }, createdAt: { $gte: startOfMonth } } },
          { $group: { _id: "$church", total: { $sum: 1 } } },
        ])
      : [],
  ]);

  // Visitor headcount per Sunday service, folded back onto the service's church.
  const serviceToChurch = new Map();
  const sundayServiceIds = [];
  sundayAgg.forEach((r) => (r.serviceIds || []).forEach((sid) => {
    serviceToChurch.set(String(sid), String(r._id));
    sundayServiceIds.push(sid);
  }));
  const sundayVisitorAgg = sundayServiceIds.length
    ? await Visitor.aggregate([
        { $unwind: "$attendance" },
        { $match: { attendance: { $in: sundayServiceIds } } },
        { $group: { _id: "$attendance", count: { $sum: 1 } } },
      ])
    : [];
  const sundayVisitorByChurch = new Map();
  sundayVisitorAgg.forEach((v) => {
    const cid = serviceToChurch.get(String(v._id));
    if (cid) sundayVisitorByChurch.set(cid, (sundayVisitorByChurch.get(cid) || 0) + Number(v.count || 0));
  });

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
      thisSunday: (sundayMap.get(id) || 0) + (sundayVisitorByChurch.get(id) || 0),
      visitorsThisMonth: visitorMap.get(id) || 0,
      convertedVisitorsThisMonth: convertedMap.get(id) || 0,
      outreachThisMonth: outreachMap.get(id) || 0,
      followUpsThisMonth: followUpMap.get(id) || 0,
    };
  });

  return {
    period: { sundayDate: sundayStart, month: startOfMonth },
    kpis: {
      thisSunday:
        sundayAgg.reduce((s, r) => s + Number(r.total || 0), 0)
        + sundayVisitorAgg.reduce((s, r) => s + Number(r.count || 0), 0),
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
// Per-church income/expense totals across every money module — pledge payments
// included as real income. Used by the performance view; the detail breakdown
// in getBranchFinances computes its own per-source splits.
async function churchIncomeExpenseTotals({ ids, start, end }) {
  const dateMatch = (field) => {
    if (!start && !end) return {};
    const range = {};
    if (start) range.$gte = start;
    if (end) range.$lte = end;
    return { [field]: range };
  };
  const run = async (queries) => {
    const aggs = await Promise.all(
      queries.map(({ Model, dateField, amountField, extraMatch }) =>
        Model.aggregate([
          { $match: { church: { $in: ids }, ...dateMatch(dateField), ...(extraMatch || {}) } },
          { $group: { _id: "$church", total: { $sum: `$${amountField}` } } },
        ])
      )
    );
    const merged = new Map();
    aggs.flat().forEach((r) => {
      const id = String(r._id);
      merged.set(id, (merged.get(id) || 0) + Number(r.total || 0));
    });
    return merged;
  };
  const incomeQueries = INCOME_SOURCES.flatMap((s) => s.queries || [s]);
  incomeQueries.push({ Model: PledgePayment, dateField: "paymentDate", amountField: "amount" });
  const expenseQueries = EXPENSE_SOURCES.flatMap((s) => s.queries || [s]);
  const [incomeMap, expenseMap] = await Promise.all([run(incomeQueries), run(expenseQueries)]);
  return { incomeMap, expenseMap };
}

// HQ-facing branch scorecard: ranks every church on attendance engagement,
// member growth, visitor pipeline, outreach reach, and financial health.
async function getBranchPerformance({ churchId }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const sundayWindowStart = new Date(now.getTime() - 9 * 7 * 24 * 60 * 60 * 1000);

  const orgChurches = await getOrgChurches(churchId);
  const ids = orgChurches.map((c) => c._id);
  if (!ids.length) {
    return { period: { month: startOfMonth, sundays: 8 }, kpis: {}, branches: [] };
  }

  const memberMatch = { church: { $in: ids }, status: { $in: MEMBER_ALL_STATUSES } };

  const [
    memberAgg,
    newMemberAgg,
    sundaySessionAgg,
    visitorAgg,
    convertedAgg,
    reachedAgg,
    { incomeMap, expenseMap },
  ] = await Promise.all([
    Member.aggregate([{ $match: memberMatch }, { $group: { _id: "$church", n: { $sum: 1 } } }]),
    Member.aggregate([{ $match: { ...memberMatch, dateJoined: { $gte: startOfMonth } } }, { $group: { _id: "$church", n: { $sum: 1 } } }]),
    // Sunday headcount per session so the average isn't skewed by service count
    ServiceIndividualAttendance.aggregate([
      {
        $match: {
          church: { $in: ids },
          date: { $gte: sundayWindowStart, $lte: now },
          $or: [{ serviceType: { $regex: /^Sunday/i } }, { $expr: { $eq: [{ $dayOfWeek: "$date" }, 1] } }]
        }
      },
      { $group: { _id: { church: "$church", day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } }, total: { $sum: { $size: { $ifNull: ["$presentMembers", []] } } }, serviceIds: { $push: "$_id" } } },
    ]),
    Visitor.aggregate([
      { $match: { church: { $in: ids }, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: "$church", n: { $sum: 1 } } }
    ]),
    Member.aggregate([
      { $match: { church: { $in: ids }, visitorId: { $ne: null }, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: "$church", n: { $sum: 1 } } }
    ]),
    OutreachProspect.aggregate([
      { $match: { church: { $in: ids }, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: "$church", n: { $sum: 1 } } }
    ]),
    churchIncomeExpenseTotals({ ids, start: startOfMonth, end: endOfMonth }),
  ]);

  // Visitors attached to the Sunday sessions, attributed to each session's church
  const serviceToChurch = new Map();
  const sundayServiceIds = [];
  sundaySessionAgg.forEach((r) => (r.serviceIds || []).forEach((sid) => {
    serviceToChurch.set(String(sid), String(r._id.church));
    sundayServiceIds.push(sid);
  }));
  const sundayVisitorAgg = sundayServiceIds.length
    ? await Visitor.aggregate([
        { $unwind: "$attendance" },
        { $match: { attendance: { $in: sundayServiceIds } } },
        { $group: { _id: "$attendance", n: { $sum: 1 } } }
      ])
    : [];
  const sundayVisitorByService = new Map(sundayVisitorAgg.map((r) => [String(r._id), Number(r.n || 0)]));

  // Average per-Sunday headcount (members + visitors) per church
  const sundayByChurch = new Map();
  sundaySessionAgg.forEach((r) => {
    const cid = String(r._id.church);
    const visitors = (r.serviceIds || []).reduce((s, sid) => s + (sundayVisitorByService.get(String(sid)) || 0), 0);
    const cur = sundayByChurch.get(cid) || { total: 0, sundays: 0 };
    cur.total += Number(r.total || 0) + visitors;
    cur.sundays += 1;
    sundayByChurch.set(cid, cur);
  });

  const countMap = (rows) => new Map(rows.map((r) => [String(r._id), Number(r.n || 0)]));
  const membersMap = countMap(memberAgg);
  const newMembersMap = countMap(newMemberAgg);
  const visitorsMap = countMap(visitorAgg);
  const convertedMap = countMap(convertedAgg);
  const reachedMap = countMap(reachedAgg);

  // Income-per-member ceiling across the org — the best church sets the bar so
  // the finance score is honest across different branch sizes/currencies.
  const incomePerMember = new Map();
  let maxIncomePerMember = 0;
  ids.forEach((id) => {
    const m = membersMap.get(String(id)) || 0;
    const ipm = m > 0 ? (incomeMap.get(String(id)) || 0) / m : 0;
    incomePerMember.set(String(id), ipm);
    if (ipm > maxIncomePerMember) maxIncomePerMember = ipm;
  });

  const branches = orgChurches.map((c) => {
    const id = String(c._id);
    const members = membersMap.get(id) || 0;
    const newMembers = newMembersMap.get(id) || 0;
    const visitors = visitorsMap.get(id) || 0;
    const converted = convertedMap.get(id) || 0;
    const reached = reachedMap.get(id) || 0;
    const sunday = sundayByChurch.get(id) || { total: 0, sundays: 0 };
    const avgSundayAttendance = sunday.sundays ? Math.round(sunday.total / sunday.sundays) : 0;
    const income = incomeMap.get(id) || 0;
    const expenses = expenseMap.get(id) || 0;
    const net = income - expenses;

    const clamp = (v, target) => (target > 0 ? Math.min(1, v / target) : 0);
    const scoreParts = {
      attendance: clamp(members ? avgSundayAttendance / members : 0, 0.7) * 30,
      growth: clamp(members ? newMembers / members : 0, 0.03) * 20,
      visitors: clamp(members ? visitors / members : 0, 0.05) * 15,
      outreach: clamp(members ? reached / members : 0, 0.05) * 10,
      finance: clamp(incomePerMember.get(id) || 0, maxIncomePerMember) * 20 + (net > 0 ? 5 : 0),
    };
    const score = Math.round(Object.values(scoreParts).reduce((s, v) => s + v, 0));
    const rating = score >= 75 ? "strong" : score >= 55 ? "healthy" : score >= 35 ? "watch" : "at-risk";

    return {
      _id: c._id,
      name: c.name,
      city: c.city || "",
      region: c.region || "",
      isHeadquarters: c.isHeadquarters,
      currency: c.currency || "GHS",
      members,
      newMembersThisMonth: newMembers,
      avgSundayAttendance,
      attendanceRate: members ? Math.round((avgSundayAttendance / members) * 100) : 0,
      visitorsThisMonth: visitors,
      convertedThisMonth: converted,
      peopleReachedThisMonth: reached,
      incomeThisMonth: income,
      expenseThisMonth: expenses,
      netThisMonth: net,
      score,
      scoreParts: {
        attendance: Math.round(scoreParts.attendance),
        growth: Math.round(scoreParts.growth),
        visitors: Math.round(scoreParts.visitors),
        outreach: Math.round(scoreParts.outreach),
        finance: Math.round(scoreParts.finance),
      },
      rating,
    };
  }).sort((a, b) => b.score - a.score);

  const needsAttention = branches.filter((b) => b.rating === "watch" || b.rating === "at-risk").length;
  const top = branches[0] || null;
  const avgScore = branches.length
    ? Math.round(branches.reduce((s, b) => s + b.score, 0) / branches.length)
    : 0;

  return {
    period: { month: startOfMonth, label: now.toLocaleDateString("en", { month: "long", year: "numeric" }), sundays: 8 },
    kpis: {
      topBranch: top ? { name: top.name, score: top.score } : null,
      averageScore: avgScore,
      needsAttention,
      branchesTracked: branches.length,
    },
    branches,
  };
}

async function getBranchFinances({ churchId, period, month, year }) {
  const { start, end, label } = resolveFinancePeriod(period, { month, year });

  const orgChurches = await getOrgChurches(churchId);
  const ids = orgChurches.map((c) => c._id);

  const dateMatch = (field) => {
    if (!start && !end) return {};
    const range = {};
    if (start) range.$gte = start;
    if (end) range.$lte = end;
    return { [field]: range };
  };

  const sumByChurch = async (source) => {
    if (!ids.length) return [];
    const queries = source.queries || [source];
    const aggs = await Promise.all(
      queries.map(({ Model, dateField, amountField, extraMatch }) =>
        Model.aggregate([
          { $match: { church: { $in: ids }, ...dateMatch(dateField), ...(extraMatch || {}) } },
          { $group: { _id: "$church", total: { $sum: `$${amountField}` } } },
        ])
      )
    );
    const merged = new Map();
    aggs.flat().forEach((r) => {
      const id = String(r._id);
      merged.set(id, (merged.get(id) || 0) + Number(r.total || 0));
    });
    return [...merged.entries()].map(([_id, total]) => ({ _id, total }));
  };

  const hasField = (path) => ({ $eq: [{ $type: path }, "objectId"] });
  const lacksField = (path) => ({ $ne: [{ $type: path }, "objectId"] });

  const pledgePaymentsByChurch = ids.length
    ? PledgePayment.aggregate([
        { $match: { church: { $in: ids }, ...dateMatch("paymentDate") } },
        { $lookup: { from: "pledges", localField: "pledge", foreignField: "_id", as: "pledgeDoc" } },
        { $unwind: "$pledgeDoc" },
        {
          $group: {
            _id: "$church",
            project: { $sum: { $cond: [hasField("$pledgeDoc.churchProject"), "$amount", 0] } },
            program: {
              $sum: {
                $cond: [
                  { $and: [hasField("$pledgeDoc.event"), lacksField("$pledgeDoc.churchProject")] },
                  "$amount",
                  0
                ]
              }
            },
            unscoped: {
              $sum: {
                $cond: [
                  { $and: [lacksField("$pledgeDoc.churchProject"), lacksField("$pledgeDoc.event")] },
                  "$amount",
                  0
                ]
              }
            }
          }
        }
      ])
    : [];

  const [incomeAggs, expenseAggs, pledgeAggs, budgets] = await Promise.all([
    Promise.all(INCOME_SOURCES.map((s) => sumByChurch(s))),
    Promise.all(EXPENSE_SOURCES.map((s) => sumByChurch(s))),
    pledgePaymentsByChurch,
    ids.length
      ? Budget.find({ church: { $in: ids } }).select("fiscalYear periodFrom periodTo items").lean()
      : [],
  ]);

  // Total Budget Plan: planned item amounts whose range overlaps the selected
  // period. Item dates win, then the budget period, then the fiscal year.
  const totalBudgetPlan = (budgets || []).reduce((sum, b) => {
    const bStart = b.periodFrom || new Date(b.fiscalYear, 0, 1);
    const bEnd = b.periodTo || new Date(b.fiscalYear, 11, 31, 23, 59, 59, 999);
    return sum + (b.items || []).reduce((s, it) => {
      const iStart = it.dateFrom || bStart;
      const iEnd = it.dateTo || bEnd;
      if (end && iStart > end) return s;
      if (start && iEnd < start) return s;
      return s + Number(it.amount || 0);
    }, 0);
  }, 0);

  const toMap = (rows) => new Map((rows || []).map((r) => [String(r._id), Number(r.total || 0)]));

  const pledgeSplitMap = new Map(
    (pledgeAggs || []).map((r) => [
      String(r._id),
      { project: Number(r.project || 0), program: Number(r.program || 0), unscoped: Number(r.unscoped || 0) }
    ])
  );

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
      const pledgeKey = PLEDGE_SPLIT_BY_KEY[key];
      const v = (map.get(id) || 0) + (pledgeKey ? Number(pledgeSplitMap.get(id)?.[pledgeKey] || 0) : 0);
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

  const pledgeTotals = [...pledgeSplitMap.values()].reduce(
    (acc, s) => ({
      project: acc.project + s.project,
      program: acc.program + s.program,
      unscoped: acc.unscoped + s.unscoped
    }),
    { project: 0, program: 0, unscoped: 0 }
  );

  const incomeBySource = sumSource(incomeMaps).map((r) => ({
    ...r,
    total: r.total + Number(pledgeTotals[PLEDGE_SPLIT_BY_KEY[r.key]] || 0),
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
      totalBudgetPlan,
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

export { getBranchesPaginated, getBranchKPIs, getBranchesConsolidated, getBranchMembers, getBranchAttendanceRecords, getBranchFinances, getBranchPerformance };
