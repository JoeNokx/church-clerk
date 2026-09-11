import Budget from "../../models/financeModel/budgetingModel.js";
import GeneralExpenses from "../../models/generalExpenseModel.js";
import WelfareDisbursements from "../../models/financeModel/welfareModel/welfareDisbursementModel.js";
import ProjectExpense from "../../models/financeModel/projectModel/projectExpenseModel.js";
import BusinessExpenses from "../../models/financeModel/businessModel/businessExpensesModel.js";
import Expense from "../../models/financeModel/incomeExpenseModel/expenseModel.js";
import Income from "../../models/financeModel/incomeExpenseModel/incomeModel.js";
import TitheIndividual from "../../models/financeModel/tithesModel/titheIndividualModel.js";
import TitheAggregate from "../../models/financeModel/tithesModel/titheAggregateModel.js";
import Offering from "../../models/financeModel/offeringModel.js";
import BusinessIncome from "../../models/financeModel/businessModel/businessIncomeModel.js";
import EventOffering from "../../models/eventModel/eventOfferingModel.js";
import CellOffering from "../../models/ministryModel/cellOfferingModel.js";
import GroupOffering from "../../models/ministryModel/groupOfferingModel.js";
import DepartmentOffering from "../../models/ministryModel/departmentOfferingModel.js";
import SpecialFund from "../../models/financeModel/specialFundModel.js";
import PledgePayment from "../../models/financeModel/pledgeModel/pledgePaymentModel.js";
import WelfareContribution from "../../models/financeModel/welfareModel/welfareContributionModel.js";
import ProjectContribution from "../../models/financeModel/projectModel/projectContributionModel.js";

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const VALID_STATUSES = ["draft", "pending_approval", "approved", "active", "closed"];

const normalizeStatus = (v) => {
  const s = String(v || "").trim().toLowerCase();
  return VALID_STATUSES.includes(s) ? s : "draft";
};

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const buildPeriodMatch = (from, to, field = "date") => {
  const match = {};
  if (from && to) match[field] = { $gte: from, $lte: to };
  else if (from) match[field] = { $gte: from };
  else if (to) match[field] = { $lte: to };
  return match;
};

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Determine the status a budget should have based on today vs its period.
 * Only applies when the budget has at least one period date.
 */
function autoStatusFromDates(budget) {
  const from = budget?.periodFrom ? new Date(budget.periodFrom) : null;
  const to = budget?.periodTo ? new Date(budget.periodTo) : null;
  if (!from && !to) return null;

  const now = new Date();
  const current = budget?.status;

  // Auto-close when period ends and budget is active
  if (to && now > to && current === "active") return "closed";
  // Auto-activate when period starts and budget has been approved
  if (from && now >= from && (!to || now <= to) && current === "approved") return "active";
  return null;
}

/**
 * If the auto-computed status differs from the stored status, persist the change.
 * Returns the (possibly updated) budget object.
 */
async function applyAutoStatus(budget) {
  const auto = autoStatusFromDates(budget);
  if (auto && auto !== budget.status) {
    const updated = await Budget.findByIdAndUpdate(
      budget._id,
      { status: auto },
      { new: true }
    ).lean();
    return updated || budget;
  }
  return budget;
}

// ─── expense aggregations ────────────────────────────────────────────────────

/**
 * Sum actual expenses across all expense sources for a church within an optional date range.
 */
const sumExpensesAcrossSources = async (churchId, from, to) => {
  // Guard: if no date range at all, don't aggregate everything ever recorded
  if (!from && !to) return null;
  const sources = [
    { Model: GeneralExpenses,    dateField: "date"     },
    { Model: WelfareDisbursements,dateField: "date"    },
    { Model: ProjectExpense,     dateField: "date"     },
    { Model: BusinessExpenses,   dateField: "date"     },
    { Model: Expense,            dateField: "dateSpent"},
  ];

  const sums = await Promise.all(
    sources.map(async ({ Model, dateField }) => {
      const match = { church: churchId, ...buildPeriodMatch(from, to, dateField) };
      const rows = await Model.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      return Number(rows?.[0]?.total || 0);
    })
  );

  return sums.reduce((acc, v) => acc + v, 0);
};

// All income sources — mirrors reportsAnalyticsController
const INCOME_SOURCES = [
  { Model: TitheIndividual,   dateField: "date"         },
  { Model: TitheAggregate,    dateField: "date"         },
  { Model: Offering,          dateField: "serviceDate"  },
  { Model: BusinessIncome,    dateField: "date"         },
  { Model: EventOffering,     dateField: "offeringDate" },
  { Model: CellOffering,      dateField: "date"         },
  { Model: GroupOffering,     dateField: "date"         },
  { Model: DepartmentOffering,dateField: "date"         },
  { Model: Income,            dateField: "dateReceived" },
];

/**
 * Sum actual income across ALL income sources for a church within an optional date range.
 * Returns null when no date range is provided (actuals cannot be meaningfully bounded).
 */
const sumIncomeAcrossSources = async (churchId, from, to) => {
  // Guard: if no date range at all, don't aggregate everything ever recorded
  if (!from && !to) return null;
  const sums = await Promise.all(
    INCOME_SOURCES.map(async ({ Model, dateField }) => {
      const match = { church: churchId, ...buildPeriodMatch(from, to, dateField) };
      const rows = await Model.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      return Number(rows?.[0]?.total || 0);
    })
  );
  return sums.reduce((acc, v) => acc + v, 0);
};

/**
 * Expense sources for per-item actuals. `categoryField` is the field on the
 * document that holds the category label (most use "category"; ProjectExpense
 * uses "spentOn").
 */
const ITEM_EXPENSE_SOURCES = [
  { Model: GeneralExpenses,     dateField: "date",      categoryField: "category" },
  { Model: WelfareDisbursements,dateField: "date",      categoryField: "category" },
  { Model: ProjectExpense,      dateField: "date",      categoryField: "spentOn"  },
  { Model: BusinessExpenses,    dateField: "date",      categoryField: "category" },
  { Model: Expense,             dateField: "dateSpent", categoryField: "category" },
];

/**
 * Income categories that are also recorded in dedicated models.
 * `entityType` (when set) means this source is tied to a specific ministry
 * entity — records carry a ref to that entity in `entityField`.
 * Sources with `entityType: null` are "general" sources (no entity ref).
 */
const INCOME_CATEGORY_SOURCES = {
  Tithe: [
    { Model: TitheIndividual, dateField: "date", entityType: null },
    { Model: TitheAggregate,  dateField: "date", entityType: null },
  ],
  Offering: [
    { Model: Offering,           dateField: "serviceDate",  entityType: null        },
    { Model: EventOffering,      dateField: "offeringDate", entityType: "event",    entityField: "event"     },
    { Model: CellOffering,       dateField: "date",         entityType: "cell",     entityField: "cell"      },
    { Model: GroupOffering,      dateField: "date",         entityType: "group",     entityField: "group"     },
    { Model: DepartmentOffering, dateField: "date",         entityType: "department", entityField: "department" },
  ],
  "Cell Offering": [
    { Model: CellOffering,       dateField: "date",         entityType: "cell",     entityField: "cell"      },
  ],
  "Group Offering": [
    { Model: GroupOffering,      dateField: "date",         entityType: "group",     entityField: "group"     },
  ],
  "Department Offering": [
    { Model: DepartmentOffering, dateField: "date",         entityType: "department", entityField: "department" },
  ],
  "Event Offering": [
    { Model: EventOffering,      dateField: "offeringDate", entityType: "event",    entityField: "event"     },
  ],
  "Special Fund": [
    { Model: SpecialFund,        dateField: "givingDate",   entityType: null },
  ],
  Pledge: [
    { Model: PledgePayment,      dateField: "paymentDate",  entityType: null },
  ],
  "Welfare Contribution": [
    { Model: WelfareContribution, dateField: "date",         entityType: null },
  ],
  "Church Project Contribution": [
    { Model: ProjectContribution, dateField: "date",         entityType: null },
  ],
  "Business Ventures Income": [
    { Model: BusinessIncome,      dateField: "date",         entityType: null },
  ],
};

/**
 * Determine whether a source should be queried for a given allocation, and
 * what extra match filter to apply.
 *   - If the item has no allocation (or allocation to church/administration/
 *     other), all sources are queried with no entity filter.
 *   - If the item is allocated to a specific entity (cell/group/department/
 *     event), only sources whose `entityType` matches are queried, and they
 *     are filtered by `entityField = entityId`. General sources are skipped.
 */
const buildEntityFilter = (allocatedTo, sourceEntityType, sourceEntityField) => {
  const allocType = String(allocatedTo?.entityType || "").trim();
  const allocId = allocatedTo?.entityId || null;

  // No specific entity allocation → no filter
  if (!allocType || ["church", "administration", "other"].includes(allocType) || !allocId) {
    return { include: true, match: {} };
  }

  // Allocation to a specific entity (cell/group/department/event)
  if (sourceEntityType === allocType && sourceEntityField) {
    return { include: true, match: { [sourceEntityField]: allocId } };
  }

  // Source doesn't match the allocated entity → skip it
  return { include: false, match: {} };
};

/**
 * For each budget item, compute actual amounts using ONLY the item's own
 * dateFrom/dateTo. The item's category filters the records so only amounts
 * matching both the category and the item's date range are summed.
 * If the item is allocated to a specific entity (cell/group/department/event),
 * only records from that entity are counted.
 * Returns an Array<number|null> indexed to items.
 * null means "no item date range available — not computed".
 */
const getItemActuals = async (churchId, items) => {
  return Promise.all(items.map(async (item) => {
    // Use ONLY the item's own dates — do not fall back to the budget period.
    const from = item.dateFrom ? new Date(item.dateFrom) : null;
    const to   = item.dateTo   ? new Date(item.dateTo)   : null;

    // No item date range → cannot compute actuals
    if (!from && !to) return null;

    const catRegex = new RegExp(
      `^${String(item.category || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"
    );

    const allocatedTo = item.allocatedTo || {};

    if (item.type === "expense") {
      const sums = await Promise.all(
        ITEM_EXPENSE_SOURCES.map(async ({ Model, dateField, categoryField }) => {
          const match = {
            church: churchId,
            [categoryField]: catRegex,
            ...buildPeriodMatch(from, to, dateField)
          };
          const rows = await Model.aggregate([
            { $match: match },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]);
          return Number(rows?.[0]?.total || 0);
        })
      );
      return sums.reduce((a, v) => a + v, 0);
    }

    if (item.type === "income") {
      const categoryKey = String(item.category || "").trim();
      const specializedSources = INCOME_CATEGORY_SOURCES[categoryKey] || [];

      const specializedSums = await Promise.all(
        specializedSources.map(async ({ Model, dateField, entityType: srcEntityType, entityField: srcEntityField }) => {
          const { include, match: entityMatch } = buildEntityFilter(allocatedTo, srcEntityType, srcEntityField);
          if (!include) return 0;
          const match = { church: churchId, ...entityMatch, ...buildPeriodMatch(from, to, dateField) };
          const rows = await Model.aggregate([
            { $match: match },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]);
          return Number(rows?.[0]?.total || 0);
        })
      );

      // General Income model — only query when there are no specialized sources
      // for this category (to avoid double-counting). Also skip when the item
      // is allocated to a specific entity (general Income has no entity ref).
      let generalIncomeSum = 0;
      if (specializedSources.length === 0) {
        const { include: includeGeneral } = buildEntityFilter(allocatedTo, null, null);
        if (includeGeneral) {
          const match = {
            church: churchId,
            category: catRegex,
            ...buildPeriodMatch(from, to, "dateReceived")
          };
          const rows = await Income.aggregate([
            { $match: match },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]);
          generalIncomeSum = Number(rows?.[0]?.total || 0);
        }
      }

      return [...specializedSums, generalIncomeSum].reduce((a, v) => a + v, 0);
    }

    return null;
  }));
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const createBudget = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const name = String(req.body?.name || "").trim();
    const fiscalYear = toNumber(req.body?.fiscalYear);

    if (!name) return res.status(400).json({ message: "Budget name is required" });
    if (!Number.isFinite(fiscalYear)) return res.status(400).json({ message: "Fiscal year is required" });

    const periodFrom = parseDate(req.body?.periodFrom);
    const periodTo = parseDate(req.body?.periodTo);
    if (periodFrom && periodTo && periodTo < periodFrom) {
      return res.status(400).json({ message: "periodTo must be after periodFrom" });
    }

    // Derive initial status from dates if not provided
    const rawStatus = normalizeStatus(req.body?.status);
    const autoStatus = autoStatusFromDates({ periodFrom, periodTo });
    const status = autoStatus || rawStatus;

    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const items = rawItems
      .map((i) => {
        const type = String(i?.type || "expense").trim().toLowerCase();
        const category = String(i?.category || "").trim();
        const amount = toNumber(i?.amount);
        const notes = String(i?.notes || "").trim();

        if (!category) return null;
        if (!Number.isFinite(amount) || amount < 0) return null;
        if (type !== "expense" && type !== "income") return null;

        const alloc = i?.allocatedTo || {};
        const allocatedTo = {
          entityType: alloc.entityType || null,
          entityId: alloc.entityId || null,
          entityName: String(alloc.entityName || "").trim()
        };

        const dateFrom = parseDate(i?.dateFrom) || null;
        const dateTo   = parseDate(i?.dateTo)   || null;

        return { type, category, amount, notes, dateFrom, dateTo, allocatedTo };
      })
      .filter(Boolean);

    const budget = await Budget.create({
      church: churchId,
      name,
      fiscalYear: Number(fiscalYear),
      periodFrom,
      periodTo,
      status,
      items,
      createdBy: req.user._id
    });

    return res.status(201).json({ message: "Budget created successfully", budget });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Budget could not be created" });
  }
};

export const listBudgets = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const { page = 1, limit = 10, search = "", fiscalYear, status } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { church: churchId };

    const q = String(search || "").trim();
    if (q) query.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    if (fiscalYear !== undefined && fiscalYear !== null && String(fiscalYear).trim() !== "") {
      const fy = toNumber(fiscalYear);
      if (!Number.isFinite(fy)) return res.status(400).json({ message: "Invalid fiscalYear" });
      query.fiscalYear = Number(fy);
    }

    const normalizedStatus = String(status || "").trim().toLowerCase();
    if (normalizedStatus) {
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      query.status = normalizedStatus;
    }

    const rows = await Budget.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Recommendation #4: auto-update status for any budget whose period dates imply a different status
    const updatedRows = await Promise.all(rows.map(applyAutoStatus));

    const total = await Budget.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    const pagination = {
      totalResult: total,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    };

    return res.status(200).json({
      message: "Budgets fetched successfully",
      pagination,
      count: updatedRows.length,
      budgets: updatedRows
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Budgets could not be fetched" });
  }
};

export const getBudget = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const id = String(req.params?.id || "").trim();
    let budget = await Budget.findOne({ _id: id, church: churchId }).lean();
    if (!budget) return res.status(404).json({ message: "Budget not found" });

    // Recommendation #4: auto-update status on fetch
    budget = await applyAutoStatus(budget);

    return res.status(200).json({ message: "Budget fetched successfully", budget });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Budget could not be fetched" });
  }
};

export const updateBudget = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const id = String(req.params?.id || "").trim();

    const patch = {};

    if (req.body?.name !== undefined) {
      const name = String(req.body?.name || "").trim();
      if (!name) return res.status(400).json({ message: "Budget name is required" });
      patch.name = name;
    }

    if (req.body?.fiscalYear !== undefined) {
      const fiscalYear = toNumber(req.body?.fiscalYear);
      if (!Number.isFinite(fiscalYear)) return res.status(400).json({ message: "Fiscal year is required" });
      patch.fiscalYear = Number(fiscalYear);
    }

    if (req.body?.periodFrom !== undefined) patch.periodFrom = parseDate(req.body?.periodFrom);
    if (req.body?.periodTo !== undefined) patch.periodTo = parseDate(req.body?.periodTo);

    if (patch.periodFrom && patch.periodTo && patch.periodTo < patch.periodFrom) {
      return res.status(400).json({ message: "periodTo must be after periodFrom" });
    }

    if (req.body?.status !== undefined) {
      patch.status = normalizeStatus(req.body?.status);
    } else if (patch.periodFrom !== undefined || patch.periodTo !== undefined) {
      // Recalculate auto status when period dates change
      const existing = await Budget.findOne({ _id: id, church: churchId }).lean();
      const merged = {
        periodFrom: patch.periodFrom ?? existing?.periodFrom,
        periodTo: patch.periodTo ?? existing?.periodTo
      };
      const auto = autoStatusFromDates(merged);
      if (auto) patch.status = auto;
    }

    if (req.body?.items !== undefined) {
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
      const items = rawItems
        .map((i) => {
          const type = String(i?.type || "expense").trim().toLowerCase();
          const category = String(i?.category || "").trim();
          const amount = toNumber(i?.amount);
          const notes = String(i?.notes || "").trim();

          if (!category) return null;
          if (!Number.isFinite(amount) || amount < 0) return null;
          if (type !== "expense" && type !== "income") return null;

          const alloc = i?.allocatedTo || {};
          const allocatedTo = {
            entityType: alloc.entityType || null,
            entityId: alloc.entityId || null,
            entityName: String(alloc.entityName || "").trim()
          };

          const dateFrom = parseDate(i?.dateFrom) || null;
          const dateTo   = parseDate(i?.dateTo)   || null;

          return { type, category, amount, notes, dateFrom, dateTo, allocatedTo };
        })
        .filter(Boolean);

      patch.items = items;
    }

    patch.updatedBy = req.user?._id || null;

    const updated = await Budget.findOneAndUpdate({ _id: id, church: churchId }, patch, {
      new: true,
      runValidators: true
    });

    if (!updated) return res.status(404).json({ message: "Budget not found" });

    return res.status(200).json({ message: "Budget updated successfully", budget: updated });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Budget could not be updated" });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const id = String(req.params?.id || "").trim();

    const deleted = await Budget.findOneAndDelete({ _id: id, church: churchId });
    if (!deleted) return res.status(404).json({ message: "Budget not found" });

    return res.status(200).json({ message: "Budget deleted successfully", budget: deleted });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Budget could not be deleted" });
  }
};

export const getBudgetSummary = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const id = String(req.params?.id || "").trim();
    let budget = await Budget.findOne({ _id: id, church: churchId }).lean();
    if (!budget) return res.status(404).json({ message: "Budget not found" });

    // Recommendation #4: auto-update status on fetch
    budget = await applyAutoStatus(budget);

    const items = Array.isArray(budget?.items) ? budget.items : [];
    const plannedExpenseTotal = items.filter((i) => i?.type === "expense").reduce((acc, i) => acc + Number(i?.amount || 0), 0);
    const plannedIncomeTotal  = items.filter((i) => i?.type === "income").reduce((acc, i)  => acc + Number(i?.amount || 0), 0);

    // Per-item actuals — each item uses ONLY its own dateFrom/dateTo and
    // is filtered by category + allocatedTo entity.
    const itemActuals = await getItemActuals(churchId, items);
    const itemsWithActuals = items.map((item, idx) => {
      const actual = itemActuals[idx];  // null = not computed (no item date range)
      return {
        ...item,
        actual,
        variance: actual !== null ? Number(item.amount || 0) - actual : null
      };
    });

    // Budget-level actual totals = sum of per-item actuals.
    // Items with no date range (actual === null) contribute 0.
    // If no items exist, totals are 0.
    const actualExpenseTotal = itemsWithActuals
      .filter((i) => i?.type === "expense")
      .reduce((acc, i) => acc + (typeof i.actual === "number" ? i.actual : 0), 0);
    const actualIncomeTotal = itemsWithActuals
      .filter((i) => i?.type === "income")
      .reduce((acc, i) => acc + (typeof i.actual === "number" ? i.actual : 0), 0);

    return res.status(200).json({
      message: "Budget summary fetched successfully",
      data: {
        plannedExpenseTotal,
        plannedIncomeTotal,
        actualExpenseTotal,
        actualIncomeTotal,
        varianceExpense: plannedExpenseTotal - actualExpenseTotal,
        varianceIncome:  actualIncomeTotal  - plannedIncomeTotal,
        hasPeriod: items.some((i) => i?.dateFrom || i?.dateTo),
        itemsWithActuals
      }
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Budget summary could not be fetched" });
  }
};
