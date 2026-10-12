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
import Pledge from "../../models/financeModel/pledgeModel/pledgeModel.js";
import PledgePayment from "../../models/financeModel/pledgeModel/pledgePaymentModel.js";
import OutreachSupport from "../../models/outreachModel/outreachSupportModel.js";
import Income from "../../models/financeModel/incomeExpenseModel/incomeModel.js";
import Expense from "../../models/financeModel/incomeExpenseModel/expenseModel.js";

import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { startOfDay, endOfDay, percentChange, clampToNumber, toSafeFileName } from "../../utils/dateHelpers.js";
import { pickTop, withPercent } from "../../utils/financeHelpers.js";

async function sumByPeriod({ Model, churchId, dateField, amountField, periodStart, periodEnd, extraMatch }) {
  const match = {
    church: churchId,
    [dateField]: { $gte: periodStart, $lte: periodEnd },
    ...(extraMatch || {})
  };

  const res = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, totalAmount: { $sum: `$${amountField}` } } }
  ]);

  return Number(res?.[0]?.totalAmount || 0);
}

const hasField = (path) => ({ $eq: [{ $type: path }, "objectId"] });
const lacksField = (path) => ({ $ne: [{ $type: path }, "objectId"] });

async function sumPledgePaymentsByScope({ churchId, periodStart, periodEnd }) {
  const res = await PledgePayment.aggregate([
    {
      $match: {
        church: churchId,
        paymentDate: { $gte: periodStart, $lte: periodEnd }
      }
    },
    {
      $lookup: {
        from: "pledges",
        localField: "pledge",
        foreignField: "_id",
        as: "pledgeDoc"
      }
    },
    { $unwind: "$pledgeDoc" },
    {
      $group: {
        _id: null,
        project: {
          $sum: {
            $cond: [hasField("$pledgeDoc.churchProject"), "$amount", 0]
          }
        },
        program: {
          $sum: {
            $cond: [
              {
                $and: [
                  hasField("$pledgeDoc.event"),
                  lacksField("$pledgeDoc.churchProject")
                ]
              },
              "$amount",
              0
            ]
          }
        },
        unscoped: {
          $sum: {
            $cond: [
              {
                $and: [
                  lacksField("$pledgeDoc.churchProject"),
                  lacksField("$pledgeDoc.event")
                ]
              },
              "$amount",
              0
            ]
          }
        }
      }
    }
  ]);

  const row = res?.[0] || {};
  return {
    project: Number(row.project || 0),
    program: Number(row.program || 0),
    unscoped: Number(row.unscoped || 0)
  };
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

function writePdfStatement({ statement, res, fileName, currency }) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

  const cur = String(currency || "").trim().toUpperCase() || "GHS";

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
  doc.text(`Total Income: ${cur} ${clampToNumber(kpi.totalIncome).toLocaleString()}`);
  doc.text(`Total Expenses: ${cur} ${clampToNumber(kpi.totalExpenses).toLocaleString()}`);
  doc.text(`Surplus / Deficit: ${cur} ${clampToNumber(kpi.surplus).toLocaleString()}`);
  doc.text(`Surplus % of Income: ${Math.round(clampToNumber(kpi.surplusPctOfIncome) * 10) / 10}%`);

  doc.moveDown(1);
  doc.fontSize(13).text("Income Breakdown", { underline: true });
  doc.moveDown(0.5);
  (statement?.incomeDetails || []).forEach((r) => {
    doc.fontSize(11).text(`${r.label}: ${cur} ${clampToNumber(r.amount).toLocaleString()} (${Math.round(clampToNumber(r.percentage) * 10) / 10}%)`);
  });

  doc.moveDown(1);
  doc.fontSize(13).text("Expenses Breakdown", { underline: true });
  doc.moveDown(0.5);
  (statement?.expenseDetails || []).forEach((r) => {
    doc.fontSize(11).text(`${r.label}: ${cur} ${clampToNumber(r.amount).toLocaleString()} (${Math.round(clampToNumber(r.percentage) * 10) / 10}%)`);
  });

  doc.end();
}

async function writeExcelStatement({ statement, res, fileName, currency }) {
  const cur = String(currency || "").trim().toUpperCase() || "GHS";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "church-clerk";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Statement");

  sheet.columns = [
    { header: "Section", key: "section", width: 22 },
    { header: "Item", key: "item", width: 38 },
    { header: `Amount (${cur})`, key: "amount", width: 18 },
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

// Each source = one breakdown line. `queries` are summed for totals and also
// drive the per-record drill-down. `detail` describes how to render a record's
// name/meta; `pledgeScope` folds that scope's pledge payments into the line.
const INCOME_SOURCES = [
  {
    key: "tithes", label: "Tithes",
    queries: [
      { Model: TitheIndividual, dateField: "date", amountField: "amount",
        detail: {
          nameJoin: ["member.firstName", "member.lastName"],
          nameFields: ["payerName"],
          tag: "Individual tithe",
          metaFields: ["paymentMethod"],
          populate: [{ path: "member", select: "firstName lastName" }]
        } },
      { Model: TitheAggregate, dateField: "date", amountField: "amount",
        detail: { nameFields: ["serviceType", "description"], metaFields: [], tag: "Aggregate tithe" } }
    ]
  },
  {
    key: "offerings", label: "Offerings",
    queries: [
      { Model: Offering, dateField: "serviceDate", amountField: "amount",
        detail: { nameFields: ["offeringType"], tag: "Offering", metaFields: ["serviceType"] } }
    ]
  },
  {
    key: "programOfferings", label: "Programs Offerings, Seed & Pledges", pledgeScope: "program",
    queries: [
      { Model: ProgramOffering, dateField: "offeringDate", amountField: "amount",
        detail: { nameFields: ["seedName", "offeringType"], tagField: "kind", tag: "Offering", metaFields: [] } }
    ]
  },
  {
    key: "cellOfferings", label: "Cell Offerings & Seed",
    queries: [
      { Model: CellOffering, dateField: "date", amountField: "amount",
        detail: { nameFields: ["offeringType"], tagField: "recordType", tag: "Offering", metaFields: [] } }
    ]
  },
  {
    key: "groupOfferings", label: "Groups Offerings & Seed",
    queries: [
      { Model: GroupOffering, dateField: "date", amountField: "amount",
        detail: { nameFields: ["offeringType"], tagField: "recordType", tag: "Offering", metaFields: [] } }
    ]
  },
  {
    key: "departmentOfferings", label: "Department Offerings & Seed",
    queries: [
      { Model: DepartmentOffering, dateField: "date", amountField: "amount",
        detail: { nameFields: ["offeringType"], tagField: "recordType", tag: "Offering", metaFields: [] } }
    ]
  },
  {
    key: "ministryOfferings", label: "Ministry Offerings & Seed",
    queries: [
      { Model: MinistryOffering, dateField: "date", amountField: "amount",
        detail: { nameFields: ["offeringType"], tagField: "recordType", tag: "Offering", metaFields: [] } }
    ]
  },
  {
    key: "projectContributions", label: "Fundraising Contributions", pledgeScope: "project",
    queries: [
      { Model: ProjectContribution, dateField: "date", amountField: "amount",
        detail: { nameFields: ["contributorName"], tag: "Instant Pay", metaFields: [] } }
    ]
  },
  {
    key: "welfareContributions", label: "Welfare Contributions",
    queries: [
      { Model: WelfareContributions, dateField: "date", amountField: "amount",
        detail: {
          nameJoin: ["member.firstName", "member.lastName"],
          nameFields: ["note"],
          tag: "Contribution",
          metaFields: ["paymentMethod"],
          populate: [{ path: "member", select: "firstName lastName" }]
        } }
    ]
  },
  {
    key: "outreachSupport", label: "Outreach Support",
    queries: [
      { Model: OutreachSupport, dateField: "date", amountField: "amount",
        detail: {
          nameJoin: ["member.firstName", "member.lastName", "visitor.fullName"],
          nameFields: ["name", "note"],
          tag: "Support",
          metaFields: ["paymentMethod"],
          populate: [
            { path: "member", select: "firstName lastName" },
            { path: "visitor", select: "fullName" }
          ]
        } }
    ]
  },
  {
    key: "specialFunds", label: "Special Funds",
    queries: [
      { Model: SpecialFund, dateField: "givingDate", amountField: "totalAmount",
        detail: { nameFields: ["giverName"], tag: "Special fund", metaFields: ["category"] } }
    ]
  },
  {
    key: "businessIncome", label: "Business Ventures Income",
    queries: [
      { Model: BusinessIncome, dateField: "date", amountField: "amount",
        detail: { nameFields: ["recievedFrom"], tag: "Business income", metaFields: ["category", "paymentMethod"] } }
    ]
  },
  {
    key: "otherIncome", label: "Other Income", pledgeScope: "unscoped",
    queries: [
      { Model: Income, dateField: "dateReceived", amountField: "amount",
        detail: { nameFields: ["category"], tag: "Other income", metaFields: [] } }
    ]
  }
];

const EXPENSE_SOURCES = [
  {
    key: "generalExpenses", label: "General Expenses",
    queries: [
      { Model: GeneralExpenses, dateField: "date", amountField: "amount",
        extraMatch: { cell: null, department: null, group: null, ministry: null, event: null, outreach: null },
        detail: { nameFields: ["title"], tag: "Expense", metaFields: ["category", "paymentMethod"] } }
    ]
  },
  {
    key: "outreachExpenses", label: "Outreach Expenses",
    queries: [
      { Model: GeneralExpenses, dateField: "date", amountField: "amount",
        extraMatch: { outreach: { $type: "objectId" } },
        detail: { nameFields: ["title"], tag: "Expense", metaFields: ["category", "paymentMethod"] } }
    ]
  },
  {
    key: "programExpenses", label: "Programs Expenses",
    queries: [
      { Model: GeneralExpenses, dateField: "date", amountField: "amount",
        extraMatch: { event: { $type: "objectId" } },
        detail: { nameFields: ["title"], tag: "Expense", metaFields: ["category", "paymentMethod"] } }
    ]
  },
  {
    key: "cellExpenses", label: "Cell Expenses",
    queries: [
      { Model: GeneralExpenses, dateField: "date", amountField: "amount",
        extraMatch: { cell: { $type: "objectId" } },
        detail: { nameFields: ["title"], tag: "Expense", metaFields: ["category", "paymentMethod"] } }
    ]
  },
  {
    key: "departmentExpenses", label: "Department Expenses",
    queries: [
      { Model: GeneralExpenses, dateField: "date", amountField: "amount",
        extraMatch: { department: { $type: "objectId" } },
        detail: { nameFields: ["title"], tag: "Expense", metaFields: ["category", "paymentMethod"] } }
    ]
  },
  {
    key: "groupExpenses", label: "Groups Expenses",
    queries: [
      { Model: GeneralExpenses, dateField: "date", amountField: "amount",
        extraMatch: { group: { $type: "objectId" } },
        detail: { nameFields: ["title"], tag: "Expense", metaFields: ["category", "paymentMethod"] } }
    ]
  },
  {
    key: "ministryExpenses", label: "Ministry Expenses",
    queries: [
      { Model: GeneralExpenses, dateField: "date", amountField: "amount",
        extraMatch: { ministry: { $type: "objectId" } },
        detail: { nameFields: ["title"], tag: "Expense", metaFields: ["category", "paymentMethod"] } }
    ]
  },
  {
    key: "welfareDisbursements", label: "Welfare Disbursements",
    queries: [
      { Model: WelfareDisbursements, dateField: "date", amountField: "amount",
        detail: { nameFields: ["beneficiaryName"], tag: "Disbursement", metaFields: ["category", "paymentMethod"] } }
    ]
  },
  {
    key: "projectExpenses", label: "Fundraising Expenses",
    queries: [
      { Model: ProjectExpense, dateField: "date", amountField: "amount",
        detail: { nameFields: ["spentOn"], tag: "Expense", metaFields: ["category"] } }
    ]
  },
  {
    key: "businessExpenses", label: "Business Ventures Expenses",
    queries: [
      { Model: BusinessExpenses, dateField: "date", amountField: "amount",
        detail: { nameFields: ["name", "spentBy"], tag: "Expense", metaFields: ["category"] } }
    ]
  },
  {
    key: "otherExpenses", label: "Other Expenses",
    queries: [
      { Model: Expense, dateField: "dateSpent", amountField: "amount",
        detail: { nameFields: ["category"], tag: "Other expense", metaFields: [] } }
    ]
  }
];

// Pledge payments are folded into the income line of the pledge's scope:
// churchProject pledges -> Fundraising Contributions, program pledges -> Programs Offerings.
// Rare unscoped pledges land in Other Income so totals stay complete.
const PLEDGE_SPLIT_BY_KEY = {
  projectContributions: "project",
  programOfferings: "program",
  otherIncome: "unscoped"
};

async function sumSource({ source, churchId, periodStart, periodEnd }) {
  const sums = await Promise.all(
    source.queries.map((q) =>
      sumByPeriod({
        Model: q.Model,
        churchId,
        dateField: q.dateField,
        amountField: q.amountField,
        periodStart,
        periodEnd,
        extraMatch: q.extraMatch
      })
    )
  );
  return sums.reduce((s, v) => s + v, 0);
}

async function getPledgePipeline({ churchId, periodStart, periodEnd, pledgeSplit }) {
  const [pledgedInPeriodAgg, pledgedToDateAgg, paidToDateAgg, overdueAgg] = await Promise.all([
    Pledge.aggregate([
      { $match: { church: churchId, pledgeDate: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    Pledge.aggregate([
      { $match: { church: churchId, pledgeDate: { $lte: periodEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    PledgePayment.aggregate([
      { $match: { church: churchId, paymentDate: { $lte: periodEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Overdue = the same derivation the pledges page uses (derivePledgeStatus):
    // deadline day has fully passed relative to now, and total paid < amount.
    // This is a current position, not an as-of-periodEnd snapshot.
    Pledge.aggregate([
      { $match: { church: churchId, deadline: { $ne: null, $lt: startOfDay(new Date()) } } },
      {
        $lookup: {
          from: "pledgepayments",
          let: { pid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$pledge", "$$pid"] } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ],
          as: "paid"
        }
      },
      { $match: { $expr: { $lt: [{ $ifNull: [{ $first: "$paid.total" }, 0] }, "$amount"] } } },
      { $count: "count" }
    ])
  ]);

  return {
    pledgedInPeriod: Number(pledgedInPeriodAgg?.[0]?.total || 0),
    collectedInPeriod: Number(pledgeSplit?.project || 0) + Number(pledgeSplit?.program || 0) + Number(pledgeSplit?.unscoped || 0),
    outstanding: Math.max(0, Number(pledgedToDateAgg?.[0]?.total || 0) - Number(paidToDateAgg?.[0]?.total || 0)),
    overdueCount: Number(overdueAgg?.[0]?.count || 0)
  };
}

async function buildStatement({ churchId, periodStart, periodEnd, prevStart, prevEnd, label }) {
  const incomeSources = INCOME_SOURCES;
  const expenseSources = EXPENSE_SOURCES;
  const pledgeSplitByKey = PLEDGE_SPLIT_BY_KEY;

  const [pledgeSplit, prevPledgeSplit] = await Promise.all([
    sumPledgePaymentsByScope({ churchId, periodStart, periodEnd }),
    sumPledgePaymentsByScope({ churchId, periodStart: prevStart, periodEnd: prevEnd })
  ]);

  const incomeDetailsRaw = await Promise.all(
    incomeSources.map(async (s) => {
      const amount = await sumSource({ source: s, churchId, periodStart, periodEnd });
      const pledgeKey = pledgeSplitByKey[s.key];
      const pledgeAmount = pledgeKey ? Number(pledgeSplit?.[pledgeKey] || 0) : 0;
      return { key: s.key, label: s.label, amount: amount + pledgeAmount };
    })
  );

  const expenseDetailsRaw = await Promise.all(
    expenseSources.map(async (s) => ({
      key: s.key,
      label: s.label,
      amount: await sumSource({ source: s, churchId, periodStart, periodEnd })
    }))
  );

  const totalIncome = incomeDetailsRaw.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalExpenses = expenseDetailsRaw.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const surplus = totalIncome - totalExpenses;

  const incomeDetails = withPercent(incomeDetailsRaw, totalIncome);
  const expenseDetails = withPercent(expenseDetailsRaw, totalExpenses);

  const topIncome = pickTop(incomeDetails);
  const topExpense = pickTop(expenseDetails);

  const prevIncome = await Promise.all(
    incomeSources.map(async (s) => {
      const base = await sumSource({ source: s, churchId, periodStart: prevStart, periodEnd: prevEnd });
      const pledgeKey = pledgeSplitByKey[s.key];
      return base + (pledgeKey ? Number(prevPledgeSplit?.[pledgeKey] || 0) : 0);
    })
  );
  const prevTotalIncome = prevIncome.reduce((sum, v) => sum + Number(v || 0), 0);

  const prevExpenses = await Promise.all(
    expenseSources.map((s) => sumSource({ source: s, churchId, periodStart: prevStart, periodEnd: prevEnd }))
  );
  const prevTotalExpenses = prevExpenses.reduce((sum, v) => sum + Number(v || 0), 0);

  const pledgePipeline = await getPledgePipeline({ churchId, periodStart, periodEnd, pledgeSplit });

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
    pledgePipeline,
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

    const currency = req.activeChurch?.currency;

    if (format === "excel") {
      await writeExcelStatement({ statement, res, fileName, currency });
      return;
    }

    writePdfStatement({ statement, res, fileName, currency });
  } catch (error) {
    return res.status(400).json({
      message: "Financial statement export failed",
      error: error.message
    });
  }
};

function getPathValue(doc, path) {
  return String(path || "").split(".").reduce(
    (acc, p) => (acc && acc[p] !== undefined ? acc[p] : undefined),
    doc
  );
}

function resolveDetailName(doc, cfg) {
  if (Array.isArray(cfg?.nameJoin)) {
    const joined = cfg.nameJoin
      .map((p) => String(getPathValue(doc, p) || "").trim())
      .filter(Boolean)
      .join(" ");
    if (joined) return joined;
  }
  for (const p of cfg?.nameFields || []) {
    const v = getPathValue(doc, p);
    if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
  }
  return "—";
}

function resolveDetailMeta(doc, cfg) {
  const parts = [];
  let tag = cfg?.tag;
  if (cfg?.tagField) {
    const v = getPathValue(doc, cfg.tagField);
    if (v !== null && v !== undefined && String(v).trim()) {
      const s = String(v).trim();
      tag = s.charAt(0).toUpperCase() + s.slice(1);
    }
  }
  if (tag) parts.push(tag);
  (cfg?.metaFields || [])
    .map((p) => getPathValue(doc, p))
    .filter((v) => v !== null && v !== undefined && String(v).trim())
    .forEach((v) => parts.push(String(v).trim()));
  return parts.join(" • ");
}

const getStatementBreakdownDetails = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const key = String(req.query.key || "");
    const now = new Date();

    const resolved = resolveExportPeriod({ type: req.query.type, now, query: req.query });
    if (resolved?.error) {
      return res.status(400).json({ message: resolved.error });
    }

    const src = [...INCOME_SOURCES, ...EXPENSE_SOURCES].find((s) => s.key === key);
    if (!src) {
      return res.status(400).json({ message: "Unknown breakdown key" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const { periodStart, periodEnd, label: periodLabel } = resolved;
    const range = (f) => ({ [f]: { $gte: periodStart, $lte: periodEnd } });

    const rows = [];
    let total = 0;
    let recordCount = 0;

    for (const q of src.queries) {
      const match = { church: churchId, ...range(q.dateField), ...(q.extraMatch || {}) };
      const cursor = q.Model.find(match).sort({ [q.dateField]: -1 }).limit(1000);
      (q.detail?.populate || []).forEach((p) => cursor.populate(p));
      const [docs, count, sumAgg] = await Promise.all([
        cursor.lean(),
        q.Model.countDocuments(match),
        q.Model.aggregate([
          { $match: match },
          { $group: { _id: null, total: { $sum: `$${q.amountField}` } } }
        ])
      ]);
      recordCount += count;
      total += Number(sumAgg?.[0]?.total || 0);
      docs.forEach((d) => {
        rows.push({
          date: d[q.dateField],
          name: resolveDetailName(d, q.detail),
          meta: resolveDetailMeta(d, q.detail),
          amount: Number(d[q.amountField] || 0),
          referenceId: d.referenceId || null
        });
      });
    }

    if (src.pledgeScope) {
      const pledgeMatch =
        src.pledgeScope === "project"
          ? { churchProject: { $ne: null } }
          : src.pledgeScope === "program"
            ? { event: { $ne: null }, churchProject: null }
            : { churchProject: null, event: null };

      const pledges = await Pledge.find({ church: churchId, ...pledgeMatch }).select("_id name").lean();
      const pledgeMap = new Map(pledges.map((p) => [String(p._id), p.name || "Pledge"]));

      if (pledges.length) {
        const payMatch = { church: churchId, pledge: { $in: pledges.map((p) => p._id) }, ...range("paymentDate") };
        const [docs, count, sumAgg] = await Promise.all([
          PledgePayment.find(payMatch).sort({ paymentDate: -1 }).limit(1000).lean(),
          PledgePayment.countDocuments(payMatch),
          PledgePayment.aggregate([
            { $match: payMatch },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ])
        ]);
        recordCount += count;
        total += Number(sumAgg?.[0]?.total || 0);
        docs.forEach((d) => {
          rows.push({
            date: d.paymentDate,
            name: pledgeMap.get(String(d.pledge)) || "Pledge",
            meta: `Pledge payment${d.paymentMethod ? ` • ${d.paymentMethod}` : ""}`,
            amount: Number(d.amount || 0),
            referenceId: d.referenceId || null
          });
        });
      }
    }

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPages = Math.max(1, Math.ceil(recordCount / limit));
    const currentPage = Math.min(page, totalPages);
    const records = rows.slice((currentPage - 1) * limit, currentPage * limit);

    return res.status(200).json({
      message: "Breakdown details fetched successfully",
      data: {
        key,
        label: src.label,
        period: { label: periodLabel, start: periodStart, end: periodEnd },
        total,
        recordCount,
        records,
        pagination: {
          totalResult: recordCount,
          currentPage,
          totalPages,
          hasPrev: currentPage > 1,
          hasNext: currentPage < totalPages,
          prevPage: currentPage > 1 ? currentPage - 1 : null,
          nextPage: currentPage < totalPages ? currentPage + 1 : null,
          limit
        }
      }
    });
  } catch (error) {
    return res.status(400).json({
      message: "Breakdown details could not be fetched",
      error: error.message
    });
  }
};

export { getAnnualFinancialStatement, getMonthlyFinancialStatement, getQuarterlyFinancialStatement, exportFinancialStatement, getStatementBreakdownDetails };