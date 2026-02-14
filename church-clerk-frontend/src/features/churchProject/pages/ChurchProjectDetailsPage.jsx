import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import { getProjectContributionExpensesKPI } from "../services/churchProject.api.js";
import {
  createProjectContribution,
  deleteProjectContribution,
  getProjectContributions,
  updateProjectContribution
} from "../contributions/services/projectContributions.api.js";
import {
  createProjectExpense,
  deleteProjectExpense,
  getProjectExpenses,
  updateProjectExpense
} from "../expenses/services/projectExpenses.api.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function formatCurrency(value, currency) {
  return formatMoney(value, currency);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return { label: "completed", cls: "bg-green-100 text-green-700" };
  return { label: "active", cls: "bg-blue-100 text-blue-700" };
}

function percentToNumber(value) {
  const s = String(value || "");
  const cleaned = s.endsWith("%") ? s.slice(0, -1) : s;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function safeKpiPayload(res) {
  const payload = res?.data?.data ?? res?.data;
  const data = payload?.data ?? payload;
  return data?.churchProject ?? payload?.churchProject ?? null;
}

function safeListPayload(res, key) {
  const payload = res?.data?.data ?? res?.data;
  const data = payload?.data ?? payload;
  const list = data?.[key] ?? payload?.[key];
  return Array.isArray(list) ? list : [];
}

function safePagination(res) {
  const payload = res?.data?.data ?? res?.data;
  const data = payload?.data ?? payload;
  return data?.pagination ?? payload?.pagination ?? null;
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

function DateRangePopover({ dateFrom, dateTo, onChangeFrom, onChangeTo, onClear }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {dateFrom || dateTo ? "Filter" : "Date"}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">Filter by date range</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500">From</label>
                <input
                  value={dateFrom}
                  onChange={(e) => onChangeFrom(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  type="date"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500">To</label>
                <input
                  value={dateTo}
                  onChange={(e) => onChangeTo(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  type="date"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setOpen(false); onClear?.(); }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-800"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContributionFormModal({ open, mode, initialData, projectName, disabled, onClose, onSubmit, currency }) {
  const [contributorName, setContributorName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);

    if (mode === "edit" && initialData) {
      setContributorName(initialData?.contributorName || "");
      setAmount(initialData?.amount ?? "");
      setDate((initialData?.date || "").slice(0, 10));
      setNotes(initialData?.notes || "");
      return;
    }

    setContributorName("");
    setAmount("");
    setDate("");
    setNotes("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!String(contributorName || "").trim()) {
      setError("Contributor is required.");
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
        contributorName: String(contributorName).trim(),
        date,
        amount: Number(amount),
        notes: String(notes || "").trim().slice(0, 25)
      });
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title={mode === "edit" ? "Edit Contribution" : "Add Contribution"}
      subtitle={projectName ? `Project: ${projectName}` : ""}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div>
          <label className="block text-xs font-semibold text-gray-500">Contributor</label>
          <input
            value={contributorName}
            onChange={(e) => setContributorName(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="e.g., John Mensah"
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
          <label className="block text-xs font-semibold text-gray-500">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="Optional"
            maxLength={25}
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
            disabled={disabled || saving}
            className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {mode === "edit" ? "Save" : "Add Contribution"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function ExpenseFormModal({ open, mode, initialData, projectName, disabled, onClose, onSubmit, currency }) {
  const [spentOn, setSpentOn] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);

    if (mode === "edit" && initialData) {
      setSpentOn(initialData?.spentOn || "");
      setAmount(initialData?.amount ?? "");
      setDate((initialData?.date || "").slice(0, 10));
      setDescription(initialData?.description || "");
      return;
    }

    setSpentOn("");
    setAmount("");
    setDate("");
    setDescription("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!String(spentOn || "").trim()) {
      setError("Spent on is required.");
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
        spentOn: String(spentOn).trim(),
        date,
        amount: Number(amount),
        description: String(description || "").trim().slice(0, 25)
      });
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title={mode === "edit" ? "Edit Expense" : "Record Expense"}
      subtitle={projectName ? `Project: ${projectName}` : ""}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div>
          <label className="block text-xs font-semibold text-gray-500">Spent On</label>
          <input
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="e.g., Foundation materials"
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
          <label className="block text-xs font-semibold text-gray-500">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="Optional"
            maxLength={25}
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
            disabled={disabled || saving}
            className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {mode === "edit" ? "Save" : "Record Expense"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function ChurchProjectDetailsPage() {
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const { can } = useContext(PermissionContext) || {};
  const location = useLocation();
  const { toPage } = useDashboardNavigator();

  const projectId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search]);

  const canCreate = useMemo(() => (typeof can === "function" ? can("churchProjects", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("churchProjects", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("churchProjects", "delete") : false), [can]);

  const [tab, setTab] = useState("contributions");

  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState("");
  const [kpi, setKpi] = useState(null);

  const [contribLoading, setContribLoading] = useState(true);
  const [contribError, setContribError] = useState("");
  const [contribRows, setContribRows] = useState([]);
  const [contribPagination, setContribPagination] = useState(null);
  const [contribPage, setContribPage] = useState(1);
  const [contribSearch, setContribSearch] = useState("");
  const [contribDateFrom, setContribDateFrom] = useState("");
  const [contribDateTo, setContribDateTo] = useState("");

  const [expenseLoading, setExpenseLoading] = useState(true);
  const [expenseError, setExpenseError] = useState("");
  const [expenseRows, setExpenseRows] = useState([]);
  const [expensePagination, setExpensePagination] = useState(null);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");

  const [contributionModalOpen, setContributionModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const debouncedContribSearch = useDebouncedValue(contribSearch, 300);
  const debouncedExpenseSearch = useDebouncedValue(expenseSearch, 300);

  const loadKpi = async () => {
    if (!projectId) return;
    setKpiLoading(true);
    setKpiError("");
    try {
      const res = await getProjectContributionExpensesKPI(projectId);
      setKpi(safeKpiPayload(res));
    } catch (e) {
      setKpiError(e?.response?.data?.message || e?.message || "Failed to load project");
      setKpi(null);
    } finally {
      setKpiLoading(false);
    }
  };

  const loadContributions = async (nextPage) => {
    if (!projectId) return;
    setContribLoading(true);
    setContribError("");
    try {
      const res = await getProjectContributions(projectId, {
        page: nextPage,
        limit: 10,
        search: String(debouncedContribSearch || "").trim(),
        dateFrom: contribDateFrom || undefined,
        dateTo: contribDateTo || undefined
      });
      setContribRows(safeListPayload(res, "projectContribution"));
      setContribPagination(safePagination(res));
    } catch (e) {
      setContribError(e?.response?.data?.message || e?.message || "Failed to load contributions");
      setContribRows([]);
      setContribPagination(null);
    } finally {
      setContribLoading(false);
    }
  };

  const loadExpenses = async (nextPage) => {
    if (!projectId) return;
    setExpenseLoading(true);
    setExpenseError("");
    try {
      const res = await getProjectExpenses(projectId, {
        page: nextPage,
        limit: 10,
        search: String(debouncedExpenseSearch || "").trim(),
        dateFrom: expenseDateFrom || undefined,
        dateTo: expenseDateTo || undefined
      });
      setExpenseRows(safeListPayload(res, "projectExpenses"));
      setExpensePagination(safePagination(res));
    } catch (e) {
      setExpenseError(e?.response?.data?.message || e?.message || "Failed to load expenses");
      setExpenseRows([]);
      setExpensePagination(null);
    } finally {
      setExpenseLoading(false);
    }
  };

  useEffect(() => {
    loadKpi();
  }, [projectId]);

  useEffect(() => {
    loadContributions(contribPage);
  }, [projectId, contribPage, debouncedContribSearch, contribDateFrom, contribDateTo]);

  useEffect(() => {
    loadExpenses(expensePage);
  }, [projectId, expensePage, debouncedExpenseSearch, expenseDateFrom, expenseDateTo]);

  const projectName = kpi?.name || "";
  const badge = statusBadge(kpi?.status);
  const progressValue = percentToNumber(kpi?.progressPercentage);

  const openCreateContribution = () => {
    setEditingContribution(null);
    setContributionModalOpen(true);
  };

  const openCreateExpense = () => {
    setEditingExpense(null);
    setExpenseModalOpen(true);
  };

  const openEditContribution = (row) => {
    setEditingContribution(row || null);
    setContributionModalOpen(true);
  };

  const openEditExpense = (row) => {
    setEditingExpense(row || null);
    setExpenseModalOpen(true);
  };

  const openConfirmDelete = (kind, id) => {
    setConfirmKind(kind);
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const closeConfirmDelete = () => {
    setConfirmOpen(false);
    setConfirmKind(null);
    setConfirmId(null);
  };

  const confirmDelete = async () => {
    const id = confirmId;
    const kind = confirmKind;
    closeConfirmDelete();

    if (!id || !kind || !projectId) return;

    if (kind === "contribution") {
      await deleteProjectContribution(projectId, id);
      await Promise.all([loadKpi(), loadContributions(contribPage)]);
      return;
    }

    if (kind === "expense") {
      await deleteProjectExpense(projectId, id);
      await Promise.all([loadKpi(), loadExpenses(expensePage)]);
    }
  };

  if (!projectId) {
    return (
      <div className="max-w-6xl">
        <div className="text-2xl font-semibold text-gray-900">Project Details</div>
        <div className="mt-2 text-sm text-gray-600">No project selected.</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => toPage("church-projects")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Projects
          </button>

          <div className="mt-3 text-2xl font-semibold text-gray-900">{kpiLoading ? "Loading…" : projectName || "Project"}</div>
          <div className="mt-2 text-sm text-gray-600">{kpi?.description || ""}</div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
        </div>
      </div>

      {kpiError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{kpiError}</div> : null}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Target Amount</div>
          <div className="mt-3 text-2xl font-semibold text-purple-700">{formatCurrency(kpi?.targetAmount || 0, currency)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Total Raised</div>
          <div className="mt-3 text-2xl font-semibold text-green-700">{formatCurrency(kpi?.totalContributions || 0, currency)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Total Spent</div>
          <div className="mt-3 text-2xl font-semibold text-orange-600">{formatCurrency(kpi?.totalExpenses || 0, currency)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Balance</div>
          <div className="mt-3 text-2xl font-semibold text-blue-900">{formatCurrency(kpi?.balance || 0, currency)}</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>Fundraising Progress</div>
          <div className="text-blue-700 font-semibold">{kpi?.progressPercentage || "0%"}</div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-blue-700" style={{ width: `${progressValue}%` }} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("contributions")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                tab === "contributions" ? "bg-blue-50 text-blue-900 ring-1 ring-blue-100" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Contributions
            </button>
            <button
              type="button"
              onClick={() => setTab("expenses")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                tab === "expenses" ? "bg-blue-50 text-blue-900 ring-1 ring-blue-100" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Expenses
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {tab === "contributions" ? (
              <>
                <input
                  value={contribSearch}
                  onChange={(e) => {
                    setContribSearch(e.target.value);
                    setContribPage(1);
                  }}
                  placeholder="Search contributor..."
                  className="h-10 w-full sm:w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
                <DateRangePopover
                  dateFrom={contribDateFrom}
                  dateTo={contribDateTo}
                  onChangeFrom={(v) => { setContribDateFrom(v); setContribPage(1); }}
                  onChangeTo={(v) => { setContribDateTo(v); setContribPage(1); }}
                  onClear={() => { setContribDateFrom(""); setContribDateTo(""); setContribPage(1); }}
                />
                <button
                  type="button"
                  onClick={openCreateContribution}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  <span className="text-lg leading-none">+</span>
                  Add Contribution
                </button>
              </>
            ) : (
              <>
                <input
                  value={expenseSearch}
                  onChange={(e) => {
                    setExpenseSearch(e.target.value);
                    setExpensePage(1);
                  }}
                  placeholder="Search spent on..."
                  className="h-10 w-full sm:w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
                <DateRangePopover
                  dateFrom={expenseDateFrom}
                  dateTo={expenseDateTo}
                  onChangeFrom={(v) => { setExpenseDateFrom(v); setExpensePage(1); }}
                  onChangeTo={(v) => { setExpenseDateTo(v); setExpensePage(1); }}
                  onClear={() => { setExpenseDateFrom(""); setExpenseDateTo(""); setExpensePage(1); }}
                />
                <button
                  type="button"
                  onClick={openCreateExpense}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  <span className="text-lg leading-none">+</span>
                  Record Expense
                </button>
              </>
            )}
          </div>
        </div>

        {tab === "contributions" ? (
          <div>
            {contribLoading ? <div className="p-5 text-sm text-gray-600">Loading…</div> : null}
            {contribError ? (
              <div className="p-5">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{contribError}</div>
              </div>
            ) : null}

            {!contribLoading && !contribError ? (
              contribRows.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-left text-xs font-semibold text-gray-500">
                        <th className="px-6 py-2">Contributor</th>
                        <th className="px-6 py-2">Amount</th>
                        <th className="px-6 py-2">Date</th>
                        <th className="px-6 py-2">Notes</th>
                        <th className="px-6 py-2">Recorded By</th>
                        <th className="px-6 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {contribRows.map((row, idx) => (
                        <tr key={row?._id ?? `c-${idx}`} className="text-sm text-gray-700">
                          <td className="px-6 py-1.5 text-gray-900">{row?.contributorName || "—"}</td>
                          <td className="px-6 py-1.5 text-green-700">{formatCurrency(row?.amount || 0, currency)}</td>
                          <td className="px-6 py-1.5">{formatDate(row?.date)}</td>
                          <td className="px-6 py-1.5 text-gray-600 max-w-[320px] break-words">{row?.notes || "—"}</td>
                          <td className="px-6 py-1.5">{row?.createdBy?.fullName || "—"}</td>
                          <td className="px-6 py-1.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditContribution(row)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => openConfirmDelete("contribution", row?._id)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm hover:bg-gray-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 text-sm text-gray-600">No contribution record found.</div>
              )
            ) : null}

            <div className="flex items-center justify-end gap-3 px-6 py-3">
              <button
                type="button"
                onClick={() => setContribPage((p) => Math.max(1, p - 1))}
                disabled={!contribPagination?.hasPrev}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm text-gray-600">Page {contribPagination?.currentPage || 1}</div>
              <button
                type="button"
                onClick={() => setContribPage((p) => p + 1)}
                disabled={!contribPagination?.hasNext}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div>
            {expenseLoading ? <div className="p-5 text-sm text-gray-600">Loading…</div> : null}
            {expenseError ? (
              <div className="p-5">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{expenseError}</div>
              </div>
            ) : null}

            {!expenseLoading && !expenseError ? (
              expenseRows.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-left text-xs font-semibold text-gray-500">
                        <th className="px-6 py-2">Spent On</th>
                        <th className="px-6 py-2">Amount</th>
                        <th className="px-6 py-2">Date</th>
                        <th className="px-6 py-2">Description</th>
                        <th className="px-6 py-2">Recorded By</th>
                        <th className="px-6 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {expenseRows.map((row, idx) => (
                        <tr key={row?._id ?? `e-${idx}`} className="text-sm text-gray-700">
                          <td className="px-6 py-1.5 text-gray-900">{row?.spentOn || "—"}</td>
                          <td className="px-6 py-1.5 text-orange-600">{formatCurrency(row?.amount || 0, currency)}</td>
                          <td className="px-6 py-1.5">{formatDate(row?.date)}</td>
                          <td className="px-6 py-1.5 text-gray-600 max-w-[320px] break-words">{row?.description || "—"}</td>
                          <td className="px-6 py-1.5">{row?.createdBy?.fullName || "—"}</td>
                          <td className="px-6 py-1.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditExpense(row)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => openConfirmDelete("expense", row?._id)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm hover:bg-gray-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 text-sm text-gray-600">No expense record found.</div>
              )
            ) : null}

            <div className="flex items-center justify-end gap-3 px-6 py-3">
              <button
                type="button"
                onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                disabled={!expensePagination?.hasPrev}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm text-gray-600">Page {expensePagination?.currentPage || 1}</div>
              <button
                type="button"
                onClick={() => setExpensePage((p) => p + 1)}
                disabled={!expensePagination?.hasNext}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ContributionFormModal
        open={contributionModalOpen}
        mode={editingContribution ? "edit" : "create"}
        initialData={editingContribution}
        projectName={project?.name || ""}
        disabled={contribSaving}
        currency={currency}
        onClose={() => {
          setContributionModalOpen(false);
          setEditingContribution(null);
        }}
        onSubmit={async (payload) => {
          if (!projectId) return;
          if (editingContribution?._id) {
            await updateProjectContribution(projectId, editingContribution._id, payload);
          } else {
            await createProjectContribution(projectId, payload);
          }
          setContributionModalOpen(false);
          setEditingContribution(null);
          await Promise.all([loadKpi(), loadContributions(contribPage)]);
        }}
      />

      <ExpenseFormModal
        open={expenseModalOpen}
        mode={editingExpense ? "edit" : "create"}
        initialData={editingExpense}
        projectName={project?.name || ""}
        disabled={expenseSaving}
        currency={currency}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={async (payload) => {
          if (!projectId) return;
          if (editingExpense?._id) {
            await updateProjectExpense(projectId, editingExpense._id, payload);
          } else {
            await createProjectExpense(projectId, payload);
          }
          setExpenseModalOpen(false);
          setEditingExpense(null);
          await Promise.all([loadKpi(), loadExpenses(expensePage)]);
        }}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Delete Record"
        message="Are you sure you want to delete this record?"
        confirmLabel="Delete"
        onCancel={closeConfirmDelete}
        onConfirm={async () => {
          try {
            await confirmDelete();
          } catch {
            await loadKpi();
          }
        }}
      />
    </div>
  );
}

export default ChurchProjectDetailsPage;
