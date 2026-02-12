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
import CellOffering from "../models/ministryModel/cellOfferingModel.js";
import GroupOffering from "../models/ministryModel/groupOfferingModel.js";
import DepartmentOffering from "../models/ministryModel/departmentOfferingModel.js";
import PledgePayment from "../models/financeModel/pledgeModel/pledgePaymentModel.js";
import Income from "../models/financeModel/incomeExpenseModel/incomeModel.js";
import Expense from "../models/financeModel/incomeExpenseModel/expenseModel.js";

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
  const incomeSums = await Promise.all(
    INCOME_SOURCES.map((s) =>
      sumAll({
        Model: s.Model,
        churchId,
        amountField: s.amountField
      })
    )
  );

  const expenseSums = await Promise.all(
    EXPENSE_SOURCES.map((s) =>
      sumAll({
        Model: s.Model,
        churchId,
        amountField: s.amountField
      })
    )
  );

  const totalIncome = incomeSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const totalExpenses = expenseSums.reduce((sum, v) => sum + clampToNumber(v), 0);
  const surplus = totalIncome - totalExpenses;

  const totalNewMembers = await Member.countDocuments({ church: churchId });
  const totalVisitors = await Visitor.countDocuments({ church: churchId });

  return {
    totalIncome,
    totalExpenses,
    surplus,
    newMembers: totalNewMembers,
    visitors: totalVisitors
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
    { Model: DepartmentOffering, dateField: "date", amountField: "amount" }
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

  if (module === "attendance") {
    const match = { church: churchId, ...rangeMatch("serviceDate") };
    const rows = await Attendance.find(match)
      .select("serviceType serviceDate totalNumber mainSpeaker")
      .sort({ serviceDate: -1 })
      .limit(2000)
      .lean();

    return {
      title: "Attendance",
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

  if (module === "ministries") {
    const Group = (await import("../models/ministryModel/groupModel.js")).default;
    const Department = (await import("../models/ministryModel/departmentModel.js")).default;
    const Cell = (await import("../models/ministryModel/cellModel.js")).default;

    const createdMatch = from && to ? { createdAt: { $gte: from, $lte: to } } : {};

    const [groups, departments, cells] = await Promise.all([
      Group.find({ church: churchId, ...createdMatch }).select("name description createdAt").lean(),
      Department.find({ church: churchId, ...createdMatch }).select("name description status createdAt").lean(),
      Cell.find({ church: churchId, ...createdMatch }).select("name description status createdAt").lean()
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
      }))
    ].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return {
      title: "Ministries",
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

  return { error: "Unsupported module" };
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
      report
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
    if (!["pdf", "excel"].includes(format)) {
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

    const ext = format === "excel" ? "xlsx" : "pdf";
    const periodLabel = resolved.from && resolved.to
      ? `${resolved.from.toISOString().slice(0, 10)}-to-${resolved.to.toISOString().slice(0, 10)}`
      : "all-time";
    const fileName = `report-${toSafeFileName(moduleKey)}-${toSafeFileName(periodLabel)}.${ext}`;

    const availableColumns = Array.isArray(report?.availableColumns) && report.availableColumns.length
      ? report.availableColumns
      : report?.columns;

    const fieldsRaw = String(req.query?.fields || "").trim();
    const requestedKeys = fieldsRaw
      ? fieldsRaw.split(",").map((k) => String(k || "").trim()).filter(Boolean)
      : [];

    const exportColumns = requestedKeys.length && Array.isArray(availableColumns)
      ? requestedKeys
          .map((key) => availableColumns.find((c) => c.key === key))
          .filter(Boolean)
      : report?.columns;

    const finalColumns = Array.isArray(exportColumns) && exportColumns.length ? exportColumns : report?.columns;

    if (format === "excel") {
      await writeExcelTableReport({
        title: report?.title,
        columns: finalColumns,
        rows: report?.rows,
        res,
        fileName
      });
      return;
    }

    writePdfTableReport({
      title: report?.title,
      columns: finalColumns,
      rows: report?.rows,
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

export {
  getReportsAnalyticsKpi,
  getReportsAnalytics,
  exportReportsAnalytics,
  getReportsAnalyticsReport,
  exportReportsAnalyticsReport
};
