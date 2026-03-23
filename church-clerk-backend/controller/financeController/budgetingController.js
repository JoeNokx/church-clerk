import Budget from "../../models/financeModel/budgetingModel.js";
import GeneralExpenses from "../../models/generalExpenseModel.js";
import WelfareDisbursements from "../../models/financeModel/welfareModel/welfareDisbursementModel.js";
import ProjectExpense from "../../models/financeModel/projectModel/projectExpenseModel.js";
import BusinessExpenses from "../../models/financeModel/businessModel/businessExpensesModel.js";

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const normalizeStatus = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (s === "draft" || s === "active" || s === "archived") return s;
  return "draft";
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

const sumExpensesAcrossSources = async (churchId, from, to) => {
  const sources = [
    { Model: GeneralExpenses, dateField: "date", amountField: "amount" },
    { Model: WelfareDisbursements, dateField: "date", amountField: "amount" },
    { Model: ProjectExpense, dateField: "date", amountField: "amount" },
    { Model: BusinessExpenses, dateField: "date", amountField: "amount" }
  ];

  const sums = await Promise.all(
    sources.map(async ({ Model, dateField, amountField }) => {
      const match = { church: churchId, ...buildPeriodMatch(from, to, dateField) };
      const rows = await Model.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: `$${amountField}` } } }
      ]);
      return Number(rows?.[0]?.total || 0);
    })
  );

  return sums.reduce((acc, v) => acc + Number(v || 0), 0);
};

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

    const status = normalizeStatus(req.body?.status);

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

        return { type, category, amount, notes };
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
      if (!["draft", "active", "archived"].includes(normalizedStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      query.status = normalizedStatus;
    }

    const rows = await Budget.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

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
      count: rows.length,
      budgets: rows
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
    const budget = await Budget.findOne({ _id: id, church: churchId }).lean();
    if (!budget) return res.status(404).json({ message: "Budget not found" });

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

          return { type, category, amount, notes };
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
    const budget = await Budget.findOne({ _id: id, church: churchId }).lean();
    if (!budget) return res.status(404).json({ message: "Budget not found" });

    const items = Array.isArray(budget?.items) ? budget.items : [];
    const plannedExpenseTotal = items.filter((i) => i?.type === "expense").reduce((acc, i) => acc + Number(i?.amount || 0), 0);
    const plannedIncomeTotal = items.filter((i) => i?.type === "income").reduce((acc, i) => acc + Number(i?.amount || 0), 0);

    const from = budget?.periodFrom ? new Date(budget.periodFrom) : null;
    const to = budget?.periodTo ? new Date(budget.periodTo) : null;

    const actualExpenseTotal = await sumExpensesAcrossSources(churchId, from, to);

    return res.status(200).json({
      message: "Budget summary fetched successfully",
      data: {
        plannedExpenseTotal,
        plannedIncomeTotal,
        actualExpenseTotal,
        varianceExpense: plannedExpenseTotal - actualExpenseTotal
      }
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Budget summary could not be fetched" });
  }
};
