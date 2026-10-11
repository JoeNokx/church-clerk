import GeneralExpenses from "../models/generalExpenseModel.js";
import Group from "../models/organisationModel/groupModel.js";
import Cell from "../models/organisationModel/cellModel.js";
import Department from "../models/organisationModel/departmentModel.js";
import Ministry from "../models/organisationModel/ministryModel.js";
import Program from "../models/programModel.js";
import { uploadReceiptImage, destroyReceiptImage, receiptImageDownloadUrl, validateReceiptImage } from "../services/receiptService.js";

// Scope config: scope key -> { scopeField on GeneralExpenses, parent model, route param, label }
const SCOPES = {
  group: { scopeField: "group", parentModel: Group, paramName: "groupId", label: "Group" },
  cell: { scopeField: "cell", parentModel: Cell, paramName: "cellId", label: "Cell" },
  department: { scopeField: "department", parentModel: Department, paramName: "departmentId", label: "Department" },
  ministry: { scopeField: "ministry", parentModel: Ministry, paramName: "ministryId", label: "Ministry" },
  program: { scopeField: "event", parentModel: Program, paramName: "programId", label: "Program" }
};

const SCOPE_FIELDS = ["group", "cell", "department", "ministry", "event"];

const isPrivileged = (req) => req.user.role === "superadmin" || req.user.role === "supportadmin";

const resolveParent = async (req, scopeKey) => {
  const scope = SCOPES[scopeKey];
  const parentId = req.params[scope.paramName];
  const query = { _id: parentId };
  if (!isPrivileged(req)) query.church = req.activeChurch._id;
  return scope.parentModel.findOne(query).lean();
};

const createScopedExpense = (scopeKey) => async (req, res) => {
  try {
    const scope = SCOPES[scopeKey];
    const { title, category, amount, description, date, paymentMethod } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Title is required." });
    }
    if (!amount || !date) {
      return res.status(400).json({ message: "Amount and date are required." });
    }

    const parent = await resolveParent(req, scopeKey);
    if (!parent) {
      return res.status(404).json({ message: `${scope.label} not found` });
    }

    let receipt;
    if (req.file) {
      const fileError = validateReceiptImage(req.file);
      if (fileError) {
        return res.status(400).json({ message: fileError });
      }
      receipt = await uploadReceiptImage(req.file, `church-clerk/${scopeKey}-expenses/${parent._id}`);
    }

    const expense = await GeneralExpenses.create({
      title: String(title).trim(),
      category,
      amount,
      description,
      date,
      paymentMethod,
      ...(receipt ? { receipt } : {}),
      [scope.scopeField]: parent._id,
      church: parent.church,
      createdBy: req.user._id
    });

    return res.status(201).json({ message: "Expense recorded successfully", expense });
  } catch (error) {
    return res.status(400).json({ message: "Expense could not be created", error: error.message });
  }
};

const getScopedExpenses = (scopeKey) => async (req, res) => {
  try {
    const scope = SCOPES[scopeKey];
    const { page = 1, limit = 10, category, dateFrom, dateTo, recordedBy, search } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const parent = await resolveParent(req, scopeKey);
    if (!parent) {
      return res.status(404).json({ message: `${scope.label} not found` });
    }

    const query = { church: parent.church, [scope.scopeField]: parent._id };

    if (category) query.category = category;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (recordedBy) {
      const User = (await import("../models/userModel.js")).default;
      const matchingUsers = await User.find({
        fullName: { $regex: recordedBy, $options: "i" }
      }).select("_id");
      const recordedByUserIds = matchingUsers.map((u) => u._id);
      query.createdBy = { $in: recordedByUserIds.length ? recordedByUserIds : [null] };
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        query.date.$gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
    }

    const expenses = await GeneralExpenses.find(query)
      .select("title category amount description date paymentMethod receipt createdBy referenceId createdAt")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await GeneralExpenses.countDocuments(query);
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
      message: "Expenses fetched successfully",
      pagination,
      count: expenses.length,
      expenses
    });
  } catch (error) {
    return res.status(400).json({ message: "Expenses could not be fetched", error: error.message });
  }
};

const updateScopedExpense = (scopeKey) => async (req, res) => {
  try {
    const scope = SCOPES[scopeKey];
    const { expenseId } = req.params;

    const parent = await resolveParent(req, scopeKey);
    if (!parent) {
      return res.status(404).json({ message: `${scope.label} not found` });
    }

    const body = { ...req.body };
    SCOPE_FIELDS.forEach((f) => { delete body[f]; });
    delete body.church;
    delete body.createdBy;
    delete body.receipt;
    const { removeReceipt } = req.body || {};
    delete body.removeReceipt;

    let newReceipt;
    if (req.file) {
      const fileError = validateReceiptImage(req.file);
      if (fileError) {
        return res.status(400).json({ message: fileError });
      }
      newReceipt = await uploadReceiptImage(req.file, `church-clerk/${scopeKey}-expenses/${parent._id}`);
      body.receipt = newReceipt;
    } else if (String(removeReceipt || "") === "true") {
      body.receipt = null;
    }

    const previous = await GeneralExpenses.findOne({ _id: expenseId, church: parent.church, [scope.scopeField]: parent._id }).select("receipt");

    const expense = await GeneralExpenses.findOneAndUpdate(
      { _id: expenseId, church: parent.church, [scope.scopeField]: parent._id },
      body,
      { new: true, runValidators: true }
    );

    if (!expense) {
      if (newReceipt) await destroyReceiptImage(newReceipt);
      return res.status(404).json({ message: "Expense not found" });
    }

    if ((newReceipt || String(removeReceipt || "") === "true") && previous?.receipt?.publicId) {
      await destroyReceiptImage(previous.receipt);
    }

    return res.status(200).json({ message: "Expense updated successfully", expense });
  } catch (error) {
    return res.status(400).json({ message: "Expense could not be updated", error: error.message });
  }
};

const deleteScopedExpense = (scopeKey) => async (req, res) => {
  try {
    const scope = SCOPES[scopeKey];
    const { expenseId } = req.params;

    const parent = await resolveParent(req, scopeKey);
    if (!parent) {
      return res.status(404).json({ message: `${scope.label} not found` });
    }

    const expense = await GeneralExpenses.findOneAndDelete({
      _id: expenseId,
      church: parent.church,
      [scope.scopeField]: parent._id
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (expense?.receipt?.publicId) {
      await destroyReceiptImage(expense.receipt);
    }

    return res.status(200).json({ message: "Expense deleted successfully", expense });
  } catch (error) {
    return res.status(400).json({ message: "Expense could not be deleted", error: error.message });
  }
};

const downloadScopedExpenseReceipt = (scopeKey) => async (req, res) => {
  try {
    const scope = SCOPES[scopeKey];
    const { expenseId } = req.params;

    const parent = await resolveParent(req, scopeKey);
    if (!parent) {
      return res.status(404).json({ message: `${scope.label} not found` });
    }

    const expense = await GeneralExpenses.findOne({
      _id: expenseId,
      church: parent.church,
      [scope.scopeField]: parent._id
    }).select("receipt").lean();

    if (!expense?.receipt?.publicId) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    return res.redirect(receiptImageDownloadUrl(expense.receipt));
  } catch (error) {
    return res.status(400).json({ message: "Receipt could not be downloaded", error: error.message });
  }
};

export { createScopedExpense, getScopedExpenses, updateScopedExpense, deleteScopedExpense, downloadScopedExpenseReceipt };
