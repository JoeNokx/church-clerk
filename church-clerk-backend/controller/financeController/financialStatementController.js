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
import EventOffering from "../../models/eventModel/eventOfferingModel.js";
import CellOffering from "../../models/ministryModel/cellOfferingModel.js";
import GroupOffering from "../../models/ministryModel/groupOfferingModel.js";
import DepartmentOffering from "../../models/ministryModel/departmentOfferingModel.js";
import PledgePayment from "../../models/financeModel/pledgeModel/pledgePaymentModel.js";
import Income from "../../models/financeModel/incomeExpenseModel/incomeModel.js";
import Expense from "../../models/financeModel/incomeExpenseModel/expenseModel.js";

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

function percentChange(current, previous) {
  const prev = Number(previous || 0);
  const curr = Number(current || 0);
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
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

  return Number(res?.[0]?.totalAmount || 0);
}

function pickTop(rows) {
  const valid = (rows || []).filter((r) => Number(r?.amount || 0) > 0);
  if (!valid.length) return null;
  valid.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  return valid[0];
}

function withPercent(rows, total) {
  const denom = Number(total || 0);
  return (rows || []).map((r) => {
    const amount = Number(r?.amount || 0);
    const pct = denom > 0 ? (amount / denom) * 100 : 0;
    return { ...r, amount, percentage: pct };
  });
}

function clampToNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function toSafeFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function resolveExportPeriod({ type, now, query }) {
  const normalizedType = ["monthly", "quarterly", "annual"].includes(String(type || "").toLowerCase())
    ? String(type).toLowerCase()
    : "monthly";

  if (normalizedType === "annual") {
    const year = Number(query.year || now.getFullYear());
    const periodStart = startOfDay(new Date(year, 0, 1));
    const periodEnd = endOfDay(new Date(year, 11, 31));

    const prevStart = startOfDay(new Date(year - 1, 0, 1));
    const prevEnd = endOfDay(new Date(year - 1, 11, 31));
    return {
      periodStart,
      periodEnd,
      prevStart,
      prevEnd,
      label: String(year)
    };
  }

  if (normalizedType === "quarterly") {
    const year = Number(query.year || now.getFullYear());
    const defaultQuarter = Math.floor(now.getMonth() / 3) + 1;

    const startMonth = Number(query.startMonth || (defaultQuarter - 1) * 3 + 1);
    const endMonth = Number(query.endMonth || startMonth + 2);

    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12 || endMonth < startMonth) {
      return { error: "Invalid quarterly months" };
    }

    const periodStart = startOfDay(new Date(year, startMonth - 1, 1));
    const periodEnd = endOfDay(new Date(year, endMonth, 0));

    const prevQuarterEnd = new Date(year, startMonth - 2, 0);
    const prevQuarterStart = new Date(prevQuarterEnd.getFullYear(), prevQuarterEnd.getMonth() - 2, 1);
    const prevStart = startOfDay(prevQuarterStart);
    const prevEnd = endOfDay(prevQuarterEnd);

    const startLabel = periodStart.toLocaleDateString(undefined, { month: "long" });
    const endLabel = periodEnd.toLocaleDateString(undefined, { month: "long" });
    const label = `${startLabel} - ${endLabel} ${year}`;

    return { periodStart, periodEnd, prevStart, prevEnd, label };
  }

  const year = Number(query.year || now.getFullYear());
  const month = Number(query.month || now.getMonth() + 1);
  if (month < 1 || month > 12) {
    return { error: "Invalid month" };
  }

  const periodStart = startOfDay(new Date(year, month - 1, 1));
  const periodEnd = endOfDay(new Date(year, month, 0));

  const prevMonthDate = new Date(year, month - 2, 1);
  const prevStart = startOfDay(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1));
  const prevEnd = endOfDay(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0));

  const label = periodStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return { periodStart, periodEnd, prevStart, prevEnd, label };
}

function writePdfStatement({ statement, res, fileName }) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text("Financial Statement", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#444").text(`Period: ${statement?.period?.label || "—"}`);
  doc.moveDown(1);

  const kpi = statement?.kpi || {};
  doc.fillColor("#000");
  doc.fontSize(13).text("Key Metrics", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Total Income: GHS ${clampToNumber(kpi.totalIncome).toLocaleString()}`);
  doc.text(`Total Expenses: GHS ${clampToNumber(kpi.totalExpenses).toLocaleString()}`);
  doc.text(`Surplus / Deficit: GHS ${clampToNumber(kpi.surplus).toLocaleString()}`);
  doc.text(`Surplus % of Income: ${Math.round(clampToNumber(kpi.surplusPctOfIncome) * 10) / 10}%`);

  doc.moveDown(1);
  doc.fontSize(13).text("Income Breakdown", { underline: true });
  doc.moveDown(0.5);
  (statement?.incomeDetails || []).forEach((r) => {
    doc.fontSize(11).text(`${r.label}: GHS ${clampToNumber(r.amount).toLocaleString()} (${Math.round(clampToNumber(r.percentage) * 10) / 10}%)`);
  });

  doc.moveDown(1);
  doc.fontSize(13).text("Expenses Breakdown", { underline: true });
  doc.moveDown(0.5);
  (statement?.expenseDetails || []).forEach((r) => {
    doc.fontSize(11).text(`${r.label}: GHS ${clampToNumber(r.amount).toLocaleString()} (${Math.round(clampToNumber(r.percentage) * 10) / 10}%)`);
  });

  doc.end();
}

async function writeExcelStatement({ statement, res, fileName }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "church-clerk";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Statement");

  sheet.columns = [
    { header: "Section", key: "section", width: 22 },
    { header: "Item", key: "item", width: 38 },
    { header: "Amount (GHS)", key: "amount", width: 18 },
    { header: "Percent (%)", key: "percent", width: 14 }
  ];

  sheet.addRow({ section: "Period", item: statement?.period?.label || "—" });
  sheet.addRow({});

  const kpi = statement?.kpi || {};
  sheet.addRow({ section: "KPI", item: "Total Income", amount: clampToNumber(kpi.totalIncome) });
  sheet.addRow({ section: "KPI", item: "Total Expenses", amount: clampToNumber(kpi.totalExpenses) });
  sheet.addRow({ section: "KPI", item: "Surplus / Deficit", amount: clampToNumber(kpi.surplus) });
  sheet.addRow({ section: "KPI", item: "Surplus % of Income", percent: Math.round(clampToNumber(kpi.surplusPctOfIncome) * 10) / 10 });
  sheet.addRow({});

  (statement?.incomeDetails || []).forEach((r) => {
    sheet.addRow({
      section: "Income",
      item: r.label,
      amount: clampToNumber(r.amount),
      percent: Math.round(clampToNumber(r.percentage) * 10) / 10
    });
  });

  sheet.addRow({});

  (statement?.expenseDetails || []).forEach((r) => {
    sheet.addRow({
      section: "Expense",
      item: r.label,
      amount: clampToNumber(r.amount),
      percent: Math.round(clampToNumber(r.percentage) * 10) / 10
    });
  });

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  await workbook.xlsx.write(res);
  res.end();
}

async function buildStatement({ churchId, periodStart, periodEnd, prevStart, prevEnd, label }) {
  const incomeSources = [
    { key: "tithes", label: "Tithe (Individual)", Model: TitheIndividual, dateField: "date", amountField: "amount" },
    { key: "tithesAggregate", label: "Tithes (Aggregate)", Model: TitheAggregate, dateField: "date", amountField: "amount" },
    { key: "offerings", label: "Offerings", Model: Offering, dateField: "serviceDate", amountField: "amount" },
    { key: "eventOfferings", label: "Events Offering", Model: EventOffering, dateField: "offeringDate", amountField: "amount" },
    { key: "cellOfferings", label: "Cell Offering", Model: CellOffering, dateField: "date", amountField: "amount" },
    { key: "groupOfferings", label: "Group Offering", Model: GroupOffering, dateField: "date", amountField: "amount" },
    { key: "departmentOfferings", label: "Department Offering", Model: DepartmentOffering, dateField: "date", amountField: "amount" },
    { key: "projectContributions", label: "Church Project Contributions", Model: ProjectContribution, dateField: "date", amountField: "amount" },
    { key: "welfareContributions", label: "Welfare Contributions", Model: WelfareContributions, dateField: "date", amountField: "amount" },
    { key: "specialFunds", label: "Special Funds", Model: SpecialFund, dateField: "givingDate", amountField: "totalAmount" },
    { key: "businessIncome", label: "Business Ventures Income", Model: BusinessIncome, dateField: "date", amountField: "amount" },
    { key: "pledgesPaid", label: "Pledges Paid", Model: PledgePayment, dateField: "paymentDate", amountField: "amount" },
    { key: "otherIncome", label: "Other Income", Model: Income, dateField: "dateReceived", amountField: "amount" }
  ];

  const expenseSources = [
    { key: "generalExpenses", label: "General Expenses", Model: GeneralExpenses, dateField: "date", amountField: "amount" },
    { key: "welfareDisbursements", label: "Welfare Disbursements", Model: WelfareDisbursements, dateField: "date", amountField: "amount" },
    { key: "projectExpenses", label: "Church Project Expenses", Model: ProjectExpense, dateField: "date", amountField: "amount" },
    { key: "businessExpenses", label: "Business Ventures Expenses", Model: BusinessExpenses, dateField: "date", amountField: "amount" },
    { key: "otherExpenses", label: "Other Expenses", Model: Expense, dateField: "dateSpent", amountField: "amount" }
  ];

  const incomeDetailsRaw = await Promise.all(
    incomeSources.map(async (s) => {
      const amount = await sumByPeriod({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart,
        periodEnd
      });
      return { key: s.key, label: s.label, amount };
    })
  );

  const expenseDetailsRaw = await Promise.all(
    expenseSources.map(async (s) => {
      const amount = await sumByPeriod({
        Model: s.Model,
        churchId,
        dateField: s.dateField,
        amountField: s.amountField,
        periodStart,
        periodEnd
      });
      return { key: s.key, label: s.label, amount };
    })
  );

  const totalIncome = incomeDetailsRaw.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalExpenses = expenseDetailsRaw.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const surplus = totalIncome - totalExpenses;

  const incomeDetails = withPercent(incomeDetailsRaw, totalIncome);
  const expenseDetails = withPercent(expenseDetailsRaw, totalExpenses);

  const topIncome = pickTop(incomeDetails);
  const topExpense = pickTop(expenseDetails);

  const prevIncome = await Promise.all(
    incomeSources.map((s) =>
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
  const prevTotalIncome = prevIncome.reduce((sum, v) => sum + Number(v || 0), 0);

  const prevExpenses = await Promise.all(
    expenseSources.map((s) =>
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
  const prevTotalExpenses = prevExpenses.reduce((sum, v) => sum + Number(v || 0), 0);

  const surplusPctOfIncome = totalIncome > 0 ? (surplus / totalIncome) * 100 : 0;

  return {
    period: {
      label,
      start: periodStart,
      end: periodEnd
    },
    kpi: {
      totalIncome,
      totalExpenses,
      surplus,
      incomeChangePct: percentChange(totalIncome, prevTotalIncome),
      expensesChangePct: percentChange(totalExpenses, prevTotalExpenses),
      surplusPctOfIncome
    },
    incomeDetails,
    expenseDetails,
    highlights: {
      topIncomeSource: topIncome,
      topExpenseCategory: topExpense
    }
  };
}

const getAnnualFinancialStatement = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const now = new Date();
    const year = Number(req.query.year || now.getFullYear());

    const periodStart = startOfDay(new Date(year, 0, 1));
    const periodEnd = endOfDay(new Date(year, 11, 31));

    const prevStart = startOfDay(new Date(year - 1, 0, 1));
    const prevEnd = endOfDay(new Date(year - 1, 11, 31));

    const data = await buildStatement({ churchId, periodStart, periodEnd, prevStart, prevEnd, label: String(year) });

    return res.status(200).json({
      message: "Annual financial statement fetched successfully",
      data
    });
  } catch (error) {
    return res.status(400).json({
      message: "Annual financial statement could not be fetched",
      error: error.message
    });
  }
};

const getMonthlyFinancialStatement = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const now = new Date();

    const year = Number(req.query.year || now.getFullYear());
    const month = Number(req.query.month || now.getMonth() + 1);

    if (month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid month" });
    }

    const periodStart = startOfDay(new Date(year, month - 1, 1));
    const periodEnd = endOfDay(new Date(year, month, 0));

    const prevMonthDate = new Date(year, month - 2, 1);
    const prevStart = startOfDay(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1));
    const prevEnd = endOfDay(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0));

    const label = periodStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const data = await buildStatement({ churchId, periodStart, periodEnd, prevStart, prevEnd, label });

    return res.status(200).json({
      message: "Monthly financial statement fetched successfully",
      data
    });
  } catch (error) {
    return res.status(400).json({
      message: "Monthly financial statement could not be fetched",
      error: error.message
    });
  }
};

const getQuarterlyFinancialStatement = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const now = new Date();
    const year = Number(req.query.year || now.getFullYear());

    const defaultQuarter = Math.floor(now.getMonth() / 3) + 1;
    const startMonth = Number(req.query.startMonth || (defaultQuarter - 1) * 3 + 1);
    const endMonth = Number(req.query.endMonth || startMonth + 2);

    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12 || endMonth < startMonth) {
      return res.status(400).json({ message: "Invalid quarterly months" });
    }

    const periodStart = startOfDay(new Date(year, startMonth - 1, 1));
    const periodEnd = endOfDay(new Date(year, endMonth, 0));

    const prevQuarterEnd = new Date(year, startMonth - 2, 0);
    const prevQuarterStart = new Date(prevQuarterEnd.getFullYear(), prevQuarterEnd.getMonth() - 2, 1);
    const prevStart = startOfDay(prevQuarterStart);
    const prevEnd = endOfDay(prevQuarterEnd);

    const startLabel = periodStart.toLocaleDateString(undefined, { month: "long" });
    const endLabel = periodEnd.toLocaleDateString(undefined, { month: "long" });
    const label = `${startLabel} - ${endLabel} ${year}`;

    const data = await buildStatement({ churchId, periodStart, periodEnd, prevStart, prevEnd, label });

    return res.status(200).json({
      message: "Quarterly financial statement fetched successfully",
      data
    });
  } catch (error) {
    return res.status(400).json({
      message: "Quarterly financial statement could not be fetched",
      error: error.message
    });
  }
};

const exportFinancialStatement = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const now = new Date();

    const type = String(req.query.type || "monthly");
    const format = String(req.query.format || "pdf").toLowerCase();
    if (!["pdf", "excel"].includes(format)) {
      return res.status(400).json({ message: "Invalid export format" });
    }

    const resolved = resolveExportPeriod({ type, now, query: req.query });
    if (resolved?.error) {
      return res.status(400).json({ message: resolved.error });
    }

    const statement = await buildStatement({
      churchId,
      periodStart: resolved.periodStart,
      periodEnd: resolved.periodEnd,
      prevStart: resolved.prevStart,
      prevEnd: resolved.prevEnd,
      label: resolved.label
    });

    const ext = format === "excel" ? "xlsx" : "pdf";
    const fileName = `financial-statement-${toSafeFileName(type)}-${toSafeFileName(statement?.period?.label)}.${ext}`;

    if (format === "excel") {
      await writeExcelStatement({ statement, res, fileName });
      return;
    }

    writePdfStatement({ statement, res, fileName });
  } catch (error) {
    return res.status(400).json({
      message: "Financial statement export failed",
      error: error.message
    });
  }
};

export { getAnnualFinancialStatement, getMonthlyFinancialStatement, getQuarterlyFinancialStatement, exportFinancialStatement };