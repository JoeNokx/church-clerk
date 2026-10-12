import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import BudgetingContext, { BudgetingProvider } from "../budgeting.store.js";
import BackButton from "../../../shared/components/BackButton/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import EntityPicker, { ENTITY_TYPES, MemberMultiPicker } from "../components/EntityPicker.jsx";
import { getExpenseCategories } from "../services/budgeting.api.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

// Expense items pick the module the money goes out through, then a category
// that belongs to that source. Income items don't need this — the income
// "category" IS the source module.
const EXPENSE_SOURCES = [
  { value: "general",    label: "General Expenses" },
  { value: "program",    label: "Program Expenses" },
  { value: "cell",       label: "Cell Expenses" },
  { value: "group",      label: "Group Expenses" },
  { value: "department", label: "Department Expenses" },
  { value: "ministry",   label: "Ministry Expenses" },
  { value: "outreach",   label: "Outreach Expenses" },
  { value: "welfare",    label: "Welfare Disbursements" },
  { value: "project",    label: "Fundraising / Projects" },
  { value: "business",   label: "Business Ventures" },
  { value: "other",      label: "Other Expenses" },
];

// Sources that existed before the entity split — still shown correctly on
// items saved back then, but not offered for new ones.
const LEGACY_SOURCE_LABELS = {
  organisation: "Organisation Expenses"
};

function expenseSourceLabel(key) {
  // Items saved before sources existed have no source — they count all.
  if (!key) return "All expense sources";
  return EXPENSE_SOURCES.find((s) => s.value === key)?.label || LEGACY_SOURCE_LABELS[key] || "—";
}

// Each option is a real income module — the value is the key the backend
// resolves, the label is what the user sees. Organisation contributions fold
// into their entity's line (cell/group/department/ministry), and pledge
// payments fold into the program or fundraising line — there is no separate
// pledge or organisation-contribution source.
const INCOME_CATEGORY_OPTIONS = [
  { value: "Tithe",                    label: "Tithes" },
  { value: "Offering",                 label: "Offerings" },
  { value: "Program Offering",         label: "Program Offerings, Seed & Pledges" },
  { value: "Cell Offering",            label: "Cell Offerings & Contributions" },
  { value: "Group Offering",           label: "Group Offerings & Contributions" },
  { value: "Department Offering",      label: "Department Offerings & Contributions" },
  { value: "Ministry Offering",        label: "Ministry Offerings & Contributions" },
  { value: "Fundraising Contribution", label: "Fundraising Contributions & Pledges" },
  { value: "Welfare Contribution",     label: "Welfare Contributions" },
  { value: "Outreach Support",         label: "Outreach Support" },
  { value: "Special Fund",             label: "Special Funds" },
  { value: "Business Ventures Income", label: "Business Ventures Income" },
  { value: "Other",                    label: "Other Income" },
];

function formatYmd(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatPeriod(from, to) {
  const f = from ? formatDate(from) : "—";
  const t = to ? formatDate(to) : "—";
  if (f === "—" && t === "—") return null;
  if (f === t) return f;
  return `${f} – ${t}`;
}

function statusBadgeClass(status) {
  const s = String(status || "current").toLowerCase();
  const map = {
    upcoming: "bg-blue-100 text-blue-700",
    current:  "bg-green-100 text-green-700",
    ended:    "bg-slate-100 text-slate-700"
  };
  return map[s] || map.current;
}

function statusLabel(status) {
  const map = {
    upcoming: "Upcoming",
    current:  "Current",
    ended:    "Ended"
  };
  const raw = String(status || "").trim().toLowerCase();
  return map[raw] || "Current";
}

// ─── Item View Modal ─────────────────────────────────────────────────────────

function ItemViewModal({ item, currency, onClose }) {
  if (!item) return null;
  const isExpense = item?.type === "expense";
  const hasActuals = item?.actual !== null && item?.actual !== undefined;
  const actual = hasActuals ? Number(item.actual) : null;
  const variance = hasActuals ? Number(item?.variance ?? (Number(item?.amount || 0) - actual)) : null;
  const isGood = variance !== null && (isExpense ? variance >= 0 : actual >= Number(item?.amount || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 rounded-t-xl">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{item?.category || "Budget Item"}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-gray-500 text-xs capitalize">{item?.type || "—"}</span>
              {item?.referenceId ? (
                <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[11px] font-mono text-gray-600">
                  {item.referenceId}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Planned</div>
              <div className="mt-1 font-semibold text-gray-900 text-base">{formatMoney(item?.amount || 0, currency)}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Actual</div>
              <div className="mt-1 font-semibold text-gray-900 text-base">
                {hasActuals ? formatMoney(actual, currency) : <span className="text-gray-400 text-sm">No dates — not tracked</span>}
              </div>
            </div>
          </div>

          {hasActuals && variance !== null ? (
            <div className={`rounded-lg border p-3 ${isGood ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Variance</div>
              <div className={`mt-1 font-semibold text-base ${isGood ? "text-green-700" : "text-red-600"}`}>
                {isGood ? "+" : "-"}{formatMoney(Math.abs(variance), currency)}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {isExpense ? (isGood ? "under budget" : "over budget") : (isGood ? "above plan" : "below plan")}
                </span>
              </div>
            </div>
          ) : null}

          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {isExpense ? "Category" : "Income Source"}
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
              {isExpense
                ? (item?.category || "—")
                : (INCOME_CATEGORY_OPTIONS.find((c) => c.value === item?.category)?.label || item?.category || "—")}
            </div>
          </div>

          {isExpense ? (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Source</div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                {expenseSourceLabel(item.source)}
              </div>
            </div>
          ) : null}

          {(item?.dateFrom || item?.dateTo) ? (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Item Period</div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                {[item.dateFrom && formatDate(item.dateFrom), item.dateTo && formatDate(item.dateTo)].filter(Boolean).join(" – ")}
              </div>
            </div>
          ) : null}

          {item?.allocatedTo?.entityType ? (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Allocated To</div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                <span className="font-semibold capitalize">{item.allocatedTo.entityType.replace("_", " ")}</span>
                {item.allocatedTo.entityName ? <span className="text-gray-500"> — {item.allocatedTo.entityName}</span> : null}
              </div>
            </div>
          ) : null}

          {isExpense && item?.purpose ? (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Purpose</div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                {item.purpose}
                {item.source === "welfare" ? (
                  <span className="ml-1.5 text-xs text-gray-400">— counts disbursements with this beneficiary name</span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 min-h-[40px]">
              {item?.notes || <span className="text-gray-400 italic text-xs">No notes</span>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Item Modal ──────────────────────────────────────────────────────────

function AddItemModal({ onAdd, onClose, saving, initialData, defaultPeriod }) {
  const editing = Boolean(initialData);
  const [type, setType] = useState(editing ? String(initialData?.type || "expense") : "expense");
  const [source, setSource] = useState(editing ? String(initialData?.source || "") : "general");
  const [category, setCategory] = useState(editing ? String(initialData?.category || "") : "");
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [formError, setFormError] = useState(null);
  const [amount, setAmount] = useState(editing ? String(initialData?.amount ?? "") : "");
  const [notes, setNotes] = useState(editing ? String(initialData?.notes || "") : "");
  const [dateFrom, setDateFrom] = useState(
    editing && initialData?.dateFrom
      ? new Date(initialData.dateFrom).toISOString().slice(0, 10)
      : defaultPeriod?.from || ""
  );
  const [dateTo, setDateTo] = useState(
    editing && initialData?.dateTo
      ? new Date(initialData.dateTo).toISOString().slice(0, 10)
      : defaultPeriod?.to || ""
  );
  const [allocatedType, setAllocatedType] = useState(editing ? String(initialData?.allocatedTo?.entityType || "") : "");
  const [allocatedId, setAllocatedId] = useState(editing ? (initialData?.allocatedTo?.entityId || null) : null);
  const [allocatedName, setAllocatedName] = useState(editing ? String(initialData?.allocatedTo?.entityName || "") : "");
  // Member allocations are multi-select — rebuild chips from entityIds + the
  // joined name so an edit restores every member, not just the first.
  const [purpose, setPurpose] = useState(editing ? String(initialData?.purpose || "") : "");
  const [allocatedMembers, setAllocatedMembers] = useState(() => {
    if (!editing || initialData?.allocatedTo?.entityType !== "member") return [];
    const ids = Array.isArray(initialData.allocatedTo.entityIds) && initialData.allocatedTo.entityIds.length
      ? initialData.allocatedTo.entityIds
      : initialData.allocatedTo.entityId ? [initialData.allocatedTo.entityId] : [];
    const names = String(initialData.allocatedTo.entityName || "").split(",").map((n) => n.trim());
    return ids.map((id, i) => ({ _id: id, name: names[i] || "Member" }));
  });

  const allocMeta = ENTITY_TYPES.find((e) => e.value === allocatedType);

  // Categories for the chosen expense source — distinct values actually used
  // on that source's records plus its lookup-managed values.
  const loadCategories = useCallback(async (src) => {
    try {
      const res = await getExpenseCategories(src);
      const vals = res?.data?.values ?? res?.values ?? [];
      setCategoryOptions(Array.isArray(vals) ? vals : []);
    } catch {
      setCategoryOptions([]);
    }
  }, []);

  useEffect(() => {
    if (type !== "expense") return;
    void loadCategories(source);
  }, [type, source, loadCategories]);

  const submit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (!category.trim() || !amount || Number(amount) < 0) return;
    if (!dateFrom || !dateTo) {
      setFormError("Both start and end dates are required — actuals are tracked within them.");
      return;
    }
    if (dateTo < dateFrom) {
      setFormError("End date can't be before the start date.");
      return;
    }
    if (defaultPeriod?.from && dateFrom < defaultPeriod.from) {
      setFormError("Start date can't be before the budget period starts.");
      return;
    }
    if (defaultPeriod?.to && dateTo > defaultPeriod.to) {
      setFormError("End date can't be after the budget period ends.");
      return;
    }
    onAdd({
      type,
      category: category.trim(),
      amount: Number(amount),
      notes: notes.trim(),
      // Dates are required — they drive which finance records count as actuals.
      // They come prefilled with the budget period so an item is never untracked.
      dateFrom: dateFrom || defaultPeriod?.from || null,
      dateTo: dateTo || defaultPeriod?.to || null,
      // Expense items carry the module the money is spent through; income
      // items don't — the category itself is the income source.
      source: type === "expense" ? source : null,
      allocatedTo: type === "income"
        ? { entityType: null, entityId: null, entityIds: [], entityName: "" }
        : allocatedType === "member"
          ? {
              entityType: "member",
              entityIds: allocatedMembers.map((m) => m._id),
              entityId: allocatedMembers[0]?._id || null,
              entityName: allocatedMembers.map((m) => m.name).join(", ")
            }
          : { entityType: allocatedType || null, entityId: allocatedId || null, entityName: allocatedName },
      // Free-text intent ("Ama's school fees") — record only on most sources;
      // on Welfare it counts just that beneficiary's disbursements.
      purpose: type === "expense" ? purpose.trim() : "",
      // Preserve the existing identity on edits so it doesn't get
      // regenerated and legacy items keep their behavior.
      _id: initialData?._id || undefined,
      referenceId: initialData?.referenceId || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 rounded-t-xl">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{editing ? "Edit Budget Item" : "Add Budget Item"}</div>
            <div className="mt-0.5 text-gray-500 text-xs">{editing ? "Update this income or expense line." : "Add a new income or expense line to this budget."}</div>
          </div>
          <button type="button" onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-5 space-y-4">
          {formError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{formError}</div>
          ) : null}

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
            <select value={type} onChange={(e) => { setType(e.target.value); setCategory(""); setAllocatedType(""); setAllocatedId(null); setAllocatedName(""); setAllocatedMembers([]); }}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          {/* Expense: pick the module (source), then a category that belongs
              to it. Income: the category IS the source — a fixed list of real
              income modules so actuals always have somewhere to come from. */}
          {type === "expense" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Source <span className="text-red-500">*</span>
                </label>
                <select value={source} onChange={(e) => { setSource(e.target.value); setCategory(""); }}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
                  {editing && !initialData?.source ? (
                    <option value="">All expense sources (existing item — pick one to scope it)</option>
                  ) : null}
                  {EXPENSE_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Which module is this money spent through? Actuals are counted only from it.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                {categoryOptions.length ? (
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
                    <option value="">Select category</option>
                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Type a category — e.g. Transport, Materials"
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                    />
                    <p className="mt-1.5 text-[11px] text-amber-600">
                      No categories recorded in this source yet — use the exact label you'll record in the module, or actuals won't match.
                    </p>
                  </>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Income Source <span className="text-red-500">*</span>
              </label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
                <option value="">Select income source</option>
                {INCOME_CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Each option is a real income module — actuals are counted from it automatically.
              </p>
            </div>
          )}

          {/* Allocated To — expenses only. Income's source is the category itself. */}
          {type === "expense" ? (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Allocated To <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <p className="text-[11px] text-gray-400 mb-1.5">
                Limits actuals to records tied to a specific entity — leave as church-wide to count everything.
              </p>
              <div className="space-y-2">
                <select
                  value={allocatedType}
                  onChange={(e) => { setAllocatedType(e.target.value); setAllocatedId(null); setAllocatedName(""); setAllocatedMembers([]); }}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  {ENTITY_TYPES.map((et) => (
                    <option key={et.value} value={et.value}>{et.label}</option>
                  ))}
                </select>
                {allocMeta?.needsPicker && allocMeta?.multi ? (
                  <MemberMultiPicker
                    selected={allocatedMembers}
                    onChange={setAllocatedMembers}
                    className="w-full"
                  />
                ) : allocMeta?.needsPicker ? (
                  <EntityPicker
                    entityType={allocatedType}
                    value={{ entityId: allocatedId, entityName: allocatedName }}
                    onChange={(id, name) => { setAllocatedId(id); setAllocatedName(name); }}
                    className="w-full"
                  />
                ) : null}
                {allocatedType === "member" ? (
                  <p className="text-[11px] text-gray-400">
                    Member allocations resolve on records that name a member — e.g. welfare disbursements to specific members.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Purpose — record-only intent on most sources; on Welfare it
              filters actuals to the named beneficiary's disbursements. */}
          {type === "expense" ? (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Purpose / Beneficiary <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Ama's school fees, Pastor's retreat"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
              <p className="mt-1.5 text-[11px] text-gray-400">
                {source === "welfare"
                  ? "Type the beneficiary's name to count only their disbursements — anything else is a record label."
                  : "A record label for who or what this is for — doesn't change how actuals are counted."}
              </p>
            </div>
          ) : null}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" min="0"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
          </div>

          {/* Date range (required — drives actual tracking, bounded by the budget period) */}
          <div>
            <p className="text-[11px] text-gray-400 mb-1.5">
              Actuals are counted within this date range — prefilled with the budget period, and can't go outside it.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} required
                min={defaultPeriod?.from || undefined} max={defaultPeriod?.to || undefined}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} required
                min={defaultPeriod?.from || undefined} max={defaultPeriod?.to || undefined}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              maxLength={500} placeholder="Short note"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
            <div className="mt-0.5 text-right text-[10px] text-gray-400">{notes.length}/500</div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={!category || !amount || !dateFrom || !dateTo || saving}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving…" : editing ? "Update Item" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main detail page inner ──────────────────────────────────────────────────

function BudgetDetailPageInner() {
  const guarded = useGuardedAction();
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(BudgetingContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const { toPage } = useDashboardNavigator();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const budgetId = params.get("id");

  const canEdit = useMemo(() => (typeof can === "function" ? can("budgeting", "update") : false), [can]);


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [budget, setBudget] = useState(null);
  const [summary, setSummary] = useState(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    if (!budgetId) return;
    setLoading(true);
    setError(null);
    try {
      const [budgetRes, summaryRes] = await Promise.all([
        store?.getBudget?.(budgetId),
        store?.getBudgetSummary?.(budgetId)
      ]);
      const budgetPayload = budgetRes?.data?.budget || budgetRes?.data?.data?.budget || budgetRes?.data?.data;
      setBudget(budgetPayload?.budget || budgetPayload || null);

      const summaryPayload = summaryRes?.data?.data ?? summaryRes?.data;
      setSummary(summaryPayload?.data ?? summaryPayload ?? null);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load budget");
    } finally {
      setLoading(false);
    }
  }, [budgetId, store]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => {
    if (Array.isArray(summary?.itemsWithActuals)) return summary.itemsWithActuals;
    if (Array.isArray(budget?.items)) return budget.items;
    return [];
  }, [summary, budget]);

  const handleAddItem = async (newItem) => {
    setSavingItem(true);
    try {
      const existing = Array.isArray(budget?.items) ? budget.items : [];
      await store?.updateBudget?.(budgetId, { items: [...existing, newItem] });
      setAddModalOpen(false);
      await load();
    } catch {
      // store sets its own error
    } finally {
      setSavingItem(false);
    }
  };

  const handleEditItem = async (updatedItem) => {
    const idx = editItem?.idx;
    if (idx === undefined || idx === null) return;
    setSavingItem(true);
    try {
      const existing = Array.isArray(budget?.items) ? budget.items : [];
      const next = existing.map((it, i) => (i === idx ? updatedItem : it));
      await store?.updateBudget?.(budgetId, { items: next });
      setEditItem(null);
      await load();
    } catch {
      // store sets its own error
    } finally {
      setSavingItem(false);
    }
  };

  if (!budgetId) {
    return (
      <EmptyState
        illustration="budgeting"
        title="No budget selected"
        description="Please go back and select a budget to view."
        actionLabel="Back to Budgets"
        onAction={() => toPage("budgeting")}
      />
    );
  }

  return (
    <div className="w-full max-w-none">
      <BackButton onClick={() => toPage("budgeting")} label="Back" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-gray-900 text-xl md:text-2xl lg:text-3xl">
              {budget?.name || "Budget Details"}
            </h2>
            {budget?.status ? (
              <span className={`inline-flex rounded-full px-2.5 py-1 font-semibold text-xs ${statusBadgeClass(budget.status)}`}>
                {statusLabel(budget.status)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-gray-500 text-sm hidden md:block">
            {[budget?.fiscalYear && `Financial Year ${budget.fiscalYear}`, formatPeriod(budget?.periodFrom, budget?.periodTo)].filter(Boolean).join(" · ")}
          </p>
          {budget?.description ? (
            <p className="mt-1.5 text-gray-500 text-sm max-w-2xl">{budget.description}</p>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 animate-pulse">
            <div className="h-3.5 w-32 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-72 max-w-full rounded bg-gray-100" />
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:p-5">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                    <div className="h-3.5 w-24 rounded bg-gray-200" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="flex items-center justify-between">
                        <div className="h-3 w-16 rounded bg-gray-200" />
                        <div className="h-3.5 w-20 rounded bg-gray-200" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-6 lg:px-8 py-4">
              <div>
                <div className="h-3.5 w-40 rounded bg-gray-200" />
                <div className="mt-1.5 h-3 w-72 max-w-full rounded bg-gray-100" />
              </div>
              <div className="h-8 w-20 rounded-lg bg-gray-200" />
            </div>
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-6 px-4 md:px-6 py-3.5">
                  <div className="h-5 w-14 rounded-full bg-gray-200" />
                  <div className="h-3.5 w-32 rounded bg-gray-200" />
                  <div className="hidden md:block h-3 w-24 rounded bg-gray-100" />
                  <div className="hidden md:block h-3 w-28 rounded bg-gray-100" />
                  <div className="ml-auto h-3.5 w-16 rounded bg-gray-200" />
                  <div className="h-3.5 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : budget ? (
        <div className="mt-6 space-y-5">

          {/* ── Income & Expense summary cards ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
            <div className="font-semibold text-gray-900 text-sm">Financial Summary</div>
            <div className="mt-0.5 text-gray-500 text-xs">Totals are the sum of all income items and expense items in this budget — planned vs actual</div>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Income card */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:p-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                  <div className="font-semibold text-gray-900 text-sm">Total Income</div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 text-xs">Planned</div>
                    <div className="font-semibold text-gray-900 text-sm">{formatMoney(summary?.plannedIncomeTotal || 0, currency)}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 text-xs">Actual</div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {summary ? formatMoney(summary.actualIncomeTotal || 0, currency) : <span className="text-gray-300">—</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="text-gray-500 text-xs">Variance</div>
                    {summary ? (
                      <div className={`font-semibold text-sm ${summary.varianceIncome >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {summary.varianceIncome >= 0 ? "+" : ""}{formatMoney(summary.varianceIncome, currency)}
                        <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                          {summary.varianceIncome >= 0 ? "above plan" : "below plan"}
                        </span>
                      </div>
                    ) : <div className="text-gray-300 text-xs">—</div>}
                  </div>
                </div>
              </div>

              {/* Expenses card */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:p-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                  <div className="font-semibold text-gray-900 text-sm">Total Expenses</div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 text-xs">Planned</div>
                    <div className="font-semibold text-gray-900 text-sm">{formatMoney(summary?.plannedExpenseTotal || 0, currency)}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 text-xs">Actual</div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {summary ? formatMoney(summary.actualExpenseTotal || 0, currency) : <span className="text-gray-300">—</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="text-gray-500 text-xs">Variance</div>
                    {summary ? (
                      <div className={`font-semibold text-sm ${summary.varianceExpense >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {summary.varianceExpense >= 0 ? "+" : ""}{formatMoney(summary.varianceExpense, currency)}
                        <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                          {summary.varianceExpense >= 0 ? "under budget" : "over budget"}
                        </span>
                      </div>
                    ) : <div className="text-gray-300 text-xs">—</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Budget Items vs Actuals ── */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8 py-4 border-b border-gray-200">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Budget Items vs Actuals</div>
                <div className="mt-0.5 text-gray-500 text-xs">Add categories and planned amounts. Actuals are pulled automatically from matching finance records within each item's dates — prefilled with the budget period. "Allocated To" narrows actuals to a specific entity — leave as church-wide otherwise.</div>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => guarded(() => setAddModalOpen(true))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white text-xs hover:bg-blue-700 shrink-0"
                >
                  <span className="text-base leading-none">+</span>
                  Add Item
                </button>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr className="text-left font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Category</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Allocated To</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Period</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Planned</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Actual</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Variance</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length ? items.map((it, idx) => {
                    const isExpense = it?.type === "expense";
                    const hasActuals = it?.actual !== null && it?.actual !== undefined;
                    const actual = hasActuals ? Number(it.actual) : null;
                    const variance = hasActuals ? Number(it?.variance ?? (Number(it?.amount || 0) - actual)) : null;
                    const isGood = variance !== null && (isExpense ? variance >= 0 : actual >= Number(it?.amount || 0));

                    return (
                      <tr key={idx} className="text-gray-700 hover:bg-gray-50/50">
                        <td className="sticky left-0 z-10 bg-white py-2.5 whitespace-nowrap px-4 md:px-6">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${isExpense ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700"}`}>
                            {it?.type || "—"}
                          </span>
                        </td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">
                          <div className="font-semibold text-gray-900">{it?.category || "—"}</div>
                          {it?.type === "expense" && it?.purpose ? (
                            <div className="mt-0.5 text-[10px] text-primary-500">For: {it.purpose}</div>
                          ) : null}
                        </td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">
                          {it?.type === "income" ? (
                            <span className="text-gray-400 text-xs">Not specified</span>
                          ) : it?.allocatedTo?.entityType ? (
                            <span className="text-xs text-gray-600">
                              <span className="font-semibold capitalize">{String(it.allocatedTo.entityType).replace("_", " ")}</span>
                              {it.allocatedTo.entityName ? <span className="text-gray-400"> — {it.allocatedTo.entityName}</span> : null}
                            </span>
                          ) : <span className="text-gray-400 text-xs">Church-wide</span>}
                        </td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">
                          <span className="text-xs text-gray-600">{formatPeriod(it?.dateFrom, it?.dateTo) || <span className="text-gray-400">—</span>}</span>
                        </td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">{formatMoney(it?.amount || 0, currency)}</td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">
                          {hasActuals
                            ? formatMoney(actual, currency)
                            : <span className="text-gray-400 text-xs">No dates set</span>}
                        </td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">
                          {variance !== null ? (
                            <span className={`font-semibold ${isGood ? "text-green-700" : "text-red-600"}`}>
                              {isGood ? "+" : "-"}{formatMoney(Math.abs(variance), currency)}
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewItem(it)}
                              className="rounded px-2.5 py-1 border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                            >
                              View
                            </button>
                            {canEdit ? (
                              <button
                                onClick={() => guarded(() => setEditItem({ idx, data: it }))}
                                className="rounded px-2.5 py-1 border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <EmptyState
                          compact
                          illustration="budgeting"
                          title="No budget items"
                          description="Click Add Item to start planning income and expenses."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : !loading && !error ? (
        <EmptyState
          illustration="budgeting"
          title="Budget not found"
          description="This budget may have been deleted or you don't have access."
          actionLabel="Back to Budgets"
          onAction={() => toPage("budgeting")}
        />
      ) : null}

      {/* Add Item Modal */}
      {addModalOpen ? (
        <AddItemModal
          onAdd={handleAddItem}
          onClose={() => setAddModalOpen(false)}
          saving={savingItem}
          defaultPeriod={{ from: formatYmd(budget?.periodFrom), to: formatYmd(budget?.periodTo) }}
        />
      ) : null}

      {/* Edit Item Modal */}
      {editItem ? (
        <AddItemModal
          onAdd={handleEditItem}
          onClose={() => setEditItem(null)}
          saving={savingItem}
          initialData={editItem?.data}
          defaultPeriod={{ from: formatYmd(budget?.periodFrom), to: formatYmd(budget?.periodTo) }}
        />
      ) : null}

      {/* Item View Modal */}
      {viewItem ? (
        <ItemViewModal
          item={viewItem}
          currency={currency}
          onClose={() => setViewItem(null)}
        />
      ) : null}
    </div>
  );
}

function BudgetDetailPage() {
  return (
    <BudgetingProvider>
      <BudgetDetailPageInner />
    </BudgetingProvider>
  );
}

export default BudgetDetailPage;
