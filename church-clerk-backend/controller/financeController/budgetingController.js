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
import ProgramOffering from "../../models/programModel/programOfferingModel.js";
import CellOffering from "../../models/organisationModel/cellOfferingModel.js";
import GroupOffering from "../../models/organisationModel/groupOfferingModel.js";
import DepartmentOffering from "../../models/organisationModel/departmentOfferingModel.js";
import MinistryOffering from "../../models/organisationModel/ministryOfferingModel.js";
import SpecialFund from "../../models/financeModel/specialFundModel.js";
import PledgePayment from "../../models/financeModel/pledgeModel/pledgePaymentModel.js";
import WelfareContribution from "../../models/financeModel/welfareModel/welfareContributionModel.js";
import ProjectContribution from "../../models/financeModel/projectModel/projectContributionModel.js";
import OutreachSupport from "../../models/outreachModel/outreachSupportModel.js";
import OrganisationContribution from "../../models/organisationModel/organisationContributionModel.js";
import { generateReferenceId } from "../../utils/generateReferenceId.js";
import LookupValue from "../../models/lookupValueModel.js";
import { defaultValuesByKind, collectExpenseCategoriesFromRecords } from "../lookupController.js";

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const VALID_STATUSES = ["upcoming", "current", "ended"];

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

/**
 * Normalize and validate raw budget items from a request body.
 * Every item needs both dates — item date ranges drive actual tracking.
 * Rows without a category/valid amount are skipped silently; a categorized
 * row missing dates fails loudly so the user knows which row to fix.
 * Throws an Error with a user-facing message on the first bad row.
 */
const buildItems = async (rawItems, period = {}) => {
  const pFrom = period.periodFrom ? new Date(period.periodFrom) : null;
  const pTo = period.periodTo ? new Date(period.periodTo) : null;
  const items = [];
  for (const i of Array.isArray(rawItems) ? rawItems : []) {
    const type = String(i?.type || "expense").trim().toLowerCase();
    const category = String(i?.category || "").trim();
    const amount = toNumber(i?.amount);
    const notes = String(i?.notes || "").trim();
    // Free-text intent — record-keeping; only Welfare uses it to narrow
    // actuals (matches the disbursement beneficiary name).
    const purpose = type === "expense" ? String(i?.purpose || "").trim() : "";

    if (!category) continue;
    if (!Number.isFinite(amount) || amount < 0) continue;
    if (type !== "expense" && type !== "income") continue;

    // Expense items carry the module money goes out through. Missing source
    // means a legacy item saved before sources existed — keep it null so it
    // still counts across every source, exactly as when it was created.
    // A non-empty value that isn't a known source is rejected (bad input).
    // The frontend always sends a source for new items, so this only ever
    // tolerates old records resubmitted during edits.
    let source = type === "expense" ? String(i?.source || "").trim().toLowerCase() : null;
    if (type === "expense") {
      if (!source) {
        source = null;
      } else if (!EXPENSE_SOURCE_KEYS.includes(source)) {
        throw new Error(`"${category}" has an unknown expense source — pick one of: ${EXPENSE_SOURCE_KEYS.join(", ")}.`);
      }
    }

    // Income items have no allocation — the category IS the source module.
    const alloc = type === "income" ? {} : (i?.allocatedTo || {});
    // Members can be multi-selected — entityIds carries the list; single-entity
    // allocations keep using entityId.
    const entityIds = (Array.isArray(alloc.entityIds) ? alloc.entityIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    const allocatedTo = {
      entityType: alloc.entityType || null,
      entityId: alloc.entityId || (entityIds.length === 1 ? entityIds[0] : null),
      entityIds,
      entityName: String(alloc.entityName || "").trim()
    };

    const dateFrom = parseDate(i?.dateFrom) || null;
    const dateTo = parseDate(i?.dateTo) || null;
    if (!dateFrom || !dateTo) {
      throw new Error(`"${category}" needs both a start date and an end date so actuals can be tracked.`);
    }
    if (dateTo < dateFrom) {
      throw new Error(`"${category}" has an end date before its start date.`);
    }
    if ((pFrom && dateFrom < pFrom) || (pTo && dateTo > pTo)) {
      throw new Error(`"${category}" dates must stay inside the budget period.`);
    }

    items.push({
      type,
      source,
      category,
      amount,
      notes,
      dateFrom,
      dateTo,
      allocatedTo,
      purpose,
      _id: i?._id || undefined,
      referenceId: i?.referenceId || await generateReferenceId("BIT")
    });
  }
  return items;
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
 * Budget status is purely time-derived — a fact, not a decision:
 *   upcoming — period hasn't started yet
 *   current  — today is inside the period
 *   ended    — period is over
 * There is no manual/workflow status.
 */
function statusFromPeriod(periodFrom, periodTo) {
  const from = periodFrom ? new Date(periodFrom) : null;
  const to = periodTo ? new Date(periodTo) : null;
  const now = new Date();
  if (from && now < from) return "upcoming";
  if (to && now > to) return "ended";
  return "current";
}

/**
 * Recompute the budget's status from its period and persist if stale,
 * so stored values self-heal on every read.
 */
async function applyAutoStatus(budget) {
  const status = statusFromPeriod(budget?.periodFrom, budget?.periodTo);
  if (status !== budget.status) {
    const updated = await Budget.findByIdAndUpdate(
      budget._id,
      { status },
      { new: true }
    ).lean();
    return updated || budget;
  }
  return budget;
}

// GeneralExpenses rows scoped to an organisation entity.
const ORG_SCOPE_OR = [
  { cell: { $ne: null } },
  { group: { $ne: null } },
  { department: { $ne: null } },
  { ministry: { $ne: null } }
];

/**
 * Expense sources for per-item actuals — one entry per module money leaves
 * through. `extraMatch` narrows the source's slice of a shared collection
 * (e.g. program expenses are GeneralExpenses rows with an event ref).
 * `entityFields` maps an allocation entity type to the model field that
 * resolves it — `member` works only on sources that carry a member ref
 * (welfare disbursements today).
 */
const ITEM_EXPENSE_SOURCES = [
  { key: "general",      Model: GeneralExpenses,      dateField: "date",      categoryField: "category",
    extraMatch: { cell: null, department: null, group: null, ministry: null, event: null, outreach: null },
    sharedCategories: true },
  { key: "program",      Model: GeneralExpenses,      dateField: "date",      categoryField: "category",
    extraMatch: { event: { $ne: null } },
    entityFields: { program: "event", event: "event" },
    sharedCategories: true },
  // Organisation expenses are offered per entity — a "Cell Expenses" item
  // counts only records scoped to a cell, etc.
  { key: "cell",         Model: GeneralExpenses,      dateField: "date",      categoryField: "category",
    extraMatch: { cell: { $ne: null } },
    entityFields: { cell: "cell" },
    sharedCategories: true },
  { key: "group",        Model: GeneralExpenses,      dateField: "date",      categoryField: "category",
    extraMatch: { group: { $ne: null } },
    entityFields: { group: "group" },
    sharedCategories: true },
  { key: "department",   Model: GeneralExpenses,      dateField: "date",      categoryField: "category",
    extraMatch: { department: { $ne: null } },
    entityFields: { department: "department" },
    sharedCategories: true },
  { key: "ministry",     Model: GeneralExpenses,      dateField: "date",      categoryField: "category",
    extraMatch: { ministry: { $ne: null } },
    entityFields: { ministry: "ministry" },
    sharedCategories: true },
  // Legacy key kept so items saved before the split still resolve — it
  // matches expenses scoped to any organisation entity. Not offered for new
  // items (the four entity sources above replace it), and `rollupOnly`
  // excludes it from the all-sources fan-out so legacy unscoped items don't
  // count org expenses twice (each entity source already covers them).
  { key: "organisation", Model: GeneralExpenses,      dateField: "date",      categoryField: "category",
    extraMatch: { $or: ORG_SCOPE_OR },
    entityFields: { cell: "cell", group: "group", department: "department", ministry: "ministry" },
    sharedCategories: true, rollupOnly: true },
  { key: "outreach",     Model: GeneralExpenses,      dateField: "date",      categoryField: "category",
    extraMatch: { outreach: { $ne: null } },
    entityFields: { outreach: "outreach" },
    sharedCategories: true },
  { key: "welfare",      Model: WelfareDisbursements, dateField: "date",      categoryField: "category",
    entityFields: { member: "member" },
    // A typed purpose filters this source by beneficiary name — the only
    // source where free-text intent can genuinely narrow actuals.
    purposeField: "beneficiaryName" },
  { key: "project",      Model: ProjectExpense,       dateField: "date",      categoryField: "spentOn"  },
  { key: "business",     Model: BusinessExpenses,     dateField: "date",      categoryField: "category" },
  { key: "other",        Model: Expense,              dateField: "dateSpent", categoryField: "category" },
];

const EXPENSE_SOURCE_KEYS = ITEM_EXPENSE_SOURCES.map((s) => s.key);

// Lookup kinds that feed each expense source's category list, so the picker
// shows categories already used on real records plus church-added values.
const EXPENSE_SOURCE_LOOKUP_KIND = {
  general: "expenseCategory",
  program: "expenseCategory",
  cell: "expenseCategory",
  group: "expenseCategory",
  department: "expenseCategory",
  ministry: "expenseCategory",
  organisation: "expenseCategory",
  outreach: "expenseCategory",
  welfare: "welfareDisbursementCategory",
  business: "businessExpenseCategory"
};

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
    { Model: ProgramOffering,      dateField: "offeringDate", entityType: "program",  entityField: "event"     },
    { Model: CellOffering,       dateField: "date",         entityType: "cell",     entityField: "cell"      },
    { Model: GroupOffering,      dateField: "date",         entityType: "group",     entityField: "group"     },
    { Model: DepartmentOffering, dateField: "date",         entityType: "department", entityField: "department" },
    { Model: MinistryOffering,  dateField: "date",         entityType: "ministry",  entityField: "ministry"  },
  ],
  // Organisation contributions fold into their entity's module line — cell
  // contributions under Cell Offering, etc. — there is no standalone line.
  "Cell Offering": [
    { Model: CellOffering,       dateField: "date",         entityType: "cell",     entityField: "cell"      },
    { Model: OrganisationContribution, dateField: "date",   baseMatch: { entityType: "cell" },
      entityTypes: ["cell"], entityTypeField: "entityType", entityField: "entity" },
  ],
  "Group Offering": [
    { Model: GroupOffering,      dateField: "date",         entityType: "group",     entityField: "group"     },
    { Model: OrganisationContribution, dateField: "date",   baseMatch: { entityType: "group" },
      entityTypes: ["group"], entityTypeField: "entityType", entityField: "entity" },
  ],
  "Department Offering": [
    { Model: DepartmentOffering, dateField: "date",         entityType: "department", entityField: "department" },
    { Model: OrganisationContribution, dateField: "date",   baseMatch: { entityType: "department" },
      entityTypes: ["department"], entityTypeField: "entityType", entityField: "entity" },
  ],
  "Ministry Offering": [
    { Model: MinistryOffering,  dateField: "date",         entityType: "ministry",  entityField: "ministry"  },
    { Model: OrganisationContribution, dateField: "date",   baseMatch: { entityType: "ministry" },
      entityTypes: ["ministry"], entityTypeField: "entityType", entityField: "entity" },
  ],
  "Event Offering": [
    { Model: ProgramOffering,      dateField: "offeringDate", entityType: "program",  entityField: "event"     },
    { Model: PledgePayment,        dateField: "paymentDate",  entityType: "program",  pledgeScopeField: "event" },
  ],
  "Program Offering": [
    { Model: ProgramOffering,      dateField: "offeringDate", entityType: "program",  entityField: "event"     },
    { Model: PledgePayment,        dateField: "paymentDate",  entityType: "program",  pledgeScopeField: "event" },
  ],
  "Special Fund": [
    { Model: SpecialFund,        dateField: "givingDate",   amountField: "totalAmount", entityType: null },
  ],
  // Pledge is not a standalone income line — every pledge payment counts
  // under the module it was pledged toward (program pledges under Program
  // Offering, project pledges under Fundraising Contribution). Unscoped
  // pledges aren't allowed by the pledge module and count nowhere.
  "Welfare Contribution": [
    { Model: WelfareContribution, dateField: "date",         entityType: null },
  ],
  "Fundraising Contribution": [
    { Model: ProjectContribution, dateField: "date",         entityType: null },
    { Model: PledgePayment,       dateField: "paymentDate",  entityType: "project", pledgeScopeField: "churchProject" },
  ],
  "Church Project Contribution": [
    { Model: ProjectContribution, dateField: "date",         entityType: null },
    { Model: PledgePayment,       dateField: "paymentDate",  entityType: "project", pledgeScopeField: "churchProject" },
  ],
  "Outreach Support": [
    { Model: OutreachSupport,     dateField: "date",         entityType: "outreach", entityField: "event" },
  ],
  "Business Ventures Income": [
    { Model: BusinessIncome,      dateField: "date",         entityType: null },
  ],
};

// Budget categories come from church-managed lookup lists, so resolve keys
// tolerantly: case-insensitive and singular/plural-flexible ("Tithes" ->
// "Tithe", "Special Funds" -> "Special Fund").
const INCOME_CATEGORY_LOOKUP = (() => {
  const map = new Map();
  for (const key of Object.keys(INCOME_CATEGORY_SOURCES)) {
    const k = key.toLowerCase();
    map.set(k, key);
    map.set(k.endsWith("s") ? k.slice(0, -1) : `${k}s`, key);
  }
  return map;
})();

/**
 * Determine whether a source should be queried for a given allocation, and
 * what extra match filter to apply.
 *   - If the item has no allocation (or allocation to church/administration/
 *     other), all sources are queried with no entity filter.
 *   - If the item is allocated to a specific entity, only sources that can
 *     resolve that entity are queried:
 *       `entityField` sources match `entityField = entityId` on the doc;
 *       `entityTypes` sources (organisation contributions) match both the
 *       stored `entityType` and `entity`;
 *       `pledgeScopeField` sources (pledge payments) match the entity on the
 *       joined pledge doc instead — `pledgeEntityId` is returned for the
 *       caller to apply after the $lookup.
 *   - Sources that can't resolve the allocated entity are skipped.
 */
const ALLOC_TO_PLEDGE_SCOPE = { program: "event", event: "event", project: "churchProject" };

const buildEntityFilter = (allocatedTo, src = {}) => {
  // "event" is the legacy persisted value for "program" allocations.
  const rawType = String(allocatedTo?.entityType || "").trim();
  const allocType = rawType === "event" ? "program" : rawType;
  const allocId = allocatedTo?.entityId || null;

  // No specific entity allocation → no filter
  if (!allocType || ["church", "administration", "other"].includes(allocType) || !allocId) {
    return { include: true, match: {} };
  }

  // Multi-entity sources (organisation contributions store entityType + entity)
  if (Array.isArray(src.entityTypes)) {
    if (src.entityTypes.includes(allocType)) {
      return { include: true, match: { [src.entityTypeField]: allocType, [src.entityField]: allocId } };
    }
    return { include: false, match: {} };
  }

  // Pledge-join sources — entity is resolved on the pledge after $lookup
  if (src.pledgeScopeField) {
    if (ALLOC_TO_PLEDGE_SCOPE[allocType] === src.pledgeScopeField) {
      return { include: true, match: {}, pledgeEntityId: allocId };
    }
    return { include: false, match: {} };
  }

  // Standard entity-scoped source
  if (src.entityType === allocType && src.entityField) {
    return { include: true, match: { [src.entityField]: allocId } };
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
      const rawType = String(allocatedTo?.entityType || "").trim();
      const allocType = rawType === "event" ? "program" : rawType;
      // Members can be allocated as a multi-select — entityIds carries the list.
      const allocIds = Array.isArray(allocatedTo?.entityIds) && allocatedTo.entityIds.length
        ? allocatedTo.entityIds
        : allocatedTo?.entityId ? [allocatedTo.entityId] : [];
      const allocated = Boolean(
        allocType && !["church", "administration", "other"].includes(allocType) && allocIds.length
      );

      // Items pick a single expense source — only that collection is summed.
      // Legacy items without a source still count every source — minus
      // rollup-only keys, whose slice the split sources already cover.
      const itemSource = String(item.source || "").trim().toLowerCase();
      const sources = itemSource
        ? ITEM_EXPENSE_SOURCES.filter((s) => s.key === itemSource)
        : ITEM_EXPENSE_SOURCES.filter((s) => !s.rollupOnly);

      const sums = await Promise.all(
        sources.map(async ({ Model, dateField, categoryField, entityFields, extraMatch, purposeField }) => {
          const entityField = entityFields?.[allocType];
          // Entity-allocated item: skip sources that can't resolve the entity
          if (allocated && !entityField) return 0;
          const entityMatch = allocated
            ? { [entityField]: allocIds.length > 1 ? { $in: allocIds } : allocIds[0] }
            : {};
          // A typed purpose narrows only sources whose records carry a name
          // field (welfare beneficiaryName). Elsewhere it's record-keeping.
          const purposeMatch = item.purpose && purposeField
            ? { [purposeField]: new RegExp(
                String(item.purpose).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"
              ) }
            : {};
          const match = {
            church: churchId,
            [categoryField]: catRegex,
            ...(extraMatch || {}),
            ...entityMatch,
            ...purposeMatch,
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
      const resolvedKey = INCOME_CATEGORY_LOOKUP.get(categoryKey.toLowerCase());
      const specializedSources = resolvedKey ? INCOME_CATEGORY_SOURCES[resolvedKey] : [];

      const specializedSums = await Promise.all(
        specializedSources.map(async (src) => {
          const { Model, dateField, amountField = "amount", pledgeScopeField } = src;
          const { include, match: entityMatch, pledgeEntityId } = buildEntityFilter(allocatedTo, src);
          if (!include) return 0;
          const match = {
            church: churchId,
            ...(src.baseMatch || {}),
            ...entityMatch,
            ...buildPeriodMatch(from, to, dateField)
          };

          // Pledge payments scope through their pledge doc (event = program,
          // churchProject = fundraising). Unallocated items count payments
          // whose pledge has that scope; entity-allocated items match the
          // pledge's entity id directly.
          if (pledgeScopeField) {
            const pledgeMatch = pledgeEntityId
              ? { [`p.${pledgeScopeField}`]: pledgeEntityId }
              : pledgeScopeField === "unscoped"
                ? { "p.event": null, "p.churchProject": null }
                : { [`p.${pledgeScopeField}`]: { $ne: null } };
            const rows = await Model.aggregate([
              { $match: match },
              { $lookup: { from: "pledges", localField: "pledge", foreignField: "_id", as: "p" } },
              { $unwind: "$p" },
              { $match: pledgeMatch },
              { $group: { _id: null, total: { $sum: `$${amountField}` } } }
            ]);
            return Number(rows?.[0]?.total || 0);
          }

          const rows = await Model.aggregate([
            { $match: match },
            { $group: { _id: null, total: { $sum: `$${amountField}` } } }
          ]);
          return Number(rows?.[0]?.total || 0);
        })
      );

      // General Income docs always count by category for non-entity-allocated
      // items — Income records categorized "Tithe", "Offering", etc. are still
      // that kind of income. Skipped for entity-allocated items (Income has
      // no entity ref).
      let generalIncomeSum = 0;
      const { include: includeGeneral } = buildEntityFilter(allocatedTo, {});
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

      return [...specializedSums, generalIncomeSum].reduce((a, v) => a + v, 0);
    }

    return null;
  }));
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

/**
 * GET /budgets/expense-categories?source=<key>
 * Returns the category options for one expense source — distinct values
 * actually used on that source's records plus any church-managed lookup
 * values for the matching kind.
 */
export const getExpenseCategories = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const key = String(req.query?.source || "").trim().toLowerCase();
    const src = ITEM_EXPENSE_SOURCES.find((s) => s.key === key);
    if (!src) return res.status(400).json({ message: "Invalid expense source" });

    // Expense categories mirror what the expense modules offer: lookup
    // defaults + church-added lookup values + every category recorded in ANY
    // expense source. Same list under every source — the source decides
    // where actuals are counted, not what's pickable.
    let recorded = [];
    try {
      recorded = await collectExpenseCategoriesFromRecords(churchId);
    } catch {
      recorded = [];
    }

    let lookups = [];
    try {
      const kinds = [...new Set(Object.values(EXPENSE_SOURCE_LOOKUP_KIND))];
      const rows = await LookupValue.find({ churchId, kind: { $in: kinds } }).select("value").lean();
      lookups = rows.map((r) => r?.value).filter(Boolean);
    } catch {
      lookups = [];
    }

    const defaults = [...new Set(
      Object.values(EXPENSE_SOURCE_LOOKUP_KIND)
        .flatMap((k) => defaultValuesByKind[k] || [])
    )];

    const seen = new Set();
    const values = [...defaults, ...recorded, ...lookups]
      .map((v) => String(v || "").trim())
      .filter((v) => {
        if (!v) return false;
        const k = v.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));

    return res.status(200).json({ source: key, values });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Categories could not be fetched" });
  }
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
    if (!periodFrom || !periodTo) {
      return res.status(400).json({ message: "Budget period start and end dates are required" });
    }
    if (periodTo < periodFrom) {
      return res.status(400).json({ message: "periodTo must be after periodFrom" });
    }

    const description = String(req.body?.description || "").trim();

    let items;
    try {
      items = await buildItems(req.body?.items, { periodFrom, periodTo });
    } catch (e2) {
      return res.status(400).json({ message: e2.message });
    }

    const budget = await Budget.create({
      church: churchId,
      name,
      description,
      fiscalYear: Number(fiscalYear),
      periodFrom,
      periodTo,
      status: statusFromPeriod(periodFrom, periodTo),
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
    if (q) {
      const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      query.$or = [{ name: rx }, { description: rx }];
    }

    if (fiscalYear !== undefined && fiscalYear !== null && String(fiscalYear).trim() !== "") {
      const fy = toNumber(fiscalYear);
      if (!Number.isFinite(fy)) return res.status(400).json({ message: "Invalid fiscalYear" });
      query.fiscalYear = Number(fy);
    }

    // Status is computed from dates — filter on the period fields directly so
    // results don't depend on the stored value being up to date.
    const normalizedStatus = String(status || "").trim().toLowerCase();
    if (normalizedStatus) {
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const now = new Date();
      if (normalizedStatus === "upcoming") {
        query.periodFrom = { $gt: now };
      } else if (normalizedStatus === "ended") {
        query.periodTo = { $lt: now };
      } else {
        query.periodFrom = { $lte: now };
        query.periodTo = { $gte: now };
      }
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

    if (req.body?.description !== undefined) {
      patch.description = String(req.body?.description || "").trim();
    }

    if (req.body?.periodFrom !== undefined) patch.periodFrom = parseDate(req.body?.periodFrom);
    if (req.body?.periodTo !== undefined) patch.periodTo = parseDate(req.body?.periodTo);

    if (patch.periodFrom && patch.periodTo && patch.periodTo < patch.periodFrom) {
      return res.status(400).json({ message: "periodTo must be after periodFrom" });
    }

    // Fetch the existing doc once if either the period or the items are being
    // patched — item dates are validated against the merged period, and the
    // status is recomputed from it.
    const needsExisting =
      patch.periodFrom !== undefined || patch.periodTo !== undefined || req.body?.items !== undefined;
    const existing = needsExisting
      ? await Budget.findOne({ _id: id, church: churchId }).lean()
      : null;
    const mergedPeriod = {
      periodFrom: patch.periodFrom ?? existing?.periodFrom,
      periodTo: patch.periodTo ?? existing?.periodTo
    };

    if (patch.periodFrom !== undefined || patch.periodTo !== undefined) {
      // Status is derived from the period — recompute when dates change.
      // A client-supplied status is ignored; there is no manual status.
      patch.status = statusFromPeriod(mergedPeriod.periodFrom, mergedPeriod.periodTo);
    }

    if (req.body?.items !== undefined) {
      try {
        patch.items = await buildItems(req.body.items, mergedPeriod);
      } catch (e2) {
        return res.status(400).json({ message: e2.message });
      }
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
