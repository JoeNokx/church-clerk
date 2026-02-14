import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import {
  getBusinessIncomeExpensesKPI,
  getBusinessVenture
} from "../services/businessVentures.api.js";
import {
  createBusinessIncome,
  deleteBusinessIncome,
  getBusinessIncomes,
  updateBusinessIncome
} from "../incomes/services/businessIncomes.api.js";
import {
  createBusinessExpense,
  deleteBusinessExpense,
  getBusinessExpenses,
  updateBusinessExpense
} from "../expenses/services/businessExpenses.api.js";

function formatCurrency(value, currency) {
  return formatMoney(value, currency);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function BaseModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-gray-500">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
        </div>
        <div className="px-5 py-4 text-sm text-gray-700">{message}</div>
        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function safePayload(res) {
  const payload = res?.data?.data ?? res?.data;
  const data = payload?.data ?? payload;
  return data ?? payload;
}

function safeBusiness(res) {
  const obj = safePayload(res);
  return obj?.businessVentures ?? obj?.businessVenture ?? obj?.business ?? null;
}

function safeKpi(res) {
  const obj = safePayload(res);
  return obj?.business ?? obj?.businessKPI ?? null;
}

function safeList(res, key) {
  const obj = safePayload(res);
  const rows = obj?.[key] ?? [];
  return Array.isArray(rows) ? rows : [];
}

function safePagination(res) {
  const obj = safePayload(res);
  return obj?.pagination ?? null;
}

function DateRangeFilter({ appliedFrom, appliedTo, onApply, onClear }) {
  const datePickerRef = useRef(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  useEffect(() => {
    setDraftFrom(appliedFrom || "");
    setDraftTo(appliedTo || "");
  }, [appliedFrom, appliedTo]);

  const labelText = useMemo(() => {
    if (!appliedFrom && !appliedTo) return "Date";
    if (appliedFrom && appliedTo && appliedFrom === appliedTo) return appliedFrom;
    if (appliedFrom && appliedTo) return `${appliedFrom} to ${appliedTo}`;
    if (appliedFrom) return appliedFrom;
    if (appliedTo) return appliedTo;
    return "Date";
  }, [appliedFrom, appliedTo]);

  useEffect(() => {
    if (!datePickerOpen) return;

    const onDocMouseDown = (e) => {
      if (!datePickerRef.current) return;
      if (datePickerRef.current.contains(e.target)) return;
      setDatePickerOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [datePickerOpen]);

  const clearDates = async () => {
    setDraftFrom("");
    setDraftTo("");
    await onClear?.();
    setDatePickerOpen(false);
  };

  const onDraftFromChange = (value) => {
    setDraftFrom(value);
    if (draftTo && value && draftTo < value) {
      setDraftTo("");
    }
  };

  const applyDates = async () => {
    const from = draftFrom || "";
    const to = draftTo || "";

    if (!from && !to) {
      await clearDates();
      return;
    }

    if ((from && !to) || (!from && to)) {
      const single = from || to;
      await onApply?.(single, single);
      setDatePickerOpen(false);
      return;
    }

    await onApply?.(from, to);
    setDatePickerOpen(false);
  };

  return (
    <div className="relative" ref={datePickerRef}>
      <button
        type="button"
        onClick={() => setDatePickerOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
          <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span className="text-gray-700">{labelText}</span>
      </button>

      {datePickerOpen && (
        <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="text-xs font-semibold text-gray-500">Filter by date</div>
            <button type="button" onClick={clearDates} className="text-xs font-semibold text-gray-600 hover:text-gray-900">
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-500">From</div>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => onDraftFromChange(e.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500">To</div>
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>
          </div>

          <div className="pt-3 text-xs text-gray-500">
            Pick only <span className="font-semibold">From</span> for a single day, or pick both for a range.
          </div>

          <div className="pt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={applyDates}
              className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IncomeFormModal({ open, mode, initialData, onClose, onSubmit, title, currency }) {
  const [recievedFrom, setRecievedFrom] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);

    if (mode === "edit" && initialData) {
      setRecievedFrom(String(initialData?.recievedFrom || ""));
      setDate(String(initialData?.date || "").slice(0, 10));
      setAmount(initialData?.amount ?? "");
      setNote(String(initialData?.note || ""));
      return;
    }

    setRecievedFrom("");
    setDate("");
    setAmount("");
    setNote("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!String(recievedFrom || "").trim()) {
      setError("Received from is required.");
      return;
    }

    if (!date) {
      setError("Date is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Amount is required.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit?.({
        recievedFrom: String(recievedFrom).trim(),
        date,
        amount: Number(amount),
        note: String(note || "").trim()
      });
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal open={open} title={title} subtitle="Business income" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div>
          <label className="block text-xs font-semibold text-gray-500">Received From</label>
          <input
            value={recievedFrom}
            onChange={(e) => setRecievedFrom(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500">{currency ? `Amount (${currency})` : "Amount"}</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              type="number"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500">Date</label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              type="date"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="Optional"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {mode === "edit" ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function ExpenseFormModal({ open, mode, initialData, onClose, onSubmit, title, currency }) {
  const [spentBy, setSpentBy] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);

    if (mode === "edit" && initialData) {
      setSpentBy(String(initialData?.spentBy || ""));
      setCategory(String(initialData?.category || ""));
      setDate(String(initialData?.date || "").slice(0, 10));
      setAmount(initialData?.amount ?? "");
      setDescription(String(initialData?.description || ""));
      return;
    }

    setSpentBy("");
    setCategory("");
    setDate("");
    setAmount("");
    setDescription("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!String(spentBy || "").trim()) {
      setError("Spent by is required.");
      return;
    }

    if (!date) {
      setError("Date is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Amount is required.");
      return;
    }

    if (!String(category || "").trim()) {
      setError("Category is required.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit?.({
        spentBy: String(spentBy).trim(),
        category: String(category).trim(),
        date,
        amount: Number(amount),
        description: String(description || "").trim()
      });
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    "Salary",
    "Marketing",
    "Utility",
    "Inventory",
    "Equipment",
    "Transportation",
    "Maintenance",
    "Other"
  ];

  return (
    <BaseModal open={open} title={title} subtitle="Business expenses" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div>
          <label className="block text-xs font-semibold text-gray-500">Spent By</label>
          <input
            value={spentBy}
            onChange={(e) => setSpentBy(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500">Date</label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              type="date"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500">{currency ? `Amount (${currency})` : "Amount"}</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              type="number"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {mode === "edit" ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function BusinessVentureDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toPage } = useDashboardNavigator();

  const churchCtx = useContext(ChurchContext);
  const currency = String(churchCtx?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const activeChurch = churchCtx?.activeChurch;
  const canEdit = activeChurch?._id ? activeChurch?.canEdit !== false : true;

  const businessId = useMemo(() => new URLSearchParams(location.search).get("id") || "", [location.search]);
  const tabParam = useMemo(() => new URLSearchParams(location.search).get("tab") || "", [location.search]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [business, setBusiness] = useState(null);
  const [kpi, setKpi] = useState(null);

  const [activeTab, setActiveTab] = useState("incomes");

  const [incomeRows, setIncomeRows] = useState([]);
  const [incomePagination, setIncomePagination] = useState(null);
  const [incomePage, setIncomePage] = useState(1);
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeDateFrom, setIncomeDateFrom] = useState("");
  const [incomeDateTo, setIncomeDateTo] = useState("");

  const [expenseRows, setExpenseRows] = useState([]);
  const [expensePagination, setExpensePagination] = useState(null);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");

  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [editIncomeOpen, setEditIncomeOpen] = useState(false);
  const [editIncomeRow, setEditIncomeRow] = useState(null);
  const [deleteIncomeOpen, setDeleteIncomeOpen] = useState(false);
  const [deleteIncomeRow, setDeleteIncomeRow] = useState(null);

  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editExpenseOpen, setEditExpenseOpen] = useState(false);
  const [editExpenseRow, setEditExpenseRow] = useState(null);
  const [deleteExpenseOpen, setDeleteExpenseOpen] = useState(false);
  const [deleteExpenseRow, setDeleteExpenseRow] = useState(null);

  const loadHeader = async () => {
    if (!businessId) return;
    const [bizRes, kpiRes] = await Promise.allSettled([
      getBusinessVenture(businessId),
      getBusinessIncomeExpensesKPI(businessId)
    ]);

    if (bizRes.status === "fulfilled") {
      setBusiness(safeBusiness(bizRes.value));
    } else {
      setBusiness(null);
      setError(bizRes.reason?.response?.data?.message || bizRes.reason?.message || "Failed to load business venture");
    }

    if (kpiRes.status === "fulfilled") {
      setKpi(safeKpi(kpiRes.value));
    } else {
      setKpi(null);
    }
  };

  const loadIncomes = async (page) => {
    if (!businessId) return;
    const res = await getBusinessIncomes(businessId, {
      page,
      limit: 10,
      search: incomeSearch,
      dateFrom: incomeDateFrom,
      dateTo: incomeDateTo
    });
    setIncomeRows(safeList(res, "businessIncome"));
    setIncomePagination(safePagination(res));
  };

  const loadExpenses = async (page) => {
    if (!businessId) return;
    const res = await getBusinessExpenses(businessId, {
      page,
      limit: 10,
      search: expenseSearch,
      dateFrom: expenseDateFrom,
      dateTo: expenseDateTo
    });
    setExpenseRows(safeList(res, "businessExpenses"));
    setExpensePagination(safePagination(res));
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      await loadHeader();
      await Promise.all([loadIncomes(incomePage), loadExpenses(expensePage)]);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load business venture details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    loadIncomes(incomePage).catch(() => null);
  }, [incomePage, incomeSearch, incomeDateFrom, incomeDateTo]);

  useEffect(() => {
    if (!businessId) return;
    loadExpenses(expensePage).catch(() => null);
  }, [expensePage, expenseSearch, expenseDateFrom, expenseDateTo]);

  useEffect(() => {
    if (tabParam === "incomes" || tabParam === "expenses") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const changeTab = (next) => {
    setActiveTab(next);
    const params = new URLSearchParams(location.search);
    params.set("tab", next);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const incomeTotalPages = Number(incomePagination?.totalPages || 1);
  const expenseTotalPages = Number(expensePagination?.totalPages || 1);

  const kpiCards = useMemo(() => {
    const totalIncome = Number(kpi?.totalIncome ?? 0);
    const totalExpenses = Number(kpi?.totalExpenses ?? 0);
    const totalNet = Number(kpi?.totalNet ?? (totalIncome - totalExpenses));

    return {
      totalIncome,
      totalExpenses,
      totalNet,
      incomeThisMonth: Number(kpi?.incomeThisMonth ?? 0),
      expensesThisMonth: Number(kpi?.expensesThisMonth ?? 0),
      incomeCount: Number(kpi?.incomeCount ?? 0),
      expensesCount: Number(kpi?.expensesCount ?? 0)
    };
  }, [kpi]);

  if (!businessId) {
    return (
      <div className="max-w-6xl">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="text-sm font-semibold text-gray-900">Business Venture</div>
          <div className="mt-2 text-sm text-gray-600">Missing business id.</div>
          <button
            type="button"
            onClick={() => toPage("business-ventures")}
            className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => toPage("business-ventures")}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{business?.businessName || "Business Venture"}</div>
          <div className="mt-2 text-sm text-gray-600">{business?.description || "—"}</div>
          <div className="mt-2 text-xs text-gray-500">Manager: {business?.manager || "—"} | Phone: {business?.phoneNumber || "—"}</div>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Total Income</div>
          <div className="mt-3 text-2xl font-semibold text-green-700">{formatCurrency(kpiCards.totalIncome, currency)}</div>
          <div className="mt-2 text-xs text-gray-500">{kpiCards.incomeCount} transactions</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Total Expenses</div>
          <div className="mt-3 text-2xl font-semibold text-orange-600">{formatCurrency(kpiCards.totalExpenses, currency)}</div>
          <div className="mt-2 text-xs text-gray-500">{kpiCards.expensesCount} transactions</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Net</div>
          <div className="mt-3 text-2xl font-semibold text-blue-900">{formatCurrency(kpiCards.totalNet, currency)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">This Month</div>
          <div className="mt-3 text-sm font-semibold text-gray-900">
            Income: {formatCurrency(kpiCards.incomeThisMonth, currency)}
          </div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            Expenses: {formatCurrency(kpiCards.expensesThisMonth, currency)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeTab("incomes")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "incomes" ? "bg-blue-700 text-white" : "border border-gray-200 bg-white text-gray-700"}`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => changeTab("expenses")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "expenses" ? "bg-blue-700 text-white" : "border border-gray-200 bg-white text-gray-700"}`}
              >
                Expenses
              </button>
            </div>

            <div className="flex items-center gap-3">
              <DateRangeFilter
                appliedFrom={activeTab === "incomes" ? incomeDateFrom : expenseDateFrom}
                appliedTo={activeTab === "incomes" ? incomeDateTo : expenseDateTo}
                onApply={async (from, to) => {
                  if (activeTab === "incomes") {
                    setIncomeDateFrom(from);
                    setIncomeDateTo(to);
                    setIncomePage(1);
                    return;
                  }

                  setExpenseDateFrom(from);
                  setExpenseDateTo(to);
                  setExpensePage(1);
                }}
                onClear={async () => {
                  if (activeTab === "incomes") {
                    setIncomeDateFrom("");
                    setIncomeDateTo("");
                    setIncomePage(1);
                    return;
                  }

                  setExpenseDateFrom("");
                  setExpenseDateTo("");
                  setExpensePage(1);
                }}
              />

              <input
                value={activeTab === "incomes" ? incomeSearch : expenseSearch}
                onChange={(e) => {
                  if (activeTab === "incomes") {
                    setIncomeSearch(e.target.value);
                    setIncomePage(1);
                    return;
                  }
                  setExpenseSearch(e.target.value);
                  setExpensePage(1);
                }}
                placeholder="Search..."
                className="h-10 w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />

              {canEdit ? (
                activeTab === "incomes" ? (
                  <button
                    type="button"
                    onClick={() => setAddIncomeOpen(true)}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    + Add Income
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddExpenseOpen(true)}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    + Add Expense
                  </button>
                )
              ) : null}
            </div>
          </div>

          {activeTab === "incomes" ? (
            <div className="mt-5 rounded-xl border border-gray-200 bg-white">
              {incomeRows.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-left text-xs font-semibold text-gray-500">
                        <th className="px-6 py-2">Received From</th>
                        <th className="px-6 py-2">Note</th>
                        <th className="px-6 py-2">Date</th>
                        <th className="px-6 py-2">Amount</th>
                        <th className="px-6 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {incomeRows.map((row, idx) => (
                        <tr key={row?._id ?? `i-${idx}`} className="text-sm text-gray-700">
                          <td className="px-6 py-1.5 text-gray-900">{row?.recievedFrom || "—"}</td>
                          <td className="px-6 py-1.5 text-gray-600">{row?.note || "—"}</td>
                          <td className="px-6 py-1.5">{formatDate(row?.date)}</td>
                          <td className="px-6 py-1.5 text-green-700">{formatCurrency(row?.amount, currency)}</td>
                          <td className="px-6 py-1.5">
                            <div className="flex items-center justify-end gap-2">
                              {canEdit ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditIncomeRow(row);
                                      setEditIncomeOpen(true);
                                    }}
                                    className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteIncomeRow(row);
                                      setDeleteIncomeOpen(true);
                                    }}
                                    className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-4 text-sm text-gray-600">No income records found.</div>
              )}

              <div className="flex items-center justify-end gap-3 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setIncomePage((p) => Math.max(1, p - 1))}
                  disabled={incomePage <= 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-sm text-gray-600">Page {incomePage} of {incomeTotalPages}</div>
                <button
                  type="button"
                  onClick={() => setIncomePage((p) => Math.min(incomeTotalPages, p + 1))}
                  disabled={incomePage >= incomeTotalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-gray-200 bg-white">
              {expenseRows.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-left text-xs font-semibold text-gray-500">
                        <th className="px-6 py-2">Spent By</th>
                        <th className="px-6 py-2">Category</th>
                        <th className="px-6 py-2">Description</th>
                        <th className="px-6 py-2">Date</th>
                        <th className="px-6 py-2">Amount</th>
                        <th className="px-6 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {expenseRows.map((row, idx) => (
                        <tr key={row?._id ?? `e-${idx}`} className="text-sm text-gray-700">
                          <td className="px-6 py-1.5 text-gray-900">{row?.spentBy || "—"}</td>
                          <td className="px-6 py-1.5 text-gray-600">{row?.category || "—"}</td>
                          <td className="px-6 py-1.5 text-gray-600">{row?.description || "—"}</td>
                          <td className="px-6 py-1.5">{formatDate(row?.date)}</td>
                          <td className="px-6 py-1.5 text-orange-600">{formatCurrency(row?.amount, currency)}</td>
                          <td className="px-6 py-1.5">
                            <div className="flex items-center justify-end gap-2">
                              {canEdit ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditExpenseRow(row);
                                      setEditExpenseOpen(true);
                                    }}
                                    className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteExpenseRow(row);
                                      setDeleteExpenseOpen(true);
                                    }}
                                    className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-4 text-sm text-gray-600">No expense records found.</div>
              )}

              <div className="flex items-center justify-end gap-3 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                  disabled={expensePage <= 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-sm text-gray-600">Page {expensePage} of {expenseTotalPages}</div>
                <button
                  type="button"
                  onClick={() => setExpensePage((p) => Math.min(expenseTotalPages, p + 1))}
                  disabled={expensePage >= expenseTotalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <IncomeFormModal
        open={addIncomeOpen}
        mode="add"
        title="Add Income"
        onClose={() => setAddIncomeOpen(false)}
        onSubmit={async (payload) => {
          await createBusinessIncome(businessId, payload);
          setAddIncomeOpen(false);
          await Promise.all([loadHeader(), loadIncomes(1)]);
          setIncomePage(1);
        }}
      />

      <IncomeFormModal
        open={editIncomeOpen}
        mode="edit"
        title="Edit Income"
        currency={currency}
        initialData={editIncomeRow}
        onClose={() => {
          setEditIncomeOpen(false);
          setEditIncomeRow(null);
        }}
        onSubmit={async (payload) => {
          if (!editIncomeRow?._id) return;
          await updateBusinessIncome(businessId, editIncomeRow._id, payload);
          setEditIncomeOpen(false);
          setEditIncomeRow(null);
          await Promise.all([loadHeader(), loadIncomes(incomePage)]);
        }}
      />

      <ConfirmModal
        open={deleteIncomeOpen}
        title="Delete Income"
        message="Are you sure you want to delete this income record?"
        confirmLabel="Delete"
        onCancel={() => {
          setDeleteIncomeOpen(false);
          setDeleteIncomeRow(null);
        }}
        onConfirm={async () => {
          if (!deleteIncomeRow?._id) return;
          await deleteBusinessIncome(businessId, deleteIncomeRow._id);
          setDeleteIncomeOpen(false);
          setDeleteIncomeRow(null);
          await Promise.all([loadHeader(), loadIncomes(incomePage)]);
        }}
      />

      <ExpenseFormModal
        open={addExpenseOpen}
        mode="add"
        title="Add Expense"
        currency={currency}
        initialData={null}
        onClose={() => {
          setAddExpenseOpen(false);
          setAddExpenseError("");
        }}
        onSubmit={async (payload) => {
          await createBusinessExpense(businessId, payload);
          setAddExpenseOpen(false);
          await Promise.all([loadHeader(), loadExpenses(1)]);
          setExpensePage(1);
        }}
      />

      <ExpenseFormModal
        open={editExpenseOpen}
        mode="edit"
        title="Edit Expense"
        currency={currency}
        initialData={editExpenseRow}
        onClose={() => {
          setEditExpenseOpen(false);
          setEditExpenseRow(null);
        }}
        onSubmit={async (payload) => {
          if (!editExpenseRow?._id) return;
          await updateBusinessExpense(businessId, editExpenseRow._id, payload);
          setEditExpenseOpen(false);
          setEditExpenseRow(null);
          await Promise.all([loadHeader(), loadExpenses(expensePage)]);
        }}
      />

      <ConfirmModal
        open={deleteExpenseOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record?"
        confirmLabel="Delete"
        onCancel={() => {
          setDeleteExpenseOpen(false);
          setDeleteExpenseRow(null);
        }}
        onConfirm={async () => {
          if (!deleteExpenseRow?._id) return;
          await deleteBusinessExpense(businessId, deleteExpenseRow._id);
          setDeleteExpenseOpen(false);
          setDeleteExpenseRow(null);
          await Promise.all([loadHeader(), loadExpenses(expensePage)]);
        }}
      />
    </div>
  );
}

export default BusinessVentureDetailsPage;
