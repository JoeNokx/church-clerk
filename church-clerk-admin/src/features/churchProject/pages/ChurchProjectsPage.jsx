import { useContext, useEffect, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import ChurchContext from "../../Church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import {
  createChurchProject,
  deleteChurchProject,
  getChurchProjects,
  updateChurchProject
} from "../services/churchProject.api.js";
import { createProjectContribution } from "../contributions/services/projectContributions.api.js";
import { createProjectExpense } from "../expenses/services/projectExpenses.api.js";

function formatCurrency(value, currency) {
  return formatMoney(value, currency);
}

function formatPercent(value) {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  const rounded = Math.round(v * 10) / 10;
  return `${rounded}%`;
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return { label: "completed", cls: "bg-green-100 text-green-700" };
  return { label: "active", cls: "bg-blue-100 text-blue-700" };
}

function isAutoCompletedProject(row) {
  const target = Number(row?.targetAmount || 0);
  const raised = Number(row?.totalContributions || 0);
  if (!target || target <= 0) return false;
  return raised >= target;
}

function safeProjectsPayload(res) {
  const payload = res?.data?.data ?? res?.data;
  const data = payload?.data ?? payload;
  const list = data?.ChurchProject ?? data?.churchProject ?? data?.projects ?? payload?.ChurchProject;
  return Array.isArray(list) ? list : [];
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

function AddProjectModal({ open, onClose, onSuccess, disabled, currency }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setTargetAmount("");
    setDescription("");
    setError("");
    setSaving(false);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!String(name || "").trim()) {
      setError("Project name is required.");
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      setError("Target amount is required.");
      return;
    }

    if (!String(description || "").trim()) {
      setError("Description is required.");
      return;
    }

    const payload = {
      name: String(name).trim(),
      targetAmount: Number(targetAmount),
      description: String(description).trim(),
      status: "Active"
    };

    setSaving(true);
    try {
      await createChurchProject(payload);
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title="Add New Project"
      subtitle="Create a new church project or building fund"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div>
          <label className="block text-xs font-semibold text-gray-500">Project Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="e.g., New Church Building"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">{currency ? `Target Amount (${currency})` : "Target Amount"}</label>
          <input
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            type="number"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            placeholder="Project details"
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
            Add Project
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function ContributionModal({ open, onClose, project, disabled, onSuccess, currency }) {
  const [contributorName, setContributorName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContributorName("");
    setAmount("");
    setDate("");
    setNotes("");
    setError("");
    setSaving(false);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!project?._id) return;

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
      await createProjectContribution(project._id, {
        contributorName: String(contributorName).trim(),
        date,
        amount: Number(amount),
        notes: String(notes || "").trim().slice(0, 25)
      });
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title="Add Contribution"
      subtitle={project?.name ? `Record a contribution for ${project.name}` : "Record a contribution for this project"}
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
            Add Contribution
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function ExpenseModal({ open, onClose, project, disabled, onSuccess, currency }) {
  const [spentOn, setSpentOn] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSpentOn("");
    setAmount("");
    setDate("");
    setDescription("");
    setError("");
    setSaving(false);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!project?._id) return;

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
      await createProjectExpense(project._id, {
        spentOn: String(spentOn).trim(),
        date,
        amount: Number(amount),
        description: String(description || "").trim().slice(0, 25)
      });
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title="Record Expense"
      subtitle={project?.name ? `Record an expense for ${project.name}` : "Record an expense for this project"}
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
            Record Expense
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function ChurchProjectsPage() {
  const { toPage } = useDashboardNavigator();

  const churchCtx = useContext(ChurchContext);
  const currency = String(churchCtx?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const activeChurch = churchCtx?.activeChurch;
  const canEdit = activeChurch?._id ? activeChurch?.canEdit !== false : true;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);

  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(null);

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editProjectRow, setEditProjectRow] = useState(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getChurchProjects({ page: 1, limit: 50 });
      const rows = safeProjectsPayload(res);
      setProjects(
        rows.map((p) => {
          const s = String(p?.status || "").toLowerCase();
          if (s === "active" && isAutoCompletedProject(p)) return { ...p, status: "Completed" };
          return p;
        })
      );

      const toAutoComplete = rows.filter(
        (p) => String(p?.status || "").toLowerCase() === "active" && isAutoCompletedProject(p) && p?._id
      );
      if (toAutoComplete.length) {
        await Promise.all(
          toAutoComplete.map((p) =>
            updateChurchProject(p._id, { status: "Completed" }).catch(() => null)
          )
        );
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const rows = Array.isArray(projects) ? projects : [];
    const totalProjects = rows.length;

    const activeRows = rows.filter((p) => {
      const s = String(p?.status || "").toLowerCase();
      if (s !== "active") return false;
      if (isAutoCompletedProject(p)) return false;
      return true;
    });

    const activeCount = activeRows.length;
    const totalRaised = activeRows.reduce((sum, p) => sum + Number(p?.totalContributions || 0), 0);
    const totalTarget = activeRows.reduce((sum, p) => sum + Number(p?.targetAmount || 0), 0);
    const totalSpent = activeRows.reduce((sum, p) => sum + Number(p?.totalExpenses || 0), 0);
    return { totalProjects, activeCount, totalRaised, totalTarget, totalSpent };
  }, [projects]);

  const openContribution = (project) => {
    setActiveProject(project || null);
    setContributionOpen(true);
  };

  const openExpense = (project) => {
    setActiveProject(project || null);
    setExpenseOpen(true);
  };

  const viewDetails = (project) => {
    if (!project?._id) return;
    toPage("church-project-details", { id: project._id });
  };

  const openEdit = (project) => {
    setEditProjectRow(project || null);
    setEditProjectOpen(true);
  };

  const openDelete = (project) => {
    setConfirmDeleteRow(project || null);
    setConfirmDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDeleteRow?._id) return;
    try {
      await deleteChurchProject(confirmDeleteRow._id);
      setConfirmDeleteOpen(false);
      setConfirmDeleteRow(null);
      load();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Church Projects</div>
          <div className="mt-2 text-sm text-gray-600">Track building funds and special projects</div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setAddProjectOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              <span className="text-lg leading-none">+</span>
              Add Project
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Total Projects</div>
          <div className="mt-3 text-2xl font-semibold text-gray-900">{totals.totalProjects}</div>
          <div className="mt-2 text-xs text-gray-500">{totals.activeCount} active</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Total Raised</div>
          <div className="mt-3 text-2xl font-semibold text-green-700">{formatCurrency(totals.totalRaised, currency)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Total Target</div>
          <div className="mt-3 text-2xl font-semibold text-purple-700">{formatCurrency(totals.totalTarget, currency)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-xs font-semibold text-gray-500">Total Spent</div>
          <div className="mt-3 text-2xl font-semibold text-orange-600">{formatCurrency(totals.totalSpent, currency)}</div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {projects.map((p, idx) => {
            const raised = Number(p?.totalContributions || 0);
            const spent = Number(p?.totalExpenses || 0);
            const target = Number(p?.targetAmount || 0);
            const balance = raised - spent;
            const percent = target > 0 ? (raised / target) * 100 : 0;
            const badge = statusBadge(p?.status);

            return (
              <div key={p?._id ?? `p-${idx}`} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{p?.name || "—"}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Target: {formatCurrency(target, currency)} | Raised: {formatCurrency(raised, currency)} | Left: {formatCurrency(target - raised, currency)}
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div>Progress</div>
                    <div className="text-blue-700 font-semibold">{formatPercent(percent)}</div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-blue-700" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Amount Raised</div>
                    <div className="mt-1 text-sm font-semibold text-green-700">{formatCurrency(raised, currency)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Amount Spent</div>
                    <div className="mt-1 text-sm font-semibold text-orange-600">{formatCurrency(spent, currency)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Balance</div>
                    <div className="mt-1 text-sm font-semibold text-blue-900">{formatCurrency(balance, currency)}</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openContribution(p)}
                        className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        Add Contribution
                      </button>

                      <button
                        type="button"
                        onClick={() => openExpense(p)}
                        className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        Record Expense
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => viewDetails(p)}
                    className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    View
                  </button>

                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openDelete(p)}
                        className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddProjectModal
        open={addProjectOpen}
        disabled={!canEdit}
        currency={currency}
        onClose={() => setAddProjectOpen(false)}
        onSuccess={() => {
          setAddProjectOpen(false);
          load();
        }}
      />

      <ContributionModal
        open={contributionOpen}
        disabled={!canEdit}
        currency={currency}
        project={activeProject}
        onClose={() => {
          setContributionOpen(false);
          setActiveProject(null);
        }}
        onSuccess={() => {
          setContributionOpen(false);
          setActiveProject(null);
          load();
        }}
      />

      <ExpenseModal
        open={expenseOpen}
        disabled={!canEdit}
        currency={currency}
        project={activeProject}
        onClose={() => {
          setExpenseOpen(false);
          setActiveProject(null);
        }}
        onSuccess={() => {
          setExpenseOpen(false);
          setActiveProject(null);
          load();
        }}
      />

      <EditProjectModal
        open={editProjectOpen}
        initialData={editProjectRow}
        currency={currency}
        onClose={() => {
          setEditProjectOpen(false);
          setEditProjectRow(null);
        }}
        onSuccess={() => {
          setEditProjectOpen(false);
          setEditProjectRow(null);
          load();
        }}
      />

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title="Delete Project"
        message={`Are you sure you want to delete "${confirmDeleteRow?.name || "this project"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setConfirmDeleteRow(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function EditProjectModal({ open, onClose, onSuccess, initialData, currency }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(String(initialData?.name || ""));
    setTargetAmount(String(initialData?.targetAmount ?? ""));
    setDescription(String(initialData?.description || ""));
    setStatus(String(initialData?.status || "Active"));
    setError("");
    setSaving(false);
  }, [open, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const id = initialData?._id;
    if (!id) return;

    if (!String(name || "").trim()) {
      setError("Project name is required.");
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      setError("Target amount is required.");
      return;
    }

    if (!String(description || "").trim()) {
      setError("Description is required.");
      return;
    }

    const payload = {
      name: String(name).trim(),
      targetAmount: Number(targetAmount),
      description: String(description).trim(),
      status
    };

    setSaving(true);
    try {
      await updateChurchProject(id, payload);
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal open={open} title="Edit Project" subtitle="Update project details" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div>
          <label className="block text-xs font-semibold text-gray-500">Project Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="e.g., New Church Building"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">{currency ? `Target Amount (${currency})` : "Target Amount"}</label>
          <input
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            type="number"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            placeholder="Project details"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
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
            Save
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function ConfirmDeleteModal({ open, title, message, confirmLabel, onCancel, onConfirm }) {
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

export default ChurchProjectsPage;
