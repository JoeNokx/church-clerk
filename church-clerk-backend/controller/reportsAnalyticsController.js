import Member from "../models/memberModel.js";
import Attendance from "../models/attendanceModel.js";
import Visitor from "../models/visitorsModel.js";

import TitheIndividual from "../models/financeModel/tithesModel/titheIndividualModel.js";
import TitheAggregate from "../models/financeModel/tithesModel/titheAggregateModel.js";
import Offering from "../models/financeModel/offeringModel.js";
import SpecialFund from "../models/financeModel/specialFundModel.js";
import WelfareContributions from "../models/financeModel/welfareModel/welfareContributionModel.js";
import WelfareDisbursements from "../models/financeModel/welfareModel/welfareDisbursementModel.js";
import ProjectContribution from "../models/financeModel/projectModel/projectContributionModel.js";
import ProjectExpense from "../models/financeModel/projectModel/projectExpenseModel.js";
import BusinessIncome from "../models/financeModel/businessModel/businessIncomeModel.js";
import BusinessExpenses from "../models/financeModel/businessModel/businessExpensesModel.js";
import GeneralExpenses from "../models/generalExpenseModel.js";
import EventOffering from "../models/eventModel/eventOfferingModel.js";
import CellOffering from "../models/organisationModel/cellOfferingModel.js";
import GroupOffering from "../models/organisationModel/groupOfferingModel.js";
import DepartmentOffering from "../models/organisationModel/departmentOfferingModel.js";
import MinistryOffering from "../models/organisationModel/ministryOfferingModel.js";
import PledgePayment from "../models/financeModel/pledgeModel/pledgePaymentModel.js";
import Income from "../models/financeModel/incomeExpenseModel/incomeModel.js";
import Expense from "../models/financeModel/incomeExpenseModel/expenseModel.js";
import Budget from "../models/financeModel/budgetingModel.js";
import SavedReport from "../models/savedReportModel.js";

import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function clampToNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function percentChange(current, previous) {
  const prev = clampToNumber(previous);
  const curr = clampToNumber(current);
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function toSafeFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function formatCurrency(value) {
  const v = clampToNumber(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2
  }).format(v);
}

function monthKeyToShortLabel(key) {
  const [y, m] = String(key || "").split("-");
  const year = Number(y);
  const monthIdx = Number(m) - 1;
  if (!year || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return String(key || "");
  return new Date(year, monthIdx, 1).toLocaleString(undefined, { month: "short" });
}

function parseDateParam(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function resolvePeriod({ query }) {
  const fromRaw = query?.from;
  const toRaw = query?.to;

  const from = parseDateParam(fromRaw);
  const to = parseDateParam(toRaw);

  if (from && to && from > to) {
    return { error: "Invalid date range: from must be before to" };
  }

  const now = new Date();

  const periodStart = startOfDay(from || new Date(now.getFullYear(), now.getMonth(), 1));
  const periodEnd = endOfDay(to || now);

  const durationMs = periodEnd.getTime() - periodStart.getTime();
  const prevEnd = endOfDay(new Date(periodStart.getTime() - 24 * 60 * 60 * 1000));
  const prevStart = startOfDay(new Date(prevEnd.getTime() - durationMs));

  const label = `${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`;

  return { periodStart, periodEnd, prevStart, prevEnd, label };
}

async function sumByPeriod({ Model, churchId, dateField, amountField, periodStart, periodEnd }) {
  const match = {
    church: churchId,
    [dateField]: { $gte: periodStart, $lte: periodEnd }
  };

  const res = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, totalAmount: { $sum: `$${amountField}` } } }
  ]);

  return clampToNumber(res?.[0]?.totalAmount);
}

async function sumAll({ Model, churchId, amountField, extraMatch = {} }) {
  const match = {
    church: churchId,
    ...extraMatch
  };

  const res = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, totalAmount: { $sum: `$${amountField}` } } }
  ]);

  return clampToNumber(res?.[0]?.totalAmount);
}

async function countByPeriod({ Model, churchId, dateField, periodStart, periodEnd, extraMatch = {} }) {
  const match = {
    church: churchId,
    ...extraMatch,
    [dateField]: { $gte: periodStart, $lte: periodEnd }
  };
  return await Model.countDocuments(match);
}

function monthKey(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function monthKeyToLabel(key) {
  const [y, m] = String(key || "").split("-");
  const year = Number(y);
  const monthIdx = Number(m) - 1;
  if (!year || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return String(key || "");
  return new Date(year, monthIdx, 1).toLocaleString(undefined, { month: "short", year: "numeric" });
}

async function aggregateMonthlySum({ Model, churchId, dateField, amountField, periodStart, periodEnd }) {
  const match = {
    church: churchId,
    [dateField]: { $gte: periodStart, $lte: periodEnd }
  };

  const rows = await Model.aggregate([
    { $match: match },
    {
      $addFields: {
        y: { $year: `$${dateField}` },
        m: { $month: `$${dateField}` }
      }
    },
    {
      $group: {
        _id: { y: "$y", m: "$m" },
        total: { $sum: `$${amountField}` }
      }
    },
    { $sort: { "_id.y": 1, "_id.m": 1 } }
  ]);

  const map = new Map();
  rows.forEach((r) => {
    const key = `${r?._id?.y}-${String(r?._id?.m || 0).padStart(2, "0")}`;
    map.set(key, clampToNumber(r?.total));
  });

  return map;
}

async function aggregateMonthlyCount({ Model, churchId, dateField, periodStart, periodEnd, extraMatch = {} }) {
  const match = {
    church: churchId,
    ...extraMatch,
    [dateField]: { $gte: periodStart, $lte: periodEnd }
  };

  const rows = await Model.aggregate([
    { $match: match },
    {
      $addFields: {
        y: { $year: `$${dateField}` },
        m: { $month: `$${dateField}` }
      }
    },
    {
      $group: {
        _id: { y: "$y", m: "$m" },
        total: { $sum: 1 }
      }
    },
    { $sort: { "_id.y": 1, "_id.m": 1 } }
  ]);

  const map = new Map();
  rows.forEach((r) => {
    const key = `${r?._id?.y}-${String(r?._id?.m || 0).padStart(2, "0")}`;
    map.set(key, clampToNumber(r?.total));
  });

  return map;
}

function mergeMapsSum(maps) {
  const out = new Map();
  (maps || []).forEach((m) => {
    if (!m) return;
    for (const [k, v] of m.entries()) {
      out.set(k, clampToNumber(out.get(k)) + clampToNumber(v));
    }
  });
  return out;
}

function enumerateMonthKeys(periodStart, periodEnd) {
  const keys = [];
  const d = new Date(periodStart);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);

  const end = new Date(periodEnd);
  end.setDate(1);
  end.setHours(0, 0, 0, 0);

  while (d <= end) {
    keys.push(monthKey(d));
    d.setMonth(d.getMonth() + 1);
  }

  return keys;
}

function mapToSeries(keys, map, valueKey) {
  return keys.map((k) => ({
    monthKey: k,
    month: monthKeyToLabel(k),
    [valueKey]: clampToNumber(map?.get(k))
  }));
}

const INCOME_SOURCES = [
  { Model: TitheIndividual, dateField: "date", amountField: "amount" },
  { Model: TitheAggregate, dateField: "date", amountField: "amount" },
  { Model: Offering, dateField: "serviceDate", amountField: "amount" },
  { Model: SpecialFund, dateField: "givingDate", amountField: "totalAmount" },
  { Model: WelfareContributions, dateField: "date", amountField: "amount" },
  { Model: ProjectContribution, dateField: "date", amountField: "amount" },
  { Model: BusinessIncome, dateField: "date", amountField: "amount" },
  { Model: EventOffering, dateField: "offeringDate", amountField: "amount" },
  { Model: CellOffering, dateField: "date", amountField: "amount" },
  { Model: GroupOffering, dateField: "date", amountField: "amount" },
  { Model: DepartmentOffering, dateField: "date", amountField: "amount" },
  { Model: MinistryOffering, dateField: "date", amountField: "amount" },
  { Model: PledgePayment, dateField: "paymentDate", amountField: "amount" },
  { Model: Income, dateField: "dateReceived", amountField: "amount" }
];

const EXPENSE_SOURCES = [
  { Model: GeneralExpenses, dateField: "date", amountField: "amount" },
  { Model: WelfareDisbursements, dateField: "date", amountField: "amount" },
  { Model: ProjectExpense, dateField: "date", amountField: "amount" },
  { Model: BusinessExpenses, dateField: "date", amountField: "amount" },
  { Model: Expense, dateField: "dateSpent", amountField: "amount" }
];

async function computeKpis({ churchId, periodStart, periodEnd, prevStart, prevEnd }) {
  const incomeSums = await Promise.all(
    INCOME_SOURCES.map((s) =>
      sumByPeriod({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart,
        periodEnd
      })
    )
  );

  const expenseSums = await Promise.all(
    EXPENSE_SOURCES.map((s) =>
      sumByPeriod({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart,
        periodEnd
      })
    )
  );

  const prevIncomeSums = await Promise.all(
    INCOME_SOURCES.map((s) =>
      sumByPeriod({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart: prevStart,
        periodEnd: prevEnd
      })
    )
  );

  const prevExpenseSums = await Promise.all(
    EXPENSE_SOURCES.map((s) =>
      sumByPeriod({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart: prevStart,
        periodEnd: prevEnd
      })
    )
  );

  const totalIncome = incomeSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const totalExpenses = expenseSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const surplus = totalIncome - totalExpenses;

  const prevTotalIncome = prevIncomeSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const prevTotalExpenses = prevExpenseSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const prevSurplus = prevTotalIncome - prevTotalExpenses;

  const newMembers = await countByPeriod({
    Model: Member,
    churchId,
    dateField: "dateJoined",
    periodStart,
    periodEnd
  });

  const prevNewMembers = await countByPeriod({
    Model: Member,
    churchId,
    dateField: "dateJoined",
    periodStart: prevStart,
    periodEnd: prevEnd
  });

  const attendanceTotal = await Attendance.aggregate([
    {
      $match: {
        church: churchId,
        serviceDate: { $gte: periodStart, $lte: periodEnd }
      }
    },
    { $group: { _id: null, total: { $sum: "$totalNumber" } } }
  ]);

  const prevAttendanceTotal = await Attendance.aggregate([
    {
      $match: {
        church: churchId,
        serviceDate: { $gte: prevStart, $lte: prevEnd }
      }
    },
    { $group: { _id: null, total: { $sum: "$totalNumber" } } }
  ]);

  const totalAttendance = clampToNumber(attendanceTotal?.[0]?.total);
  const prevTotalAttendance = clampToNumber(prevAttendanceTotal?.[0]?.total);

  return {
    totalIncome,
    totalExpenses,
    surplus,
    newMembers,
    totalAttendance,
    change: {
      totalIncome: percentChange(totalIncome, prevTotalIncome),
      totalExpenses: percentChange(totalExpenses, prevTotalExpenses),
      surplus: percentChange(surplus, prevSurplus),
      newMembers: percentChange(newMembers, prevNewMembers),
      totalAttendance: percentChange(totalAttendance, prevTotalAttendance)
    }
  };
}

async function computeOverallKpis({ churchId }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const pctChange = (current, previous) => {
    const c = clampToNumber(current);
    const p = clampToNumber(previous);
    if (!p) return c > 0 ? 100 : 0;
    return ((c - p) / p) * 100;
  };

  const [
    incomeSums,
    prevIncomeSums,
    expenseSums,
    prevExpenseSums,
    totalNewMembers,
    prevNewMembers,
    totalVisitors,
    prevVisitors
  ] = await Promise.all([
    Promise.all(INCOME_SOURCES.map((s) => sumAll({ Model: s.Model, churchId, amountField: s.amountField }))),
    Promise.all(INCOME_SOURCES.map((s) => sumAll({ Model: s.Model, churchId, amountField: s.amountField, extraMatch: { [s.dateField]: { $lt: startOfMonth } } }))),
    Promise.all(EXPENSE_SOURCES.map((s) => sumAll({ Model: s.Model, churchId, amountField: s.amountField }))),
    Promise.all(EXPENSE_SOURCES.map((s) => sumAll({ Model: s.Model, churchId, amountField: s.amountField, extraMatch: { [s.dateField]: { $lt: startOfMonth } } }))),
    Member.countDocuments({ church: churchId }),
    Member.countDocuments({ church: churchId, dateJoined: { $lt: startOfMonth } }),
    Visitor.countDocuments({ church: churchId }),
    Visitor.countDocuments({ church: churchId, createdAt: { $lt: startOfMonth } })
  ]);

  const totalIncome = incomeSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const prevTotalIncome = prevIncomeSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const totalExpenses = expenseSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const prevTotalExpenses = prevExpenseSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const surplus = totalIncome - totalExpenses;
  const prevSurplus = prevTotalIncome - prevTotalExpenses;

  const change = {
    totalIncome: pctChange(totalIncome, prevTotalIncome),
    totalExpenses: pctChange(totalExpenses, prevTotalExpenses),
    surplus: pctChange(surplus, prevSurplus),
    newMembers: pctChange(totalNewMembers, prevNewMembers),
    visitors: pctChange(totalVisitors, prevVisitors)
  };

  const diff = {
    newMembers: totalNewMembers - prevNewMembers,
    visitors: totalVisitors - prevVisitors
  };

  return {
    totalIncome,
    totalExpenses,
    surplus,
    newMembers: totalNewMembers,
    visitors: totalVisitors,
    change,
    diff
  };
}

async function aggregateMonthlyCountFlexible({ Model, churchId, dateExpr, periodStart, periodEnd, extraMatch = {} }) {
  const match = {
    church: churchId,
    ...extraMatch
  };

  const rows = await Model.aggregate([
    { $match: match },
    { $addFields: { __dt: dateExpr } },
    { $match: { __dt: { $ne: null, $gte: periodStart, $lte: periodEnd } } },
    {
      $addFields: {
        y: { $year: "$__dt" },
        m: { $month: "$__dt" }
      }
    },
    {
      $group: {
        _id: { y: "$y", m: "$m" },
        total: { $sum: 1 }
      }
    },
    { $sort: { "_id.y": 1, "_id.m": 1 } }
  ]);

  const map = new Map();
  rows.forEach((r) => {
    const key = `${r?._id?.y}-${String(r?._id?.m || 0).padStart(2, "0")}`;
    map.set(key, clampToNumber(r?.total));
  });

  return map;
}

async function computeYearlyAnalytics({ churchId, year }) {
  const safeYear = Number(year);
  const y = Number.isFinite(safeYear) && safeYear > 1900 ? safeYear : new Date().getFullYear();

  const periodStart = startOfDay(new Date(y, 0, 1));
  const periodEnd = endOfDay(new Date(y, 11, 31));

  const keys = enumerateMonthKeys(periodStart, periodEnd);

  const incomeMaps = await Promise.all(
    INCOME_SOURCES.map((s) =>
      aggregateMonthlySum({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart,
        periodEnd
      })
    )
  );

  const expenseMaps = await Promise.all(
    EXPENSE_SOURCES.map((s) =>
      aggregateMonthlySum({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart,
        periodEnd
      })
    )
  );

  const offeringSources = [
    { Model: Offering, dateField: "serviceDate", amountField: "amount" },
    { Model: EventOffering, dateField: "offeringDate", amountField: "amount" },
    { Model: CellOffering, dateField: "date", amountField: "amount" },
    { Model: GroupOffering, dateField: "date", amountField: "amount" },
    { Model: DepartmentOffering, dateField: "date", amountField: "amount" },
    { Model: MinistryOffering, dateField: "date", amountField: "amount" }
  ];

  const titheSources = [
    { Model: TitheIndividual, dateField: "date", amountField: "amount" },
    { Model: TitheAggregate, dateField: "date", amountField: "amount" }
  ];

  const [offeringMaps, titheMaps] = await Promise.all([
    Promise.all(
      offeringSources.map((s) =>
        aggregateMonthlySum({
          Model: s.Model,
          churchId,
          dateField: s.dateField,
          amountField: s.amountField,
          periodStart,
          periodEnd
        })
      )
    ),
    Promise.all(
      titheSources.map((s) =>
        aggregateMonthlySum({
          Model: s.Model,
          churchId,
          dateField: s.dateField,
          amountField: s.amountField,
          periodStart,
          periodEnd
        })
      )
    )
  ]);

  const attendanceMap = await aggregateMonthlySum({
    Model: Attendance,
    churchId,
    dateField: "serviceDate",
    amountField: "totalNumber",
    periodStart,
    periodEnd
  });

  const visitorsMap = await aggregateMonthlyCountFlexible({
    Model: Visitor,
    churchId,
    dateExpr: { $ifNull: ["$serviceDate", "$createdAt"] },
    periodStart,
    periodEnd
  });

  const newMembersMap = await aggregateMonthlyCount({
    Model: Member,
    churchId,
    dateField: "dateJoined",
    periodStart,
    periodEnd
  });

  const [welfareContributionsMap, welfareDisbursementsMap, specialFundsMap] = await Promise.all([
    aggregateMonthlySum({
      Model: WelfareContributions,
      churchId,
      dateField: "date",
      amountField: "amount",
      periodStart,
      periodEnd
    }),
    aggregateMonthlySum({
      Model: WelfareDisbursements,
      churchId,
      dateField: "date",
      amountField: "amount",
      periodStart,
      periodEnd
    }),
    aggregateMonthlySum({
      Model: SpecialFund,
      churchId,
      dateField: "givingDate",
      amountField: "totalAmount",
      periodStart,
      periodEnd
    })
  ]);

  const yearBudgets = await Budget.find({ church: churchId, fiscalYear: y }).lean();

  // Recommendation #5: period-aware monthly budget distribution.
  // For each month key, sum the pro-rated share from every budget whose period overlaps that month.
  // If a budget has no period dates, distribute evenly across all 12 months of the fiscal year.
  const monthlyBudgetMap = new Map();
  for (const k of keys) {
    const [ky, km] = String(k).split("-");
    const mStart = new Date(Number(ky), Number(km) - 1, 1);
    const mEnd = new Date(Number(ky), Number(km), 0, 23, 59, 59, 999);
    let monthTotal = 0;

    for (const b of yearBudgets) {
      const bFrom = b.periodFrom ? new Date(b.periodFrom) : new Date(Number(ky), 0, 1);
      const bTo = b.periodTo ? new Date(b.periodTo) : new Date(Number(ky), 11, 31, 23, 59, 59, 999);

      // Only count if this month overlaps the budget period
      if (mStart > bTo || mEnd < bFrom) continue;

      const expenseTotal = (b.items || [])
        .filter((item) => item.type === "expense")
        .reduce((s, item) => s + clampToNumber(item.amount), 0);

      // Count how many calendar months the budget spans
      const spanMonths = Math.max(
        1,
        (bTo.getFullYear() - bFrom.getFullYear()) * 12 +
          (bTo.getMonth() - bFrom.getMonth()) + 1
      );
      monthTotal += expenseTotal / spanMonths;
    }

    monthlyBudgetMap.set(k, Math.round(monthTotal * 100) / 100);
  }

  const incomeTotalMap = mergeMapsSum(incomeMaps);
  const expenseTotalMap = mergeMapsSum(expenseMaps);
  const offeringTotalMap = mergeMapsSum(offeringMaps);
  const titheTotalMap = mergeMapsSum(titheMaps);

  const monthEnds = keys.map((k) => {
    const [yy, mm] = String(k).split("-");
    const yearNum = Number(yy);
    const monthIdx = Number(mm) - 1;
    return endOfDay(new Date(yearNum, monthIdx + 1, 0));
  });

  const totalMembersCounts = await Promise.all(
    monthEnds.map((end) =>
      Member.countDocuments({
        church: churchId,
        dateJoined: { $lte: end }
      })
    )
  );

  const series = keys.map((k, idx) => ({
    monthKey: k,
    month: monthKeyToShortLabel(k),
    income: clampToNumber(incomeTotalMap.get(k)),
    expenses: clampToNumber(expenseTotalMap.get(k)),
    offering: clampToNumber(offeringTotalMap.get(k)),
    tithe: clampToNumber(titheTotalMap.get(k)),
    specialFunds: clampToNumber(specialFundsMap.get(k)),
    welfareContributions: clampToNumber(welfareContributionsMap.get(k)),
    welfareDisbursements: clampToNumber(welfareDisbursementsMap.get(k)),
    budget: clampToNumber(monthlyBudgetMap.get(k)),
    expenditure: clampToNumber(expenseTotalMap.get(k)),
    totalMembers: clampToNumber(totalMembersCounts?.[idx]),
    newMembers: clampToNumber(newMembersMap.get(k)),
    attendance: clampToNumber(attendanceMap.get(k)),
    visitors: clampToNumber(visitorsMap.get(k))
  }));

  return {
    year: y,
    series
  };
}

function resolveReportRange({ query }) {
  const fromRaw = query?.from;
  const toRaw = query?.to;

  const from = parseDateParam(fromRaw);
  const to = parseDateParam(toRaw);

  if (from && to && from > to) {
    return { error: "Invalid date range: from must be before to" };
  }

  if (!from && !to) {
    return { from: null, to: null };
  }

  const single = from || to;
  if (single && (!from || !to)) {
    return { from: startOfDay(single), to: endOfDay(single) };
  }

  return { from: startOfDay(from), to: endOfDay(to) };
}

async function buildModuleReport({ moduleKey, churchId, from, to }) {
  const module = String(moduleKey || "").trim().toLowerCase();

  const rangeMatch = (field) => {
    if (!from || !to) return {};
    return { [field]: { $gte: from, $lte: to } };
  };

  if (module === "members") {
    const match = { church: churchId, ...rangeMatch("dateJoined") };
    const rows = await Member.find(match)
      .select("firstName lastName phoneNumber email gender status dateJoined")
      .sort({ dateJoined: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Members",
      columns: [
        { key: "name", label: "Name" },
        { key: "phoneNumber", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "gender", label: "Gender" },
        { key: "status", label: "Status" },
        { key: "dateJoined", label: "Date Joined" }
      ],
      rows: rows.map((r) => ({
        name: [r?.firstName, r?.lastName].filter(Boolean).join(" ") || "—",
        phoneNumber: r?.phoneNumber || "—",
        email: r?.email || "—",
        gender: r?.gender || "—",
        status: r?.status || "—",
        dateJoined: r?.dateJoined ? new Date(r.dateJoined).toISOString().slice(0, 10) : "—"
      }))
    };
  }

  if (module === "attendance" || module === "attendance-total") {
    const match = { church: churchId, ...rangeMatch("serviceDate") };
    const rows = await Attendance.find(match)
      .select("serviceType serviceDate totalNumber mainSpeaker")
      .sort({ serviceDate: -1 })
      .limit(2000)
      .lean();

    return {
      title: module === "attendance-total" ? "Attendance (Total)" : "Attendance",
      columns: [
        { key: "serviceDate", label: "Date" },
        { key: "serviceType", label: "Service Type" },
        { key: "totalNumber", label: "Total" },
        { key: "mainSpeaker", label: "Speaker" }
      ],
      rows: rows.map((r) => ({
        serviceDate: r?.serviceDate ? new Date(r.serviceDate).toISOString().slice(0, 10) : "—",
        serviceType: r?.serviceType || "—",
        totalNumber: clampToNumber(r?.totalNumber),
        mainSpeaker: r?.mainSpeaker || "—"
      }))
    };
  }

  if (module === "tithe") {
    const match = { church: churchId, ...rangeMatch("date") };
    const [individuals, aggregates] = await Promise.all([
      TitheIndividual.find(match)
        .select("member payerName amount date paymentMethod")
        .populate("member", "firstName lastName")
        .sort({ date: -1 })
        .limit(2000)
        .lean(),
      TitheAggregate.find(match)
        .select("amount date description")
        .sort({ date: -1 })
        .limit(2000)
        .lean()
    ]);

    const rows = [
      ...(individuals || []).map((r) => ({
        type: "Individual",
        payer: r?.member ? [r.member?.firstName, r.member?.lastName].filter(Boolean).join(" ") : r?.payerName || "—",
        date: r?.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
        amount: clampToNumber(r?.amount),
        note: r?.paymentMethod || "—"
      })),
      ...(aggregates || []).map((r) => ({
        type: "Aggregate",
        payer: "—",
        date: r?.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
        amount: clampToNumber(r?.amount),
        note: r?.description || "—"
      }))
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    return {
      title: "Tithe",
      columns: [
        { key: "type", label: "Type" },
        { key: "payer", label: "Payer" },
        { key: "date", label: "Date" },
        { key: "amount", label: "Amount" },
        { key: "note", label: "Note" }
      ],
      rows
    };
  }

  if (module === "tithe-individual") {
    const match = { church: churchId, ...rangeMatch("date") };
    const individuals = await TitheIndividual.find(match)
      .select("member payerName amount date paymentMethod")
      .populate("member", "firstName lastName")
      .sort({ date: -1 })
      .limit(2000)
      .lean();

    const rows = (individuals || []).map((r) => ({
      payer: r?.member ? [r.member?.firstName, r.member?.lastName].filter(Boolean).join(" ") : r?.payerName || "—",
      date: r?.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
      amount: clampToNumber(r?.amount),
      paymentMethod: r?.paymentMethod || "—"
    }));

    const availableColumns = [
      { key: "payer", label: "Payer" },
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
      { key: "paymentMethod", label: "Payment Method" }
    ];

    return {
      title: "Tithe (Individual)",
      columns: availableColumns,
      availableColumns,
      rows
    };
  }

  if (module === "tithe-aggregate") {
    const match = { church: churchId, ...rangeMatch("date") };
    const aggregates = await TitheAggregate.find(match)
      .select("amount date description")
      .sort({ date: -1 })
      .limit(2000)
      .lean();

    const rows = (aggregates || []).map((r) => ({
      date: r?.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
      amount: clampToNumber(r?.amount),
      description: r?.description || "—"
    }));

    const availableColumns = [
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
      { key: "description", label: "Description" }
    ];

    return {
      title: "Tithe (Aggregate)",
      columns: availableColumns,
      availableColumns,
      rows
    };
  }

  if (module === "offerings") {
    const match = { church: churchId, ...rangeMatch("serviceDate") };
    const rows = await Offering.find(match)
      .select("serviceType offeringType serviceDate amount")
      .sort({ serviceDate: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Offerings",
      columns: [
        { key: "serviceDate", label: "Date" },
        { key: "serviceType", label: "Service Type" },
        { key: "offeringType", label: "Offering Type" },
        { key: "amount", label: "Amount" }
      ],
      rows: rows.map((r) => ({
        serviceDate: r?.serviceDate ? new Date(r.serviceDate).toISOString().slice(0, 10) : "—",
        serviceType: r?.serviceType || "—",
        offeringType: r?.offeringType || "—",
        amount: clampToNumber(r?.amount)
      }))
    };
  }

  if (module === "special-funds") {
    const match = { church: churchId, ...rangeMatch("givingDate") };
    const rows = await SpecialFund.find(match)
      .select("giverName category totalAmount givingDate description")
      .sort({ givingDate: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Special Funds",
      columns: [
        { key: "givingDate", label: "Date" },
        { key: "giverName", label: "Giver" },
        { key: "category", label: "Category" },
        { key: "totalAmount", label: "Amount" },
        { key: "description", label: "Description" }
      ],
      rows: rows.map((r) => ({
        givingDate: r?.givingDate ? new Date(r.givingDate).toISOString().slice(0, 10) : "—",
        giverName: r?.giverName || "—",
        category: r?.category || "—",
        totalAmount: clampToNumber(r?.totalAmount),
        description: r?.description || "—"
      }))
    };
  }

  if (module === "expenses") {
    const match = { church: churchId, ...rangeMatch("date") };
    const rows = await GeneralExpenses.find(match)
      .select("category amount description date paymentMethod")
      .sort({ date: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Expenses",
      columns: [
        { key: "date", label: "Date" },
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount" },
        { key: "paymentMethod", label: "Payment" },
        { key: "description", label: "Description" }
      ],
      rows: rows.map((r) => ({
        date: r?.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
        category: r?.category || "—",
        amount: clampToNumber(r?.amount),
        paymentMethod: r?.paymentMethod || "—",
        description: r?.description || "—"
      }))
    };
  }

  if (module === "pledges") {
    const match = { church: churchId, ...rangeMatch("pledgeDate") };
    const Pledge = (await import("../models/financeModel/pledgeModel/pledgeModel.js")).default;

    const rows = await Pledge.find(match)
      .select("name phoneNumber serviceType amount pledgeDate deadline status")
      .sort({ pledgeDate: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Pledges",
      columns: [
        { key: "pledgeDate", label: "Pledge Date" },
        { key: "name", label: "Name" },
        { key: "phoneNumber", label: "Phone" },
        { key: "serviceType", label: "Service Type" },
        { key: "amount", label: "Amount" },
        { key: "deadline", label: "Deadline" },
        { key: "status", label: "Status" }
      ],
      rows: rows.map((r) => ({
        pledgeDate: r?.pledgeDate ? new Date(r.pledgeDate).toISOString().slice(0, 10) : "—",
        name: r?.name || "—",
        phoneNumber: r?.phoneNumber || "—",
        serviceType: r?.serviceType || "—",
        amount: clampToNumber(r?.amount),
        deadline: r?.deadline ? new Date(r.deadline).toISOString().slice(0, 10) : "—",
        status: r?.status || "—"
      }))
    };
  }

  if (module === "welfare") {
    const match = { church: churchId, ...rangeMatch("date") };

    const [contribs, disburs] = await Promise.all([
      WelfareContributions.find(match)
        .select("member amount date paymentMethod")
        .populate("member", "firstName lastName")
        .sort({ date: -1 })
        .limit(2000)
        .lean(),
      WelfareDisbursements.find(match)
        .select("beneficiaryName category amount date paymentMethod description")
        .sort({ date: -1 })
        .limit(2000)
        .lean()
    ]);

    const rows = [
      ...(contribs || []).map((r) => ({
        type: "Contribution",
        name: r?.member ? [r.member?.firstName, r.member?.lastName].filter(Boolean).join(" ") : "—",
        category: "—",
        date: r?.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
        amount: clampToNumber(r?.amount),
        note: r?.paymentMethod || "—"
      })),
      ...(disburs || []).map((r) => ({
        type: "Disbursement",
        name: r?.beneficiaryName || "—",
        category: r?.category || "—",
        date: r?.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
        amount: clampToNumber(r?.amount),
        note: r?.description || "—"
      }))
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    return {
      title: "Welfare",
      columns: [
        { key: "type", label: "Type" },
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "date", label: "Date" },
        { key: "amount", label: "Amount" },
        { key: "note", label: "Note" }
      ],
      rows
    };
  }

  if (module === "business-ventures") {
    const BusinessVentures = (await import("../models/financeModel/businessModel/businessVenturesModel.js")).default;
    const match = { church: churchId, ...(from && to ? { createdAt: { $gte: from, $lte: to } } : {}) };

    const rows = await BusinessVentures.find(match)
      .select("businessName description manager phoneNumber createdAt")
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Business Ventures",
      columns: [
        { key: "createdAt", label: "Created" },
        { key: "businessName", label: "Business" },
        { key: "manager", label: "Manager" },
        { key: "phoneNumber", label: "Phone" },
        { key: "description", label: "Description" }
      ],
      rows: rows.map((r) => ({
        createdAt: r?.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "—",
        businessName: r?.businessName || "—",
        manager: r?.manager || "—",
        phoneNumber: r?.phoneNumber || "—",
        description: r?.description || "—"
      }))
    };
  }

  if (module === "church-projects") {
    const ChurchProject = (await import("../models/financeModel/projectModel/churchProjectModel.js")).default;
    const match = { church: churchId, ...(from && to ? { createdAt: { $gte: from, $lte: to } } : {}) };

    const rows = await ChurchProject.find(match)
      .select("name targetAmount status createdAt")
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Church Projects",
      columns: [
        { key: "createdAt", label: "Created" },
        { key: "name", label: "Project" },
        { key: "targetAmount", label: "Target" },
        { key: "status", label: "Status" }
      ],
      rows: rows.map((r) => ({
        createdAt: r?.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "—",
        name: r?.name || "—",
        targetAmount: clampToNumber(r?.targetAmount),
        status: r?.status || "—"
      }))
    };
  }

  if (module === "programs-events") {
    const Event = (await import("../models/eventModel.js")).default;
    const match = { church: churchId };

    if (from && to) {
      match.$or = [
        { dateFrom: { $gte: from, $lte: to } },
        { dateTo: { $gte: from, $lte: to } },
        { dateFrom: { $lte: from }, dateTo: { $gte: to } },
        { dateFrom: { $lte: to }, dateTo: { $exists: false } }
      ];
    }

    const rows = await Event.find(match)
      .select("title category venue dateFrom dateTo")
      .sort({ dateFrom: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Programs & Events",
      columns: [
        { key: "title", label: "Title" },
        { key: "category", label: "Category" },
        { key: "venue", label: "Venue" },
        { key: "dateFrom", label: "From" },
        { key: "dateTo", label: "To" }
      ],
      rows: rows.map((r) => ({
        title: r?.title || "—",
        category: r?.category || "—",
        venue: r?.venue || "—",
        dateFrom: r?.dateFrom ? new Date(r.dateFrom).toISOString().slice(0, 10) : "—",
        dateTo: r?.dateTo ? new Date(r.dateTo).toISOString().slice(0, 10) : "—"
      }))
    };
  }

  if (module === "organisations") {
    const Group = (await import("../models/organisationModel/groupModel.js")).default;
    const Department = (await import("../models/organisationModel/departmentModel.js")).default;
    const Cell = (await import("../models/organisationModel/cellModel.js")).default;
    const Ministry = (await import("../models/organisationModel/ministryModel.js")).default;

    const createdMatch = from && to ? { createdAt: { $gte: from, $lte: to } } : {};

    const [groups, departments, cells, ministries] = await Promise.all([
      Group.find({ church: churchId, ...createdMatch }).select("name description createdAt").lean(),
      Department.find({ church: churchId, ...createdMatch }).select("name description status createdAt").lean(),
      Cell.find({ church: churchId, ...createdMatch }).select("name description status createdAt").lean(),
      Ministry.find({ church: churchId, ...createdMatch }).select("name description status createdAt").lean()
    ]);

    const rows = [
      ...(groups || []).map((r) => ({
        type: "Group",
        name: r?.name || "—",
        status: "—",
        createdAt: r?.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "—",
        description: r?.description || "—"
      })),
      ...(departments || []).map((r) => ({
        type: "Department",
        name: r?.name || "—",
        status: r?.status || "—",
        createdAt: r?.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "—",
        description: r?.description || "—"
      })),
      ...(cells || []).map((r) => ({
        type: "Cell",
        name: r?.name || "—",
        status: r?.status || "—",
        createdAt: r?.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "—",
        description: r?.description || "—"
      })),
      ...(ministries || []).map((r) => ({
        type: "Ministry",
        name: r?.name || "—",
        status: r?.status || "—",
        createdAt: r?.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "—",
        description: r?.description || "—"
      }))
    ].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return {
      title: "Organisations",
      columns: [
        { key: "type", label: "Type" },
        { key: "name", label: "Name" },
        { key: "status", label: "Status" },
        { key: "createdAt", label: "Created" },
        { key: "description", label: "Description" }
      ],
      rows
    };
  }

  if (module === "attendance-individual") {
    const ServiceIndividualAttendance = (await import("../models/serviceIndividualAttendanceModel.js")).default;
    const match = { church: churchId, ...rangeMatch("date") };
    const rows = await ServiceIndividualAttendance.find(match)
      .select("date serviceType mainSpeaker presentMembers absentMembers totalMembersSnapshot")
      .sort({ date: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Attendance (Individual)",
      columns: [
        { key: "date", label: "Date" },
        { key: "serviceType", label: "Service Type" },
        { key: "present", label: "Present" },
        { key: "absent", label: "Absent" },
        { key: "total", label: "Total Members" },
        { key: "mainSpeaker", label: "Speaker" }
      ],
      rows: rows.map((r) => ({
        date: r?.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
        serviceType: r?.serviceType || "—",
        present: Array.isArray(r?.presentMembers) ? r.presentMembers.length : 0,
        absent: Array.isArray(r?.absentMembers) ? r.absentMembers.length : 0,
        total: clampToNumber(r?.totalMembersSnapshot),
        mainSpeaker: r?.mainSpeaker || "—"
      }))
    };
  }

  if (module === "visitors") {
    const match = { church: churchId, ...rangeMatch("serviceDate") };
    const rows = await Visitor.find(match)
      .select("fullName phoneNumber email location serviceType serviceDate invitedBy source status")
      .sort({ serviceDate: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Visitors",
      columns: [
        { key: "serviceDate", label: "Date" },
        { key: "fullName", label: "Name" },
        { key: "phoneNumber", label: "Phone" },
        { key: "location", label: "Location" },
        { key: "serviceType", label: "Service Type" },
        { key: "invitedBy", label: "Invited By" },
        { key: "status", label: "Status" }
      ],
      rows: rows.map((r) => ({
        serviceDate: r?.serviceDate ? new Date(r.serviceDate).toISOString().slice(0, 10) : "—",
        fullName: r?.fullName || "—",
        phoneNumber: r?.phoneNumber || "—",
        location: r?.location || "—",
        serviceType: r?.serviceType || "—",
        invitedBy: r?.invitedBy || "—",
        status: r?.status || "—"
      }))
    };
  }

  if (module === "announcements") {
    const Announcement = (await import("../models/announcementModel.js")).default;
    const AnnouncementMessage = (await import("../models/announcementMessageModel.js")).default;
    const match = { church: churchId, ...rangeMatch("createdAt") };

    const [announcements, messages] = await Promise.all([
      Announcement.find(match)
        .select("title message sendMethod createdAt")
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean(),
      AnnouncementMessage.find(match)
        .select("title content channels status scheduledAt recipientCount createdAt")
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean()
    ]);

    const rows = [
      ...(announcements || []).map((r) => ({
        type: "Announcement",
        title: r?.title || "—",
        channel: r?.sendMethod || "In-App",
        status: "—",
        date: r?.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "—",
        recipients: "—",
        note: r?.message || "—"
      })),
      ...(messages || []).map((r) => ({
        type: "Message",
        title: r?.title || "—",
        channel: Array.isArray(r?.channels) && r.channels.length ? r.channels.join(", ").toUpperCase() : "—",
        status: r?.status || "—",
        date: r?.scheduledAt || r?.createdAt
          ? new Date(r.scheduledAt || r.createdAt).toISOString().slice(0, 10)
          : "—",
        recipients: clampToNumber(r?.recipientCount),
        note: r?.content || "—"
      }))
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    return {
      title: "Announcements",
      columns: [
        { key: "type", label: "Type" },
        { key: "title", label: "Title" },
        { key: "channel", label: "Channel" },
        { key: "status", label: "Status" },
        { key: "date", label: "Date" },
        { key: "recipients", label: "Recipients" },
        { key: "note", label: "Message" }
      ],
      rows
    };
  }

  if (module === "outreach-followup") {
    const OutreachEvent = (await import("../models/outreachModel/outreachEventModel.js")).default;
    const OutreachProspect = (await import("../models/outreachModel/outreachProspectModel.js")).default;
    const OutreachFollowUp = (await import("../models/outreachModel/outreachFollowUpModel.js")).default;

    const createdMatch = { church: churchId, ...rangeMatch("createdAt") };

    const [events, prospects, followUps] = await Promise.all([
      OutreachEvent.find({ church: churchId, ...rangeMatch("date") })
        .select("title type status date location")
        .sort({ date: -1 })
        .limit(2000)
        .lean(),
      OutreachProspect.find(createdMatch)
        .select("firstName lastName phone stage howReached dateReached createdAt")
        .populate("outreachEvent", "title")
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean(),
      OutreachFollowUp.find(createdMatch)
        .select("type status outcome scheduledDate followUpDate createdAt")
        .populate("prospect", "firstName lastName")
        .populate("outreachEvent", "title")
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean()
    ]);

    const rows = [
      ...(events || []).map((r) => ({
        type: "Outreach Event",
        name: r?.title || "—",
        detail: r?.type || "—",
        status: r?.status || "—",
        date: r?.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
        note: r?.location || "—"
      })),
      ...(prospects || []).map((r) => ({
        type: "Prospect",
        name: [r?.firstName, r?.lastName].filter(Boolean).join(" ") || "—",
        detail: r?.outreachEvent?.title || r?.howReached || "—",
        status: r?.stage || "—",
        date: r?.dateReached || r?.createdAt
          ? new Date(r.dateReached || r.createdAt).toISOString().slice(0, 10)
          : "—",
        note: r?.phone || "—"
      })),
      ...(followUps || []).map((r) => ({
        type: "Follow-Up",
        name: r?.prospect
          ? [r.prospect?.firstName, r.prospect?.lastName].filter(Boolean).join(" ") || "—"
          : "—",
        detail: r?.type || "—",
        status: r?.status || "—",
        date: r?.scheduledDate || r?.followUpDate || r?.createdAt
          ? new Date(r.scheduledDate || r.followUpDate || r.createdAt).toISOString().slice(0, 10)
          : "—",
        note: r?.outcome || "—"
      }))
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    return {
      title: "Outreach & Follow-Up",
      columns: [
        { key: "type", label: "Type" },
        { key: "name", label: "Name" },
        { key: "detail", label: "Detail" },
        { key: "status", label: "Status" },
        { key: "date", label: "Date" },
        { key: "note", label: "Note" }
      ],
      rows
    };
  }

  if (module === "budgeting") {
    const match = { church: churchId, ...rangeMatch("createdAt") };
    const budgets = await Budget.find(match)
      .select("name fiscalYear periodFrom periodTo status items createdAt")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const formatPeriod = (from, to) => {
      const f = from ? new Date(from).toISOString().slice(0, 10) : "";
      const t = to ? new Date(to).toISOString().slice(0, 10) : "";
      if (f && t) return `${f} - ${t}`;
      return f || t || "—";
    };

    const rows = [];
    (budgets || []).forEach((b) => {
      const items = Array.isArray(b?.items) ? b.items : [];
      if (!items.length) {
        rows.push({
          budget: b?.name || "—",
          fiscalYear: b?.fiscalYear ?? "—",
          type: "—",
          category: "—",
          amount: 0,
          status: b?.status || "—",
          period: formatPeriod(b?.periodFrom, b?.periodTo)
        });
        return;
      }
      items.forEach((it) => {
        rows.push({
          budget: b?.name || "—",
          fiscalYear: b?.fiscalYear ?? "—",
          type: it?.type || "—",
          category: it?.category || "—",
          amount: clampToNumber(it?.amount),
          status: b?.status || "—",
          period: formatPeriod(it?.dateFrom || b?.periodFrom, it?.dateTo || b?.periodTo)
        });
      });
    });

    return {
      title: "Budgeting",
      columns: [
        { key: "budget", label: "Budget" },
        { key: "fiscalYear", label: "Fiscal Year" },
        { key: "type", label: "Type" },
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
        { key: "period", label: "Period" }
      ],
      rows
    };
  }

  return { error: "Unsupported module" };
}

const REPORT_MODULE_LABELS = {
  members: "Members",
  attendance: "Attendance",
  "attendance-total": "Attendance (Total)",
  "attendance-individual": "Attendance (Individual)",
  visitors: "Visitors",
  tithe: "Tithe",
  "tithe-individual": "Tithe (Individual)",
  "tithe-aggregate": "Tithe (Aggregate)",
  offerings: "Offerings",
  "special-funds": "Special Fund",
  expenses: "Expenses",
  budgeting: "Budgeting",
  pledges: "Pledges",
  welfare: "Welfare",
  "business-ventures": "Business Ventures",
  "church-projects": "Church Projects",
  "programs-events": "Programs & Events",
  organisations: "Organisations",
  "outreach-followup": "Outreach & Follow-Up",
  announcements: "Announcements"
};

function applyFieldSelection(report, fieldsRaw) {
  const available = Array.isArray(report?.availableColumns) && report.availableColumns.length
    ? report.availableColumns
    : report?.columns;
  const requested = String(fieldsRaw || "")
    .split(",")
    .map((k) => String(k || "").trim())
    .filter(Boolean);
  if (!requested.length || !Array.isArray(available) || !available.length) return report;

  const cols = requested.map((key) => available.find((c) => c?.key === key)).filter(Boolean);
  if (!cols.length) return report;

  const keys = cols.map((c) => c.key);
  return {
    ...report,
    columns: cols,
    rows: (Array.isArray(report?.rows) ? report.rows : []).map((r) => {
      const o = {};
      keys.forEach((k) => {
        o[k] = r?.[k];
      });
      return o;
    })
  };
}

function csvEscapeCell(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsvTableReport({ title, columns, rows, res, fileName }) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  const cols = Array.isArray(columns) ? columns : [];
  const lines = [cols.map((c) => csvEscapeCell(c?.label || c?.key)).join(",")];
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    lines.push(cols.map((c) => csvEscapeCell(r?.[c.key])).join(","));
  });

  res.send(`﻿${lines.join("\r\n")}`);
}

function writeReportFile({ format, title, columns, rows, res, fileName }) {
  if (format === "csv") {
    writeCsvTableReport({ title, columns, rows, res, fileName });
    return Promise.resolve();
  }
  if (format === "excel") {
    return writeExcelTableReport({ title, columns, rows, res, fileName });
  }
  writePdfTableReport({ title, columns, rows, res, fileName });
  return Promise.resolve();
}

function writePdfTableReport({ title, columns, rows, res, fileName }) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text(title || "Report", { align: "left" });
  doc.moveDown(1);

  const cols = Array.isArray(columns) ? columns : [];
  const header = cols.map((c) => c?.label || c?.key).join(" | ");
  doc.fontSize(9).fillColor("#111111").text(header);
  doc.moveDown(0.5);

  const safeRows = Array.isArray(rows) ? rows : [];
  safeRows.slice(0, 500).forEach((r) => {
    const line = cols.map((c) => String(r?.[c.key] ?? "")).join(" | ");
    doc.fontSize(8.5).fillColor("#222222").text(line);
  });

  doc.end();
}

async function writeExcelTableReport({ title, columns, rows, res, fileName }) {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  const cols = Array.isArray(columns) ? columns : [];
  sheet.columns = cols.map((c) => ({ header: c?.label || c?.key, key: c?.key, width: 22 }));

  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const row = {};
    cols.forEach((c) => {
      row[c.key] = r?.[c.key] ?? "";
    });
    sheet.addRow(row);
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  workbook.creator = "ChurchClerk";
  workbook.created = new Date();
  if (title) {
    workbook.properties = workbook.properties || {};
    workbook.properties.title = title;
  }

  await workbook.xlsx.write(res);
  res.end();
}

async function computeAnalytics({ churchId, periodStart, periodEnd }) {
  const keys = enumerateMonthKeys(periodStart, periodEnd);

  const incomeMaps = await Promise.all(
    INCOME_SOURCES.map((s) =>
      aggregateMonthlySum({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart,
        periodEnd
      })
    )
  );

  const expenseMaps = await Promise.all(
    EXPENSE_SOURCES.map((s) =>
      aggregateMonthlySum({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart,
        periodEnd
      })
    )
  );

  const attendanceMap = await aggregateMonthlySum({
    Model: Attendance,
    churchId,
    dateField: "serviceDate",
    amountField: "totalNumber",
    periodStart,
    periodEnd
  });

  const newMembersMap = await aggregateMonthlyCount({
    Model: Member,
    churchId,
    dateField: "dateJoined",
    periodStart,
    periodEnd
  });

  const incomeTotalMap = mergeMapsSum(incomeMaps);
  const expenseTotalMap = mergeMapsSum(expenseMaps);

  const incomeSeries = mapToSeries(keys, incomeTotalMap, "income");
  const expenseSeries = mapToSeries(keys, expenseTotalMap, "expenses");
  const attendanceSeries = mapToSeries(keys, attendanceMap, "attendance");
  const newMembersSeries = mapToSeries(keys, newMembersMap, "newMembers");

  const merged = keys.map((k, idx) => ({
    monthKey: k,
    month: monthKeyToLabel(k),
    income: incomeSeries[idx]?.income ?? 0,
    expenses: expenseSeries[idx]?.expenses ?? 0,
    attendance: attendanceSeries[idx]?.attendance ?? 0,
    newMembers: newMembersSeries[idx]?.newMembers ?? 0
  }));

  return {
    series: merged
  };
}

function writePdfReport({ report, res, fileName }) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text("Reports & Analytics", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#444444").text(`Period: ${report?.period?.label || "—"}`);
  doc.moveDown(1);

  doc.fillColor("#000000").fontSize(14).text("KPIs", { underline: false });
  doc.moveDown(0.5);

  const k = report?.kpis || {};
  const rows = [
    ["Overall Revenue", formatCurrency(k.totalIncome)],
    ["Overall Expenses", formatCurrency(k.totalExpenses)],
    ["Overall Surplus / Deficit", formatCurrency(k.surplus)],
    ["New Members", String(k.newMembers ?? 0)],
    ["Total Attendance", String(k.totalAttendance ?? 0)]
  ];

  rows.forEach(([label, value]) => {
    doc.fontSize(11).fillColor("#111111").text(label, { continued: true });
    doc.fontSize(11).fillColor("#111111").text(`: ${value}`);
  });

  doc.moveDown(1);
  doc.fillColor("#000000").fontSize(14).text("Monthly Trends", { underline: false });
  doc.moveDown(0.5);

  const series = Array.isArray(report?.analytics?.series) ? report.analytics.series : [];
  series.slice(-12).forEach((r) => {
    const line = `${r.month}: Income ${formatCurrency(r.income)} | Expenses ${formatCurrency(r.expenses)} | Attendance ${r.attendance} | New Members ${r.newMembers}`;
    doc.fontSize(9.5).fillColor("#222222").text(line);
  });

  doc.end();
}

async function writeExcelReport({ report, res, fileName }) {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  const workbook = new ExcelJS.Workbook();
  const kpiSheet = workbook.addWorksheet("KPIs");
  const trendsSheet = workbook.addWorksheet("Trends");

  kpiSheet.columns = [
    { header: "Metric", key: "metric", width: 26 },
    { header: "Value", key: "value", width: 22 }
  ];

  const k = report?.kpis || {};
  kpiSheet.addRow({ metric: "Period", value: report?.period?.label || "—" });
  kpiSheet.addRow({ metric: "Overall Revenue", value: clampToNumber(k.totalIncome) });
  kpiSheet.addRow({ metric: "Overall Expenses", value: clampToNumber(k.totalExpenses) });
  kpiSheet.addRow({ metric: "Overall Surplus / Deficit", value: clampToNumber(k.surplus) });
  kpiSheet.addRow({ metric: "New Members", value: clampToNumber(k.newMembers) });
  kpiSheet.addRow({ metric: "Total Attendance", value: clampToNumber(k.totalAttendance) });

  trendsSheet.columns = [
    { header: "Month", key: "month", width: 16 },
    { header: "Income", key: "income", width: 16 },
    { header: "Expenses", key: "expenses", width: 16 },
    { header: "Attendance", key: "attendance", width: 16 },
    { header: "New Members", key: "newMembers", width: 16 }
  ];

  const series = Array.isArray(report?.analytics?.series) ? report.analytics.series : [];
  series.forEach((r) => {
    trendsSheet.addRow({
      month: r.month,
      income: clampToNumber(r.income),
      expenses: clampToNumber(r.expenses),
      attendance: clampToNumber(r.attendance),
      newMembers: clampToNumber(r.newMembers)
    });
  });

  await workbook.xlsx.write(res);
  res.end();
}

const getReportsAnalyticsKpi = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const kpis = await computeOverallKpis({ churchId });

    return res.status(200).json({
      message: "Reports analytics KPI fetched successfully",
      kpis
    });
  } catch (error) {
    return res.status(400).json({
      message: "Reports analytics KPI could not be fetched",
      error: error.message
    });
  }
};

const getReportsAnalytics = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const year = req.query?.year;

    const analytics = await computeYearlyAnalytics({
      churchId,
      year
    });

    return res.status(200).json({
      message: "Reports analytics fetched successfully",
      analytics
    });
  } catch (error) {
    return res.status(400).json({
      message: "Reports analytics could not be fetched",
      error: error.message
    });
  }
};

const getReportsAnalyticsReport = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const moduleKey = req.query?.module;
    if (!moduleKey) {
      return res.status(400).json({ message: "Module is required" });
    }

    const resolved = resolveReportRange({ query: req.query });
    if (resolved?.error) {
      return res.status(400).json({ message: resolved.error });
    }

    const report = await buildModuleReport({
      moduleKey,
      churchId,
      from: resolved.from,
      to: resolved.to
    });

    if (report?.error) {
      return res.status(400).json({ message: report.error });
    }

    return res.status(200).json({
      message: "Report generated successfully",
      report: applyFieldSelection(report, req.query?.fields)
    });
  } catch (error) {
    return res.status(400).json({
      message: "Report could not be generated",
      error: error.message
    });
  }
};

const exportReportsAnalyticsReport = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const moduleKey = req.query?.module;
    if (!moduleKey) {
      return res.status(400).json({ message: "Module is required" });
    }

    const format = String(req.query.format || "pdf").toLowerCase();
    if (!["pdf", "excel", "csv"].includes(format)) {
      return res.status(400).json({ message: "Invalid export format" });
    }

    const resolved = resolveReportRange({ query: req.query });
    if (resolved?.error) {
      return res.status(400).json({ message: resolved.error });
    }

    const report = await buildModuleReport({
      moduleKey,
      churchId,
      from: resolved.from,
      to: resolved.to
    });

    if (report?.error) {
      return res.status(400).json({ message: report.error });
    }

    const ext = format === "excel" ? "xlsx" : format === "csv" ? "csv" : "pdf";
    const periodLabel = resolved.from && resolved.to
      ? `${resolved.from.toISOString().slice(0, 10)}-to-${resolved.to.toISOString().slice(0, 10)}`
      : "all-time";
    const fileName = `report-${toSafeFileName(moduleKey)}-${toSafeFileName(periodLabel)}.${ext}`;

    const finalReport = applyFieldSelection(report, req.query?.fields);

    await writeReportFile({
      format,
      title: finalReport?.title,
      columns: finalReport?.columns,
      rows: finalReport?.rows,
      res,
      fileName
    });
  } catch (error) {
    return res.status(400).json({
      message: "Report export failed",
      error: error.message
    });
  }
};

const exportReportsAnalytics = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const format = String(req.query.format || "pdf").toLowerCase();
    if (!["pdf", "excel"].includes(format)) {
      return res.status(400).json({ message: "Invalid export format" });
    }

    const resolved = resolvePeriod({ query: req.query });
    if (resolved?.error) {
      return res.status(400).json({ message: resolved.error });
    }

    const [kpis, analytics] = await Promise.all([
      computeKpis({
        churchId,
        periodStart: resolved.periodStart,
        periodEnd: resolved.periodEnd,
        prevStart: resolved.prevStart,
        prevEnd: resolved.prevEnd
      }),
      computeAnalytics({
        churchId,
        periodStart: resolved.periodStart,
        periodEnd: resolved.periodEnd
      })
    ]);

    const ext = format === "excel" ? "xlsx" : "pdf";
    const fileName = `reports-analytics-${toSafeFileName(resolved.label)}.${ext}`;

    const report = {
      period: {
        label: resolved.label,
        start: resolved.periodStart,
        end: resolved.periodEnd
      },
      kpis,
      analytics
    };

    if (format === "excel") {
      await writeExcelReport({ report, res, fileName });
      return;
    }

    writePdfReport({ report, res, fileName });
  } catch (error) {
    return res.status(400).json({
      message: "Reports analytics export failed",
      error: error.message
    });
  }
};

const createSavedReport = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const moduleKey = req.body?.module;
    if (!moduleKey) {
      return res.status(400).json({ message: "Module is required" });
    }

    const resolved = resolveReportRange({ query: req.body });
    if (resolved?.error) {
      return res.status(400).json({ message: resolved.error });
    }

    let report = await buildModuleReport({
      moduleKey,
      churchId,
      from: resolved.from,
      to: resolved.to
    });

    if (report?.error) {
      return res.status(400).json({ message: report.error });
    }

    const fieldsRaw = Array.isArray(req.body?.fields)
      ? req.body.fields.join(",")
      : req.body?.fields;
    report = applyFieldSelection(report, fieldsRaw);

    const moduleKeyNorm = String(moduleKey).trim().toLowerCase();
    const moduleLabel = REPORT_MODULE_LABELS[moduleKeyNorm] || report?.title || moduleKeyNorm;
    const name = String(req.body?.name || "").trim() || `${moduleLabel} Report`;

    const doc = await SavedReport.create({
      church: churchId,
      name,
      module: moduleKeyNorm,
      moduleLabel,
      columns: Array.isArray(report?.columns) ? report.columns : [],
      rows: Array.isArray(report?.rows) ? report.rows : [],
      rowCount: Array.isArray(report?.rows) ? report.rows.length : 0,
      dateFrom: resolved.from || null,
      dateTo: resolved.to || null,
      createdBy: req.user?._id || null
    });

    return res.status(201).json({ message: "Report saved successfully", savedReport: doc });
  } catch (error) {
    return res.status(400).json({
      message: "Report could not be saved",
      error: error.message
    });
  }
};

const getSavedReports = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const rows = await SavedReport.find({ church: churchId })
      .select("name module moduleLabel rowCount dateFrom dateTo shareToken createdAt createdBy")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({ message: "Saved reports fetched", savedReports: rows });
  } catch (error) {
    return res.status(400).json({
      message: "Saved reports could not be fetched",
      error: error.message
    });
  }
};

const getSavedReport = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const doc = await SavedReport.findOne({ _id: req.params?.id, church: churchId }).lean();
    if (!doc) {
      return res.status(404).json({ message: "Saved report not found" });
    }

    return res.status(200).json({ message: "Saved report fetched", savedReport: doc });
  } catch (error) {
    return res.status(400).json({
      message: "Saved report could not be fetched",
      error: error.message
    });
  }
};

const deleteSavedReport = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const doc = await SavedReport.findOneAndDelete({ _id: req.params?.id, church: churchId }).lean();
    if (!doc) {
      return res.status(404).json({ message: "Saved report not found" });
    }

    return res.status(200).json({ message: "Saved report deleted" });
  } catch (error) {
    return res.status(400).json({
      message: "Saved report could not be deleted",
      error: error.message
    });
  }
};

const downloadSavedReport = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const format = String(req.query.format || "pdf").toLowerCase();
    if (!["pdf", "excel", "csv"].includes(format)) {
      return res.status(400).json({ message: "Invalid export format" });
    }

    const doc = await SavedReport.findOne({ _id: req.params?.id, church: churchId }).lean();
    if (!doc) {
      return res.status(404).json({ message: "Saved report not found" });
    }

    const ext = format === "excel" ? "xlsx" : format === "csv" ? "csv" : "pdf";
    const fileName = `${toSafeFileName(doc.name) || "report"}.${ext}`;

    await writeReportFile({
      format,
      title: doc.name,
      columns: doc.columns,
      rows: doc.rows,
      res,
      fileName
    });
  } catch (error) {
    return res.status(400).json({
      message: "Saved report download failed",
      error: error.message
    });
  }
};

const getSharedReport = async (req, res) => {
  try {
    const token = String(req.params?.token || "").trim();
    if (!token) {
      return res.status(400).json({ message: "Invalid share link" });
    }

    const doc = await SavedReport.findOne({ shareToken: token })
      .select("name moduleLabel columns rows rowCount dateFrom dateTo createdAt")
      .lean();
    if (!doc) {
      return res.status(404).json({ message: "Shared report not found" });
    }

    return res.status(200).json({ message: "Shared report fetched", report: doc });
  } catch (error) {
    return res.status(400).json({
      message: "Shared report could not be fetched",
      error: error.message
    });
  }
};

const downloadSharedReport = async (req, res) => {
  try {
    const token = String(req.params?.token || "").trim();
    if (!token) {
      return res.status(400).json({ message: "Invalid share link" });
    }

    const format = String(req.query.format || "pdf").toLowerCase();
    if (!["pdf", "csv"].includes(format)) {
      return res.status(400).json({ message: "Invalid export format" });
    }

    const doc = await SavedReport.findOne({ shareToken: token }).lean();
    if (!doc) {
      return res.status(404).json({ message: "Shared report not found" });
    }

    const ext = format === "csv" ? "csv" : "pdf";
    const fileName = `${toSafeFileName(doc.name) || "report"}.${ext}`;

    await writeReportFile({
      format,
      title: doc.name,
      columns: doc.columns,
      rows: doc.rows,
      res,
      fileName
    });
  } catch (error) {
    return res.status(400).json({
      message: "Shared report download failed",
      error: error.message
    });
  }
};

export {
  getReportsAnalyticsKpi,
  getReportsAnalytics,
  exportReportsAnalytics,
  getReportsAnalyticsReport,
  exportReportsAnalyticsReport,
  createSavedReport,
  getSavedReports,
  getSavedReport,
  deleteSavedReport,
  downloadSavedReport,
  getSharedReport,
  downloadSharedReport
};
