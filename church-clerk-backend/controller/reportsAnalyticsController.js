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

function toDateStr(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

function toDateTimeStr(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 16).replace("T", " ");
}

function personName(p) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(" ") || p?.fullName || "";
}

function userName(u) {
  return u?.fullName || "—";
}

function yesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function joinNames(list, field = "name") {
  if (!Array.isArray(list)) return "—";
  const names = list.map((x) => x?.[field] || personName(x)).filter(Boolean);
  return names.length ? names.join(", ") : "—";
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

const REPORT_LONG_TEXT_KEYS = new Set([
  "address",
  "description",
  "note",
  "notes",
  "message",
  "meetingSchedule",
  "organizers",
  "presentMembers",
  "absentMembers"
]);

function orderReportColumns(columns) {
  const cols = Array.isArray(columns) ? columns : [];
  const head = cols.filter((c) => !REPORT_LONG_TEXT_KEYS.has(c?.key));
  const tail = cols.filter((c) => REPORT_LONG_TEXT_KEYS.has(c?.key));
  return [...head, ...tail];
}

async function buildModuleReport({ moduleKey, churchId, from, to }) {
  const report = await buildModuleReportBase({ moduleKey, churchId, from, to });
  if (report?.columns) report.columns = orderReportColumns(report.columns);
  if (report?.availableColumns) report.availableColumns = orderReportColumns(report.availableColumns);
  return report;
}

async function buildModuleReportBase({ moduleKey, churchId, from, to }) {
  const module = String(moduleKey || "").trim().toLowerCase();

  const rangeMatch = (field) => {
    if (!from || !to) return {};
    return { [field]: { $gte: from, $lte: to } };
  };

  if (module === "members") {
    const match = { church: churchId, ...rangeMatch("dateJoined") };
    const rows = await Member.find(match)
      .select("memberId firstName lastName email phoneNumber gender occupation nationality ageGroup status note dateOfBirth streetAddress city region country maritalStatus department group cell ministry churchRole dateJoined createdBy createdAt updatedAt")
      .populate("department", "name")
      .populate("group", "name")
      .populate("cell", "name")
      .populate("ministry", "name")
      .populate("createdBy", "fullName")
      .sort({ dateJoined: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "memberId", label: "Member ID" },
      { key: "name", label: "Name" },
      { key: "phoneNumber", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "gender", label: "Gender" },
      { key: "dateOfBirth", label: "Date of Birth" },
      { key: "maritalStatus", label: "Marital Status" },
      { key: "ageGroup", label: "Age Group" },
      { key: "occupation", label: "Occupation" },
      { key: "nationality", label: "Nationality" },
      { key: "status", label: "Status" },
      { key: "churchRole", label: "Church Role" },
      { key: "address", label: "Address" },
      { key: "departments", label: "Departments" },
      { key: "groups", label: "Groups" },
      { key: "cells", label: "Cells" },
      { key: "ministries", label: "Ministries" },
      { key: "dateJoined", label: "Date Joined" },
      { key: "note", label: "Note" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Members",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        memberId: r?.memberId || "—",
        name: personName(r) || "—",
        phoneNumber: r?.phoneNumber || "—",
        email: r?.email || "—",
        gender: r?.gender || "—",
        dateOfBirth: toDateStr(r?.dateOfBirth),
        maritalStatus: r?.maritalStatus || "—",
        ageGroup: r?.ageGroup || "—",
        occupation: r?.occupation || "—",
        nationality: r?.nationality || "—",
        status: r?.status || "—",
        churchRole: r?.churchRole || "—",
        address: [r?.streetAddress, r?.city, r?.region, r?.country].filter(Boolean).join(", ") || "—",
        departments: joinNames(r?.department),
        groups: joinNames(r?.group),
        cells: joinNames(r?.cell),
        ministries: joinNames(r?.ministry),
        dateJoined: toDateStr(r?.dateJoined),
        note: r?.note || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "attendance" || module === "attendance-total") {
    const match = { church: churchId, ...rangeMatch("serviceDate") };
    const rows = await Attendance.find(match)
      .select("serviceType serviceDate serviceTime totalNumber mainSpeaker createdBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .sort({ serviceDate: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "serviceDate", label: "Date" },
      { key: "serviceType", label: "Service Type" },
      { key: "serviceTime", label: "Service Time" },
      { key: "totalNumber", label: "Total" },
      { key: "mainSpeaker", label: "Speaker" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: module === "attendance-total" ? "Attendance (Total)" : "Attendance",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        serviceDate: toDateStr(r?.serviceDate),
        serviceType: r?.serviceType || "—",
        serviceTime: r?.serviceTime || "—",
        totalNumber: clampToNumber(r?.totalNumber),
        mainSpeaker: r?.mainSpeaker || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "tithe") {
    const match = { church: churchId, ...rangeMatch("date") };
    const [individuals, aggregates] = await Promise.all([
      TitheIndividual.find(match)
        .select("member payerName amount date paymentMethod referenceId createdBy createdAt updatedAt")
        .populate("member", "firstName lastName phoneNumber memberId")
        .populate("createdBy", "fullName")
        .sort({ date: -1 })
        .limit(2000)
        .lean(),
      TitheAggregate.find(match)
        .select("amount date description referenceId createdBy createdAt updatedAt")
        .populate("createdBy", "fullName")
        .sort({ date: -1 })
        .limit(2000)
        .lean()
    ]);

    const rows = [
      ...(individuals || []).map((r) => ({
        type: "Individual",
        referenceId: r?.referenceId || "—",
        payer: personName(r?.member) || r?.payerName || "—",
        payerPhone: r?.member?.phoneNumber || "—",
        memberId: r?.member?.memberId || "—",
        date: toDateStr(r?.date),
        amount: clampToNumber(r?.amount),
        paymentMethod: r?.paymentMethod || "—",
        description: "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      })),
      ...(aggregates || []).map((r) => ({
        type: "Aggregate",
        referenceId: r?.referenceId || "—",
        payer: "—",
        payerPhone: "—",
        memberId: "—",
        date: toDateStr(r?.date),
        amount: clampToNumber(r?.amount),
        paymentMethod: "—",
        description: r?.description || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const availableColumns = [
      { key: "type", label: "Type" },
      { key: "referenceId", label: "Reference ID" },
      { key: "payer", label: "Payer" },
      { key: "payerPhone", label: "Payer Phone" },
      { key: "memberId", label: "Member ID" },
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "description", label: "Description" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Tithe",
      columns: availableColumns,
      availableColumns,
      rows
    };
  }

  if (module === "tithe-individual") {
    const match = { church: churchId, ...rangeMatch("date") };
    const individuals = await TitheIndividual.find(match)
      .select("member payerName amount date paymentMethod referenceId createdBy createdAt updatedAt")
      .populate("member", "firstName lastName phoneNumber memberId")
      .populate("createdBy", "fullName")
      .sort({ date: -1 })
      .limit(2000)
      .lean();

    const rows = (individuals || []).map((r) => ({
      referenceId: r?.referenceId || "—",
      payer: personName(r?.member) || r?.payerName || "—",
      payerPhone: r?.member?.phoneNumber || "—",
      memberId: r?.member?.memberId || "—",
      date: toDateStr(r?.date),
      amount: clampToNumber(r?.amount),
      paymentMethod: r?.paymentMethod || "—",
      recordedBy: userName(r?.createdBy),
      createdAt: toDateTimeStr(r?.createdAt),
      updatedAt: toDateTimeStr(r?.updatedAt)
    }));

    const availableColumns = [
      { key: "referenceId", label: "Reference ID" },
      { key: "payer", label: "Payer" },
      { key: "payerPhone", label: "Payer Phone" },
      { key: "memberId", label: "Member ID" },
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
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
      .select("amount date description referenceId createdBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .sort({ date: -1 })
      .limit(2000)
      .lean();

    const rows = (aggregates || []).map((r) => ({
      referenceId: r?.referenceId || "—",
      date: toDateStr(r?.date),
      amount: clampToNumber(r?.amount),
      description: r?.description || "—",
      recordedBy: userName(r?.createdBy),
      createdAt: toDateTimeStr(r?.createdAt),
      updatedAt: toDateTimeStr(r?.updatedAt)
    }));

    const availableColumns = [
      { key: "referenceId", label: "Reference ID" },
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
      { key: "description", label: "Description" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
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
      .select("serviceType offeringType serviceDate amount referenceId createdBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .sort({ serviceDate: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "referenceId", label: "Reference ID" },
      { key: "serviceDate", label: "Date" },
      { key: "serviceType", label: "Service Type" },
      { key: "offeringType", label: "Offering Type" },
      { key: "amount", label: "Amount" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Offerings",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        referenceId: r?.referenceId || "—",
        serviceDate: toDateStr(r?.serviceDate),
        serviceType: r?.serviceType || "—",
        offeringType: r?.offeringType || "—",
        amount: clampToNumber(r?.amount),
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "special-funds") {
    const match = { church: churchId, ...rangeMatch("givingDate") };
    const rows = await SpecialFund.find(match)
      .select("giverName category totalAmount givingDate description referenceId createdBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .sort({ givingDate: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "referenceId", label: "Reference ID" },
      { key: "givingDate", label: "Date" },
      { key: "giverName", label: "Giver" },
      { key: "category", label: "Category" },
      { key: "totalAmount", label: "Amount" },
      { key: "description", label: "Description" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Special Funds",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        referenceId: r?.referenceId || "—",
        givingDate: toDateStr(r?.givingDate),
        giverName: r?.giverName || "—",
        category: r?.category || "—",
        totalAmount: clampToNumber(r?.totalAmount),
        description: r?.description || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "expenses") {
    const match = { church: churchId, ...rangeMatch("date") };
    const rows = await GeneralExpenses.find(match)
      .select("category amount description date paymentMethod referenceId createdBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .sort({ date: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "referenceId", label: "Reference ID" },
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount" },
      { key: "paymentMethod", label: "Payment" },
      { key: "description", label: "Description" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Expenses",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        referenceId: r?.referenceId || "—",
        date: toDateStr(r?.date),
        category: r?.category || "—",
        amount: clampToNumber(r?.amount),
        paymentMethod: r?.paymentMethod || "—",
        description: r?.description || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "pledges") {
    const match = { church: churchId, ...rangeMatch("pledgeDate") };
    const Pledge = (await import("../models/financeModel/pledgeModel/pledgeModel.js")).default;

    const rows = await Pledge.find(match)
      .select("name phoneNumber serviceType amount pledgeDate deadline note status referenceId createdBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .sort({ pledgeDate: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "referenceId", label: "Reference ID" },
      { key: "pledgeDate", label: "Pledge Date" },
      { key: "name", label: "Name" },
      { key: "phoneNumber", label: "Phone" },
      { key: "serviceType", label: "Service Type" },
      { key: "amount", label: "Amount" },
      { key: "deadline", label: "Deadline" },
      { key: "status", label: "Status" },
      { key: "note", label: "Note" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Pledges",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        referenceId: r?.referenceId || "—",
        pledgeDate: toDateStr(r?.pledgeDate),
        name: r?.name || "—",
        phoneNumber: r?.phoneNumber || "—",
        serviceType: r?.serviceType || "—",
        amount: clampToNumber(r?.amount),
        deadline: toDateStr(r?.deadline),
        status: r?.status || "—",
        note: r?.note || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "welfare") {
    const match = { church: churchId, ...rangeMatch("date") };

    const [contribs, disburs] = await Promise.all([
      WelfareContributions.find(match)
        .select("member amount date paymentMethod referenceId createdBy createdAt updatedAt")
        .populate("member", "firstName lastName phoneNumber memberId")
        .populate("createdBy", "fullName")
        .sort({ date: -1 })
        .limit(2000)
        .lean(),
      WelfareDisbursements.find(match)
        .select("beneficiaryName category amount date paymentMethod description referenceId createdBy createdAt updatedAt")
        .populate("createdBy", "fullName")
        .sort({ date: -1 })
        .limit(2000)
        .lean()
    ]);

    const rows = [
      ...(contribs || []).map((r) => ({
        type: "Contribution",
        referenceId: r?.referenceId || "—",
        name: personName(r?.member) || "—",
        memberId: r?.member?.memberId || "—",
        phone: r?.member?.phoneNumber || "—",
        category: "—",
        date: toDateStr(r?.date),
        amount: clampToNumber(r?.amount),
        paymentMethod: r?.paymentMethod || "—",
        description: "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      })),
      ...(disburs || []).map((r) => ({
        type: "Disbursement",
        referenceId: r?.referenceId || "—",
        name: r?.beneficiaryName || "—",
        memberId: "—",
        phone: "—",
        category: r?.category || "—",
        date: toDateStr(r?.date),
        amount: clampToNumber(r?.amount),
        paymentMethod: r?.paymentMethod || "—",
        description: r?.description || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const availableColumns = [
      { key: "type", label: "Type" },
      { key: "referenceId", label: "Reference ID" },
      { key: "name", label: "Name" },
      { key: "memberId", label: "Member ID" },
      { key: "phone", label: "Phone" },
      { key: "category", label: "Category" },
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "description", label: "Description" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Welfare",
      columns: availableColumns,
      availableColumns,
      rows
    };
  }

  if (module === "business-ventures") {
    const BusinessVentures = (await import("../models/financeModel/businessModel/businessVenturesModel.js")).default;
    const match = { church: churchId, ...(from && to ? { createdAt: { $gte: from, $lte: to } } : {}) };

    const rows = await BusinessVentures.find(match)
      .select("businessName description manager phoneNumber startDate referenceId createdBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "referenceId", label: "Reference ID" },
      { key: "businessName", label: "Business" },
      { key: "manager", label: "Manager" },
      { key: "phoneNumber", label: "Phone" },
      { key: "startDate", label: "Start Date" },
      { key: "description", label: "Description" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Business Ventures",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        referenceId: r?.referenceId || "—",
        businessName: r?.businessName || "—",
        manager: r?.manager || "—",
        phoneNumber: r?.phoneNumber || "—",
        startDate: toDateStr(r?.startDate),
        description: r?.description || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "church-projects") {
    const ChurchProject = (await import("../models/financeModel/projectModel/churchProjectModel.js")).default;
    const match = { church: churchId, ...(from && to ? { createdAt: { $gte: from, $lte: to } } : {}) };

    const rows = await ChurchProject.find(match)
      .select("name targetAmount description startDate status referenceId createdBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "referenceId", label: "Reference ID" },
      { key: "name", label: "Project" },
      { key: "targetAmount", label: "Target" },
      { key: "startDate", label: "Start Date" },
      { key: "status", label: "Status" },
      { key: "description", label: "Description" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Church Projects",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        referenceId: r?.referenceId || "—",
        name: r?.name || "—",
        targetAmount: clampToNumber(r?.targetAmount),
        startDate: toDateStr(r?.startDate),
        status: r?.status || "—",
        description: r?.description || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
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
      .select("title category department cell group description dateFrom dateTo timeFrom timeTo time venue organizers createdBy createdAt updatedAt")
      .populate("department", "name")
      .populate("cell", "name")
      .populate("group", "name")
      .populate("createdBy", "fullName")
      .sort({ dateFrom: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "department", label: "Department" },
      { key: "cell", label: "Cell" },
      { key: "group", label: "Group" },
      { key: "venue", label: "Venue" },
      { key: "dateFrom", label: "From" },
      { key: "dateTo", label: "To" },
      { key: "timeFrom", label: "Time From" },
      { key: "timeTo", label: "Time To" },
      { key: "time", label: "Time" },
      { key: "organizers", label: "Organizers" },
      { key: "description", label: "Description" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Programs & Events",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        title: r?.title || "—",
        category: r?.category || "—",
        department: r?.department?.name || "—",
        cell: r?.cell?.name || "—",
        group: r?.group?.name || "—",
        venue: r?.venue || "—",
        dateFrom: toDateStr(r?.dateFrom),
        dateTo: toDateStr(r?.dateTo),
        timeFrom: r?.timeFrom || "—",
        timeTo: r?.timeTo || "—",
        time: r?.time || "—",
        organizers: Array.isArray(r?.organizers) && r.organizers.length ? r.organizers.join(", ") : "—",
        description: r?.description || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "organisations") {
    const Group = (await import("../models/organisationModel/groupModel.js")).default;
    const Department = (await import("../models/organisationModel/departmentModel.js")).default;
    const Cell = (await import("../models/organisationModel/cellModel.js")).default;
    const Ministry = (await import("../models/organisationModel/ministryModel.js")).default;

    const createdMatch = from && to ? { createdAt: { $gte: from, $lte: to } } : {};
    const orgSelect = "name description meetingSchedule mainMeetingDay meetingTime meetingVenue members status createdBy createdAt updatedAt";

    const [groups, departments, cells, ministries] = await Promise.all([
      Group.find({ church: churchId, ...createdMatch }).select(orgSelect).populate("createdBy", "fullName").lean(),
      Department.find({ church: churchId, ...createdMatch }).select(orgSelect).populate("createdBy", "fullName").lean(),
      Cell.find({ church: churchId, ...createdMatch }).select(orgSelect).populate("createdBy", "fullName").lean(),
      Ministry.find({ church: churchId, ...createdMatch }).select(orgSelect).populate("createdBy", "fullName").lean()
    ]);

    const formatSchedule = (r) => {
      const sched = Array.isArray(r?.meetingSchedule) ? r.meetingSchedule : [];
      const str = sched
        .map((s) => [s?.meetingDay, s?.meetingTime, s?.meetingVenue].filter(Boolean).join(" "))
        .filter(Boolean)
        .join("; ");
      return str || "—";
    };

    const mapOrg = (type, hasStatus) => (r) => ({
      type,
      name: r?.name || "—",
      status: hasStatus ? r?.status || "—" : "—",
      mainMeetingDay: r?.mainMeetingDay || "—",
      meetingTime: r?.meetingTime || "—",
      meetingVenue: r?.meetingVenue || "—",
      meetingSchedule: formatSchedule(r),
      membersCount: Array.isArray(r?.members) ? r.members.length : "—",
      description: r?.description || "—",
      recordedBy: userName(r?.createdBy),
      createdAt: toDateTimeStr(r?.createdAt),
      updatedAt: toDateTimeStr(r?.updatedAt)
    });

    const rows = [
      ...(groups || []).map(mapOrg("Group", false)),
      ...(departments || []).map(mapOrg("Department", true)),
      ...(cells || []).map(mapOrg("Cell", true)),
      ...(ministries || []).map(mapOrg("Ministry", true))
    ].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    const availableColumns = [
      { key: "type", label: "Type" },
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "mainMeetingDay", label: "Meeting Day" },
      { key: "meetingTime", label: "Meeting Time" },
      { key: "meetingVenue", label: "Meeting Venue" },
      { key: "meetingSchedule", label: "Meeting Schedule" },
      { key: "membersCount", label: "Members" },
      { key: "description", label: "Description" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Organisations",
      columns: availableColumns,
      availableColumns,
      rows
    };
  }

  if (module === "attendance-individual") {
    const ServiceIndividualAttendance = (await import("../models/serviceIndividualAttendanceModel.js")).default;
    const match = { church: churchId, ...rangeMatch("date") };
    const rows = await ServiceIndividualAttendance.find(match)
      .select("date serviceType mainSpeaker presentMembers absentMembers totalMembersSnapshot selfCheckInActive createdBy createdAt updatedAt")
      .populate("presentMembers", "firstName lastName")
      .populate("absentMembers", "firstName lastName")
      .populate("createdBy", "fullName")
      .sort({ date: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "date", label: "Date" },
      { key: "serviceType", label: "Service Type" },
      { key: "present", label: "Present" },
      { key: "absent", label: "Absent" },
      { key: "total", label: "Total Members" },
      { key: "presentMembers", label: "Present Members" },
      { key: "absentMembers", label: "Absent Members" },
      { key: "mainSpeaker", label: "Speaker" },
      { key: "selfCheckInActive", label: "Self Check-In Active" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Attendance (Individual)",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        date: toDateStr(r?.date),
        serviceType: r?.serviceType || "—",
        present: Array.isArray(r?.presentMembers) ? r.presentMembers.length : 0,
        absent: Array.isArray(r?.absentMembers) ? r.absentMembers.length : 0,
        total: clampToNumber(r?.totalMembersSnapshot),
        presentMembers: joinNames(r?.presentMembers),
        absentMembers: joinNames(r?.absentMembers),
        mainSpeaker: r?.mainSpeaker || "—",
        selfCheckInActive: yesNo(r?.selfCheckInActive),
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "visitors") {
    const match = { church: churchId, ...rangeMatch("serviceDate") };
    const rows = await Visitor.find(match)
      .select("fullName phoneNumber email location serviceType serviceDate invitedBy source status note createdBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .sort({ serviceDate: -1 })
      .limit(2000)
      .lean();

    const availableColumns = [
      { key: "serviceDate", label: "Date" },
      { key: "fullName", label: "Name" },
      { key: "phoneNumber", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "location", label: "Location" },
      { key: "serviceType", label: "Service Type" },
      { key: "invitedBy", label: "Invited By" },
      { key: "source", label: "Source" },
      { key: "status", label: "Status" },
      { key: "note", label: "Note" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Visitors",
      columns: availableColumns,
      availableColumns,
      rows: rows.map((r) => ({
        serviceDate: toDateStr(r?.serviceDate),
        fullName: r?.fullName || "—",
        phoneNumber: r?.phoneNumber || "—",
        email: r?.email || "—",
        location: r?.location || "—",
        serviceType: r?.serviceType || "—",
        invitedBy: r?.invitedBy || "—",
        source: r?.source || "—",
        status: r?.status || "—",
        note: r?.note || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    };
  }

  if (module === "announcements") {
    const Announcement = (await import("../models/announcementModel.js")).default;
    const AnnouncementMessage = (await import("../models/announcementMessageModel.js")).default;
    const match = { church: churchId, ...rangeMatch("createdAt") };

    const [announcements, messages] = await Promise.all([
      Announcement.find(match)
        .select("title message sendMethod targetAudience postedBy createdAt updatedAt")
        .populate("postedBy", "fullName")
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean(),
      AnnouncementMessage.find(match)
        .select("title content channels smsSenderId sender_id_used status scheduledAt recipientCount deliveredCount sentCount pendingCount failedCount costPerRecipientCredits totalCostCredits segmentsPerMessage createdBy createdAt updatedAt")
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean()
    ]);

    const rows = [
      ...(announcements || []).map((r) => ({
        type: "Announcement",
        title: r?.title || "—",
        message: r?.message || "—",
        channel: r?.sendMethod || "In-App",
        senderId: "—",
        status: "—",
        scheduledAt: "—",
        date: toDateStr(r?.createdAt),
        recipients: Array.isArray(r?.targetAudience) ? r.targetAudience.length : "—",
        delivered: "—",
        sent: "—",
        pending: "—",
        failed: "—",
        segments: "—",
        costCredits: "—",
        postedBy: userName(r?.postedBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      })),
      ...(messages || []).map((r) => ({
        type: "Message",
        title: r?.title || "—",
        message: r?.content || "—",
        channel: Array.isArray(r?.channels) && r.channels.length ? r.channels.join(", ").toUpperCase() : "—",
        senderId: r?.sender_id_used || r?.smsSenderId || "—",
        status: r?.status || "—",
        scheduledAt: toDateTimeStr(r?.scheduledAt),
        date: toDateStr(r?.scheduledAt || r?.createdAt),
        recipients: clampToNumber(r?.recipientCount),
        delivered: clampToNumber(r?.deliveredCount),
        sent: clampToNumber(r?.sentCount),
        pending: clampToNumber(r?.pendingCount),
        failed: clampToNumber(r?.failedCount),
        segments: clampToNumber(r?.segmentsPerMessage),
        costCredits: clampToNumber(r?.totalCostCredits),
        postedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const availableColumns = [
      { key: "type", label: "Type" },
      { key: "title", label: "Title" },
      { key: "message", label: "Message" },
      { key: "channel", label: "Channel" },
      { key: "senderId", label: "Sender ID" },
      { key: "status", label: "Status" },
      { key: "scheduledAt", label: "Scheduled At" },
      { key: "date", label: "Date" },
      { key: "recipients", label: "Recipients" },
      { key: "delivered", label: "Delivered" },
      { key: "sent", label: "Sent" },
      { key: "pending", label: "Pending" },
      { key: "failed", label: "Failed" },
      { key: "segments", label: "Segments" },
      { key: "costCredits", label: "Cost (Credits)" },
      { key: "postedBy", label: "Posted By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Announcements",
      columns: availableColumns,
      availableColumns,
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
        .select("title date endDate startTime endTime location area type description objective targetCount teamLeader teamMembers status notes referenceId createdBy createdAt updatedAt")
        .populate("teamLeader", "firstName lastName")
        .populate("teamMembers", "firstName lastName")
        .populate("createdBy", "fullName")
        .sort({ date: -1 })
        .limit(2000)
        .lean(),
      OutreachProspect.find(createdMatch)
        .select("firstName lastName phone alternativePhone email gender ageGroup occupation address community preferredContact howReached existingChurchStatus heardGospel acceptedChrist rededication wantsPrayer wantsToVisitChurch alreadyChristian notInterested decision interestLevel stage dateReached nextFollowUpDate convertedToMember markedAsVisitor notes outreachEvent recordedBy createdBy createdAt updatedAt")
        .populate("outreachEvent", "title")
        .populate("recordedBy", "firstName lastName")
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean(),
      OutreachFollowUp.find(createdMatch)
        .select("type status outcome scheduledDate followUpDate nextFollowUpDate notes prospect outreachEvent assignedTo conductedBy createdBy createdAt updatedAt")
        .populate("prospect", "firstName lastName phone")
        .populate("outreachEvent", "title")
        .populate("assignedTo", "firstName lastName")
        .populate("conductedBy", "firstName lastName")
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean()
    ]);

    const rows = [
      ...(events || []).map((r) => ({
        type: "Outreach Event",
        referenceId: r?.referenceId || "—",
        name: r?.title || "—",
        phone: "—",
        email: "—",
        detail: r?.type || "—",
        event: "—",
        status: r?.status || "—",
        outcome: "—",
        date: toDateStr(r?.date),
        endDate: toDateStr(r?.endDate),
        time: [r?.startTime, r?.endTime].filter(Boolean).join(" - ") || "—",
        location: [r?.location, r?.area].filter(Boolean).join(", ") || "—",
        targetCount: r?.targetCount ?? "—",
        assignedTo: [
          r?.teamLeader ? `${personName(r.teamLeader)} (Leader)` : "",
          ...(Array.isArray(r?.teamMembers) ? r.teamMembers.map((m) => personName(m)) : [])
        ].filter(Boolean).join(", ") || "—",
        nextFollowUpDate: "—",
        note: [r?.objective, r?.description, r?.notes].filter(Boolean).join(" | ") || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      })),
      ...(prospects || []).map((r) => ({
        type: "Prospect",
        referenceId: "—",
        name: personName(r) || "—",
        phone: [r?.phone, r?.alternativePhone].filter(Boolean).join(" / ") || "—",
        email: r?.email || "—",
        detail: [r?.gender, r?.ageGroup, r?.occupation].filter(Boolean).join(", ") || "—",
        event: r?.outreachEvent?.title || "—",
        status: r?.stage || "—",
        outcome: [
          r?.acceptedChrist ? "Accepted Christ" : "",
          r?.rededication ? "Rededication" : "",
          r?.wantsToVisitChurch ? "Wants to visit" : "",
          r?.wantsPrayer ? "Wants prayer" : "",
          r?.notInterested ? "Not interested" : "",
          r?.convertedToMember ? "Converted to member" : "",
          r?.markedAsVisitor ? "Marked as visitor" : ""
        ].filter(Boolean).join(", ") || (r?.decision && r.decision !== "none" ? r.decision : "—"),
        date: toDateStr(r?.dateReached || r?.createdAt),
        endDate: "—",
        time: "—",
        location: [r?.address, r?.community].filter(Boolean).join(", ") || "—",
        targetCount: "—",
        assignedTo: "—",
        nextFollowUpDate: toDateStr(r?.nextFollowUpDate),
        note: [
          r?.howReached ? `Reached via ${r.howReached}` : "",
          r?.preferredContact ? `Prefers ${r.preferredContact}` : "",
          r?.interestLevel ? `Interest: ${r.interestLevel}` : "",
          r?.existingChurchStatus && r.existingChurchStatus !== "none" ? `Church status: ${r.existingChurchStatus}` : "",
          r?.notes || ""
        ].filter(Boolean).join(" | ") || "—",
        recordedBy: personName(r?.recordedBy) || userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      })),
      ...(followUps || []).map((r) => ({
        type: "Follow-Up",
        referenceId: "—",
        name: personName(r?.prospect) || "—",
        phone: r?.prospect?.phone || "—",
        email: "—",
        detail: r?.type || "—",
        event: r?.outreachEvent?.title || "—",
        status: r?.status || "—",
        outcome: r?.outcome || "—",
        date: toDateStr(r?.followUpDate || r?.scheduledDate || r?.createdAt),
        endDate: "—",
        time: "—",
        location: "—",
        targetCount: "—",
        assignedTo: personName(r?.assignedTo) || personName(r?.conductedBy) || "—",
        nextFollowUpDate: toDateStr(r?.nextFollowUpDate),
        note: r?.notes || "—",
        recordedBy: userName(r?.createdBy),
        createdAt: toDateTimeStr(r?.createdAt),
        updatedAt: toDateTimeStr(r?.updatedAt)
      }))
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const availableColumns = [
      { key: "type", label: "Type" },
      { key: "referenceId", label: "Reference ID" },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "detail", label: "Detail" },
      { key: "event", label: "Outreach Event" },
      { key: "status", label: "Status / Stage" },
      { key: "outcome", label: "Outcome / Decisions" },
      { key: "date", label: "Date" },
      { key: "endDate", label: "End Date" },
      { key: "time", label: "Time" },
      { key: "location", label: "Location" },
      { key: "targetCount", label: "Target Count" },
      { key: "assignedTo", label: "Assigned To / Team" },
      { key: "nextFollowUpDate", label: "Next Follow-Up" },
      { key: "note", label: "Notes" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Outreach & Follow-Up",
      columns: availableColumns,
      availableColumns,
      rows
    };
  }

  if (module === "budgeting") {
    const match = { church: churchId, ...rangeMatch("createdAt") };
    const budgets = await Budget.find(match)
      .select("name fiscalYear periodFrom periodTo status items referenceId createdBy updatedBy createdAt updatedAt")
      .populate("createdBy", "fullName")
      .populate("updatedBy", "fullName")
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
      const base = {
        referenceId: b?.referenceId || "—",
        budget: b?.name || "—",
        fiscalYear: b?.fiscalYear ?? "—",
        budgetPeriod: formatPeriod(b?.periodFrom, b?.periodTo),
        status: b?.status || "—",
        recordedBy: userName(b?.createdBy),
        updatedBy: userName(b?.updatedBy),
        createdAt: toDateTimeStr(b?.createdAt),
        updatedAt: toDateTimeStr(b?.updatedAt)
      };
      const items = Array.isArray(b?.items) ? b.items : [];
      if (!items.length) {
        rows.push({
          ...base,
          type: "—",
          category: "—",
          amount: 0,
          itemPeriod: "—",
          allocatedTo: "—",
          notes: "—"
        });
        return;
      }
      items.forEach((it) => {
        rows.push({
          ...base,
          type: it?.type || "—",
          category: it?.category || "—",
          amount: clampToNumber(it?.amount),
          itemPeriod: formatPeriod(it?.dateFrom, it?.dateTo),
          allocatedTo: it?.allocatedTo?.entityName
            ? it.allocatedTo.entityType
              ? `${it.allocatedTo.entityName} (${it.allocatedTo.entityType})`
              : it.allocatedTo.entityName
            : it?.allocatedTo?.entityType || "—",
          notes: it?.notes || "—"
        });
      });
    });

    const availableColumns = [
      { key: "referenceId", label: "Reference ID" },
      { key: "budget", label: "Budget" },
      { key: "fiscalYear", label: "Fiscal Year" },
      { key: "budgetPeriod", label: "Budget Period" },
      { key: "type", label: "Type" },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount" },
      { key: "itemPeriod", label: "Item Period" },
      { key: "allocatedTo", label: "Allocated To" },
      { key: "notes", label: "Notes" },
      { key: "status", label: "Status" },
      { key: "recordedBy", label: "Recorded By" },
      { key: "updatedBy", label: "Updated By" },
      { key: "createdAt", label: "Created At" },
      { key: "updatedAt", label: "Updated At" }
    ];

    return {
      title: "Budgeting",
      columns: availableColumns,
      availableColumns,
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

function writeCsvTableReport({ title, subtitle, columns, rows, res, fileName }) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  const cols = Array.isArray(columns) ? columns : [];
  const lines = [];
  if (title) lines.push(csvEscapeCell(title));
  const meta = [subtitle, `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")}`]
    .filter(Boolean)
    .join(" | ");
  if (meta) lines.push(csvEscapeCell(meta));
  if (lines.length) lines.push("");
  lines.push(cols.map((c) => csvEscapeCell(c?.label || c?.key)).join(","));
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    lines.push(cols.map((c) => csvEscapeCell(r?.[c.key])).join(","));
  });

  res.send(`﻿${lines.join("\r\n")}`);
}

function writeReportFile({ format, title, subtitle, columns, rows, res, fileName }) {
  if (format === "csv") {
    writeCsvTableReport({ title, subtitle, columns, rows, res, fileName });
    return Promise.resolve();
  }
  if (format === "excel") {
    return writeExcelTableReport({ title, columns, rows, res, fileName });
  }
  writePdfTableReport({ title, subtitle, columns, rows, res, fileName });
  return Promise.resolve();
}

function writePdfTableReport({ title, subtitle, columns, rows, res, fileName }) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  const cols = Array.isArray(columns) ? columns : [];
  const data = Array.isArray(rows) ? rows : [];

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36,
    bufferPages: true,
    info: { Title: title || "Report", Creator: "ChurchClerk" }
  });
  doc.pipe(res);

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = doc.page.margins.left;
  const tableW = pageW - margin * 2;
  const fontSize = 7.5;
  const padX = 5;
  const headerH = 20;
  const rowH = 16;
  const maxRows = 2000;

  doc.font("Helvetica");

  const truncate = (value, width) => {
    const s = String(value ?? "");
    doc.fontSize(fontSize);
    const avail = Math.max(10, width - padX * 2);
    if (doc.widthOfString(s) <= avail) return s;
    let t = s;
    while (t.length > 1 && doc.widthOfString(`${t}…`) > avail) t = t.slice(0, -1);
    return `${t}…`;
  };

  // Column widths weighted by header + longest sampled content
  const sample = data.slice(0, 300);
  const weights = cols.map((c) => {
    const key = c?.key;
    let maxLen = String(c?.label || key || "").length;
    sample.forEach((r) => {
      const len = String(r?.[key] ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    return Math.min(Math.max(maxLen + 2, 7), 42);
  });
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const widths = weights.map((w) => Math.max(28, (w / weightSum) * tableW));

  const drawTitleBlock = () => {
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#0f172a")
      .text(title || "Report", margin, 26, { width: tableW, lineBreak: false });
    const meta = [subtitle, `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, `${data.length} record${data.length === 1 ? "" : "s"}`]
      .filter(Boolean)
      .join("   •   ");
    doc.font("Helvetica").fontSize(8).fillColor("#64748b")
      .text(meta, margin, 46, { width: tableW, lineBreak: false });
    doc.moveTo(margin, 60).lineTo(margin + tableW, 60).lineWidth(0.8).strokeColor("#cbd5e1").stroke();
    doc.font("Helvetica");
  };

  const drawTableHeader = (y) => {
    doc.save().rect(margin, y, tableW, headerH).fill("#1d4ed8").restore();
    let x = margin;
    cols.forEach((c, i) => {
      doc.font("Helvetica-Bold").fontSize(fontSize).fillColor("#ffffff")
        .text(truncate(c?.label || c?.key, widths[i]), x + padX, y + 6, {
          width: widths[i] - padX * 2,
          lineBreak: false
        });
      x += widths[i];
    });
    doc.font("Helvetica");
  };

  let y;
  const startTablePage = (firstPage) => {
    if (firstPage) {
      drawTitleBlock();
      y = 68;
    } else {
      y = margin;
    }
    drawTableHeader(y);
    y += headerH;
  };

  if (cols.length) {
    startTablePage(true);
    data.slice(0, maxRows).forEach((r, idx) => {
      if (y + rowH > pageH - margin) {
        doc.addPage();
        startTablePage(false);
      }
      if (idx % 2 === 1) {
        doc.save().rect(margin, y, tableW, rowH).fill("#f1f5f9").restore();
      }
      let x = margin;
      cols.forEach((c, i) => {
        doc.font("Helvetica").fontSize(fontSize).fillColor("#1f2937")
          .text(truncate(r?.[c.key], widths[i]), x + padX, y + 4.5, {
            width: widths[i] - padX * 2,
            lineBreak: false
          });
        x += widths[i];
      });
      doc.moveTo(margin, y + rowH).lineTo(margin + tableW, y + rowH)
        .lineWidth(0.4).strokeColor("#e2e8f0").stroke();
      y += rowH;
    });
    if (!data.length) {
      doc.font("Helvetica").fontSize(9).fillColor("#64748b")
        .text("No records found for this report.", margin, y + 10, { width: tableW, align: "center" });
    }
  } else {
    drawTitleBlock();
    doc.font("Helvetica").fontSize(9).fillColor("#64748b")
      .text("No columns selected for this report.", margin, 76, { width: tableW, align: "center" });
  }

  // Footer page numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(7).fillColor("#94a3b8")
      .text(`${title || "Report"}  —  Page ${i + 1} of ${range.count}`, margin, pageH - margin + 8, {
        width: tableW,
        align: "center",
        lineBreak: false
      });
  }

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

    const moduleLabel = REPORT_MODULE_LABELS[String(moduleKey).trim().toLowerCase()] || finalReport?.title || moduleKey;
    const subtitle = `Module: ${moduleLabel}   •   Period: ${resolved.from && resolved.to ? `${resolved.from.toISOString().slice(0, 10)} to ${resolved.to.toISOString().slice(0, 10)}` : "All time"}`;

    await writeReportFile({
      format,
      title: finalReport?.title,
      subtitle,
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

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || "").trim();
    const moduleKey = String(req.query.module || "").trim().toLowerCase();
    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();

    const match = { church: churchId };
    if (moduleKey && moduleKey !== "all") match.module = moduleKey;
    if (search) {
      match.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }
    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = startOfDay(new Date(dateFrom));
      if (dateTo) match.createdAt.$lte = endOfDay(new Date(dateTo));
    }

    const [totalResult, rows] = await Promise.all([
      SavedReport.countDocuments(match),
      SavedReport.find(match)
        .select("name module moduleLabel rowCount dateFrom dateTo shareToken createdAt createdBy")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    const totalPages = Math.max(1, Math.ceil(totalResult / limit));

    return res.status(200).json({
      message: "Saved reports fetched",
      savedReports: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalResult,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null,
        limit
      }
    });
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

    const period = doc.dateFrom && doc.dateTo
      ? `${new Date(doc.dateFrom).toISOString().slice(0, 10)} to ${new Date(doc.dateTo).toISOString().slice(0, 10)}`
      : "All time";
    const subtitle = `Module: ${doc.moduleLabel || doc.module || "—"}   •   Period: ${period}`;

    await writeReportFile({
      format,
      title: doc.name,
      subtitle,
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

    const period = doc.dateFrom && doc.dateTo
      ? `${new Date(doc.dateFrom).toISOString().slice(0, 10)} to ${new Date(doc.dateTo).toISOString().slice(0, 10)}`
      : "All time";
    const subtitle = `Module: ${doc.moduleLabel || doc.module || "—"}   •   Period: ${period}`;

    await writeReportFile({
      format,
      title: doc.name,
      subtitle,
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
