import LookupValue from "../models/lookupValueModel.js";
import GeneralExpenses from "../models/generalExpenseModel.js";
import WelfareDisbursements from "../models/financeModel/welfareModel/welfareDisbursementModel.js";
import ProjectExpense from "../models/financeModel/projectModel/projectExpenseModel.js";
import BusinessExpenses from "../models/financeModel/businessModel/businessExpensesModel.js";
import Expense from "../models/financeModel/incomeExpenseModel/expenseModel.js";

// Income sources
import Income from "../models/financeModel/incomeExpenseModel/incomeModel.js";
import Offering from "../models/financeModel/offeringModel.js";
import SpecialFund from "../models/financeModel/specialFundModel.js";
import EventOffering from "../models/eventModel/eventOfferingModel.js";
import CellOffering from "../models/ministryModel/cellOfferingModel.js";
import GroupOffering from "../models/ministryModel/groupOfferingModel.js";
import DepartmentOffering from "../models/ministryModel/departmentOfferingModel.js";
import BusinessIncome from "../models/financeModel/businessModel/businessIncomeModel.js";

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const defaultValuesByKind = {
  serviceType: [
    "Sunday Service",
    "Sunday First Service",
    "Sunday Second Service",
    "Sunday Third Service",
    "Sunday Fourth Service",
    "Sunday Fifth Service",
    "Worship Service",
    "Bible Study",
    "Children Service",
    "Midweek Service",
    "Prayer Meeting",
    "Special Program",
    "cells Meeting",
    "groups Meeting",
    "department Meeting"
  ],
  offeringType: ["first offering", "second offering", "third offering", "fourth offering", "fifth offering"],
  eventCategory: [
    "Conference",
    "Service",
    "Worship",
    "Prayers",
    "Outreach",
    "Bible Study",
    "Serminary",
    "Retreat",
    "Workshop",
    "Camp Meeting"
  ],
  specialFundCategory: [
    "Prophetic Seed",
    "Pastor Appreciation",
    "Thanksgiving Offering",
    "Missionary Support",
    "Donation",
    "Retreat",
    "Scholarship Fund"
  ],
  welfareDisbursementCategory: ["Birthday", "Wedding", "Funeral", "Hospital", "Emergency", "School", "Other"],
  expenseCategory: [
    "Maintenance",
    "Equipment",
    "Utilities",
    "Transportation",
    "Pastor Support",
    "Charity",
    "Church Project",
    "Program",
    "Building materials",
    "Salary"
  ],
  businessExpenseCategory: [],
  incomeCategory: [
    "Tithe",
    "Offering",
    "Special Fund",
    "Cell Offering",
    "Group Offering",
    "Department Offering",
    "Event Offering",
    "Pledge",
    "Welfare Contribution",
    "Church Project Contribution",
    "Business Ventures Income",
    "Other"
  ]
};

const uniq = (arr) => {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const s = String(v || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
};

/**
 * Pull distinct category strings from every expense collection in the system
 * so the budget expense-category list stays in sync with categories actually
 * used in welfare, general expenses, business expenses, project expenses, etc.
 */
const EXPENSE_CATEGORY_SOURCES = [
  { Model: GeneralExpenses,      field: "category" },
  { Model: WelfareDisbursements, field: "category" },
  { Model: ProjectExpense,       field: "spentOn"  },
  { Model: BusinessExpenses,     field: "category" },
  { Model: Expense,              field: "category" },
];

const collectExpenseCategoriesFromRecords = async (churchId) => {
  const results = await Promise.all(
    EXPENSE_CATEGORY_SOURCES.map(async ({ Model, field }) => {
      try {
        const vals = await Model.distinct(field, { church: churchId });
        return Array.isArray(vals) ? vals : [];
      } catch {
        return [];
      }
    })
  );
  return results.flat();
};

/**
 * Pull distinct income category strings from every income collection in the
 * system so the budget income-category list stays in sync with categories
 * actually used in tithes, offerings, special funds, pledges, welfare
 * contributions, project contributions, business income, etc.
 *
 * Some income sources have no category field (the model itself represents the
 * category), so we add static labels for those. Sources with a category-like
 * field are queried with `distinct()` to pull every value actually used.
 */
const INCOME_CATEGORY_SOURCES = [
  // Sources with a category-like field → pull distinct values
  { Model: Offering,         field: "offeringType",  prefix: null },
  { Model: EventOffering,    field: "offeringType",  prefix: null },
  { Model: SpecialFund,      field: "category",      prefix: null },
  { Model: BusinessIncome,   field: "recievedFrom",  prefix: null },
  { Model: Income,           field: "category",       prefix: null },
];

// Static labels for income sources that have no category field — the model
// itself IS the category, so we always include these labels.
const INCOME_CATEGORY_STATIC = [
  "Tithe",
  "Cell Offering",
  "Group Offering",
  "Department Offering",
  "Pledge",
  "Welfare Contribution",
  "Church Project Contribution",
];

const collectIncomeCategoriesFromRecords = async (churchId) => {
  const results = await Promise.all(
    INCOME_CATEGORY_SOURCES.map(async ({ Model, field }) => {
      try {
        const vals = await Model.distinct(field, { church: churchId });
        return Array.isArray(vals) ? vals : [];
      } catch {
        return [];
      }
    })
  );
  return [...INCOME_CATEGORY_STATIC, ...results.flat()];
};

export const listLookupValues = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const kind = String(req.query?.kind || "").trim();
    if (!kind) return res.status(400).json({ message: "kind is required" });

    const defaults = Array.isArray(defaultValuesByKind[kind]) ? defaultValuesByKind[kind] : [];

    const rows = await LookupValue.find({ churchId, kind }).select("value").sort({ value: 1 }).lean();
    const dbValues = rows.map((r) => r?.value).filter(Boolean);

    // For expenseCategory, also pull distinct categories that have actually been
    // used across every expense source (welfare, general, business, project, etc.)
    // so the budget stays in sync with categories added elsewhere in the system.
    // For incomeCategory, pull distinct categories from every income source
    // (offerings, special funds, business income, etc.) plus static labels for
    // sources that have no category field (tithes, pledges, welfare contributions).
    let recordedValues = [];
    if (kind === "expenseCategory") {
      recordedValues = await collectExpenseCategoriesFromRecords(churchId);
    } else if (kind === "incomeCategory") {
      recordedValues = await collectIncomeCategoriesFromRecords(churchId);
    }

    let values = uniq([...defaults, ...dbValues, ...recordedValues]).sort((a, b) => a.localeCompare(b));

    if (kind === "serviceType") {
      const deprecated = new Set(
        [
          "Sunday 1st Service",
          "Sunday 2nd Service",
          "Sunday 3rd Service",
          "Sunday 4th Service",
          "Sunday 5th Service",
          "First Sunday Service",
          "Second Sunday Service",
          "Third Sunday Service",
          "1st Service",
          "2nd Service",
          "3rd Service",
          "4th Service",
          "5th Service"
        ].map((v) => String(v).trim().toLowerCase())
      );
      values = values.filter((v) => !deprecated.has(String(v || "").trim().toLowerCase()));
    }

    return res.status(200).json({ kind, values });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createLookupValue = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const kind = String(req.body?.kind || "").trim();
    const value = String(req.body?.value || "").trim();

    if (!kind) return res.status(400).json({ message: "kind is required" });
    if (!value) return res.status(400).json({ message: "value is required" });

    const normalizedValue = normalizeValue(value);

    const createdBy = req.user?._id || null;

    const doc = await LookupValue.create({
      churchId,
      kind,
      value,
      normalizedValue,
      createdBy
    }).catch(async (e) => {
      if (e?.code === 11000) {
        return await LookupValue.findOne({ churchId, kind, normalizedValue }).lean();
      }
      throw e;
    });

    return res.status(201).json({ message: "Lookup value saved", lookup: doc });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
