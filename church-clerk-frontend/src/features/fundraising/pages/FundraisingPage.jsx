import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import Skeleton from "react-loading-skeleton";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import { formatMoney, formatCompactMoney } from "../../../shared/utils/formatMoney.js";
import {
  createChurchProject,
  getChurchProjects,
  getChurchProjectsKPI,
  updateChurchProject
} from "../services/fundraising.api.js";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Card from "../../../shared/components/Card/index.jsx";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

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
  if (s === "completed") return { label: "Completed", cls: "bg-green-100 text-green-700" };
  if (s === "overdue") return { label: "Overdue", cls: "bg-red-100 text-red-700" };
  if (s === "in progress" || s === "active") return { label: "In Progress", cls: "bg-blue-100 text-blue-700" };
  return { label: "Not Started", cls: "bg-gray-100 text-gray-600" };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4 md:py-5 lg:py-6 px-4 md:px-6">
          <div>
            <div className="font-semibold text-gray-900 text-lg">{title}</div>
            {subtitle ? <div className="mt-1 text-gray-500 text-sm">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}

function AddProjectModal({ open, onClose, onSuccess, disabled, currency }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setTargetAmount("");
    setDescription("");
    setStartDate("");
    setDeadlineDate("");
    setError("");
    setIsSubmitting(false);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    if (!String(name || "").trim()) {
      setIsSubmitting(false);
      setError("Fundraiser name is required.");
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      setIsSubmitting(false);
      setError("Target amount is required.");
      return;
    }

    if (!String(description || "").trim()) {
      setIsSubmitting(false);
      setError("Description is required.");
      return;
    }

    const payload = {
      name: String(name).trim(),
      targetAmount: Number(targetAmount),
      description: String(description).trim(),
      ...(startDate ? { startDate } : {}),
      ...(deadlineDate ? { deadlineDate } : {})
    };

    try {
      await createChurchProject(payload);
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title="New Fundraiser"
      subtitle="Create a new fundraiser"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Fundraiser Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            placeholder="e.g., New Church Building"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">{currency ? `Target Amount (${currency})` : "Target Amount"}</label>
          <input
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            type="number"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
            placeholder="Fundraiser details"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Fundraiser Start Date</label>
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Fundraiser Deadline Date (optional)</label>
            <input
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            loadingText="Adding..."
            disabled={disabled}
            className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
          >
            Create Fundraiser
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}

function FundraisingPageInner() {
  const guarded = useGuardedAction();
  const { toPage } = useDashboardNavigator();

  const churchCtx = useContext(ChurchContext);
  const currency = String(churchCtx?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const activeChurch = churchCtx?.activeChurch;
  const canEdit = activeChurch?._id ? activeChurch?.canEdit !== false : true;

  const { can } = useContext(PermissionContext) || {};
  const canView = useMemo(() => (typeof can === "function" ? (can("churchProjects", "view") || can("pledges", "view")) : false), [can]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectsKpi, setProjectsKpi] = useState(null);

  const [searchValue, setSearchValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [addProjectOpen, setAddProjectOpen] = useState(false);

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editProjectRow, setEditProjectRow] = useState(null);

  const load = async (dateParams) => {
    setLoading(true);
    setError("");
    try {
      const params = { page: 1, limit: 50 };
      if (dateParams?.dateFrom) params.dateFrom = dateParams.dateFrom;
      if (dateParams?.dateTo) params.dateTo = dateParams.dateTo;
      const res = await getChurchProjects(params);
      const rows = safeProjectsPayload(res);
      setProjects(rows);

      setSearchValue("");
      setCurrentPage(1);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load fundraisers");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const loadKpi = useCallback(async () => {
    try {
      const res = await getChurchProjectsKPI();
      const payload = res?.data?.data ?? res?.data;
      setProjectsKpi(payload?.kpi || null);
    } catch {
      setProjectsKpi(null);
    }
  }, []);

  useEffect(() => {
    load();
    loadKpi();
  }, []);

  useEffect(() => {
    load({ dateFrom, dateTo });
  }, [dateFrom, dateTo]);

  const filteredProjects = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => String(p?.name || "").toLowerCase().includes(q));
  }, [projects, searchValue]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, currentPage]);

  const totals = useMemo(() => {
    const rows = Array.isArray(projects) ? projects : [];
    const totalProjects = rows.length;

    const activeRows = rows.filter((p) => String(p?.status || "").toLowerCase() !== "completed");

    const activeCount = activeRows.length;
    const totalRaised = activeRows.reduce((sum, p) => sum + Number(p?.totalContributions || 0), 0);
    const totalTarget = activeRows.reduce((sum, p) => sum + Number(p?.targetAmount || 0), 0);
    const totalSpent = activeRows.reduce((sum, p) => sum + Number(p?.totalExpenses || 0), 0);
    return { totalProjects, activeCount, totalRaised, totalTarget, totalSpent };
  }, [projects]);

  const viewDetails = (project) => {
    if (!project?._id) return;
    toPage("fundraising-details", { id: project._id });
  };

  const openEdit = (project) => {
    setEditProjectRow(project || null);
    setEditProjectOpen(true);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Fundraising</div>
          <div className="mt-2 text-gray-600 text-sm hidden md:block">Track fundraising campaigns, pledges and contributions</div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit ? (
            <button
              type="button"
              onClick={() => guarded(() => setAddProjectOpen(true))}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 md:px-5 lg:px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              New Fundraiser
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

      <KpiGrid className="mt-4 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Total Fundraisers"
          value={totals.totalProjects}
          change={projectsKpi?.change?.totalProjects}
          diff={projectsKpi?.diff?.totalProjects}
          compareLabel="last month"
          tooltip={`${totals.activeCount} of ${totals.totalProjects} fundraiser${totals.totalProjects !== 1 ? "s" : ""} currently active`}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Total Raised"
          value={formatCurrency(totals.totalRaised, currency)}
          change={projectsKpi?.change?.totalRaised}
          compareLabel="last month"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Total Target"
          value={formatCurrency(totals.totalTarget, currency)}
          change={projectsKpi?.change?.totalTarget}
          compareLabel="last month"
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          }
        />
        <KpiCard
          title="Total Spent"
          value={formatCurrency(totals.totalSpent, currency)}
          change={projectsKpi?.change?.totalSpent}
          compareLabel="last month"
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M3 8h18M3 8a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2v-8a2 2 0 00-2-2M3 8V6a2 2 0 012-2h14a2 2 0 012 2v2M12 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
      </KpiGrid>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Fundraisers</div>
            <div className="text-gray-500 text-xs">All fundraising campaigns</div>
          </div>
          <FilterBar
            searchValue={searchValue}
            onSearchChange={(v) => { setSearchValue(v); setCurrentPage(1); }}
            searchPlaceholder="Search fundraiser name..."
            searchWidth="md:w-[320px]"
            selects={[]}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); setCurrentPage(1); }}
          />
          <MobileFilterBar
            searchValue={searchValue}
            onSearchChange={(v) => { setSearchValue(v); setCurrentPage(1); }}
            searchPlaceholder="Search fundraiser name..."
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); setCurrentPage(1); }}
            resultCount={filteredProjects.length}
            getLiveCount={async () => {
              const q = searchValue.trim().toLowerCase();
              return projects.filter((p) => {
                if (q && !String(p?.name || "").toLowerCase().includes(q)) return false;
                return true;
              }).length;
            }}
            className="w-full"
          />
        </div>

        {loading ? (
          <div className="p-4 md:p-6 lg:p-8">
            <Skeleton height={14} count={6} />
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            illustration={String(searchValue || "").trim() ? "search" : "projects"}
            title={String(searchValue || "").trim() ? "No fundraisers found" : "No fundraisers yet"}
            description={String(searchValue || "").trim()
              ? "We couldn't find any fundraisers matching your search."
              : "Fundraisers will appear here once they're created."}
            actionLabel={String(searchValue || "").trim() ? "Clear Search" : null}
            onAction={String(searchValue || "").trim() ? () => { setSearchValue(""); setCurrentPage(1); } : undefined}
          />
        ) : (
          <div className="p-4 md:p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedProjects.map((p, idx) => {
            const raised = Number(p?.totalContributions || 0);
            const spent = Number(p?.totalExpenses || 0);
            const target = Number(p?.targetAmount || 0);
            const percent = target > 0 ? (raised / target) * 100 : 0;
            const badge = statusBadge(p?.status);

            return (
              <Card key={p?._id ?? `p-${idx}`}>
                <Card.Header
                  title={p?.name || "Not Specified"}
                  badge={badge.label}
                  badgeClass={badge.cls}
                  actions={
                    <>
                      {canEdit ? (
                        <button onClick={() => guarded(() => openEdit(p))} className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        </button>
                      ) : null}
                    </>
                  }
                />
                <div>
                  <div className="flex items-center justify-between text-gray-500 text-[11px]">
                    <div>{percent >= 100 ? "Completed" : "Progress"}</div>
                    <div className={`font-semibold ${percent >= 100 ? "text-green-700" : "text-blue-700"}`}>{formatPercent(percent)}</div>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full ${percent >= 100 ? "bg-green-600" : "bg-blue-700"}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100">
                  <div className="pr-3">
                    <div className="font-semibold text-gray-500 text-[11px]">Target</div>
                    <div className="mt-0.5 font-semibold text-blue-900 text-xs">{formatCompactMoney(target, currency)}</div>
                  </div>
                  <div className="px-3">
                    <div className="font-semibold text-gray-500 text-[11px]">Raised</div>
                    <div className="mt-0.5 font-semibold text-green-700 text-xs">{formatCompactMoney(raised, currency)}</div>
                  </div>
                  <div className="pl-3">
                    <div className="font-semibold text-gray-500 text-[11px]">Spent</div>
                    <div className="mt-0.5 font-semibold text-orange-600 text-xs">{formatCompactMoney(spent, currency)}</div>
                  </div>
                </div>
                <Card.Footer>
                  <div className="flex items-center justify-end">
                    {canView ? <Card.ViewDetailsLink onClick={() => viewDetails(p)} /> : null}
                  </div>
                </Card.Footer>
              </Card>
            );
          })}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Prev
              </button>
              <div className="text-gray-600 text-sm">Page {currentPage} of {totalPages}</div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

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

    </div>
  );
}

function EditProjectModal({ open, onClose, onSuccess, initialData, currency }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(String(initialData?.name || ""));
    setTargetAmount(String(initialData?.targetAmount ?? ""));
    setDescription(String(initialData?.description || ""));
    setStartDate(String(initialData?.startDate || "").slice(0, 10));
    setDeadlineDate(String(initialData?.deadlineDate || "").slice(0, 10));
    setError("");
    setIsSubmitting(false);
  }, [open, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    const id = initialData?._id;
    if (!id) { setIsSubmitting(false); return; }

    if (!String(name || "").trim()) {
      setIsSubmitting(false);
      setError("Fundraiser name is required.");
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      setIsSubmitting(false);
      setError("Target amount is required.");
      return;
    }

    if (!String(description || "").trim()) {
      setIsSubmitting(false);
      setError("Description is required.");
      return;
    }

    const payload = {
      name: String(name).trim(),
      targetAmount: Number(targetAmount),
      description: String(description).trim(),
      ...(startDate ? { startDate } : {}),
      deadlineDate: deadlineDate || null
    };

    try {
      await updateChurchProject(id, payload);
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <BaseModal open={open} title="Edit Fundraiser" subtitle="Update fundraiser details" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        ) : null}

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Fundraiser Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            placeholder="e.g., New Church Building"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">{currency ? `Target Amount (${currency})` : "Target Amount"}</label>
          <input
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            type="number"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
            placeholder="Fundraiser details"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Fundraiser Start Date</label>
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Fundraiser Deadline Date (optional)</label>
            <input
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            loadingText="Saving..."
            className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
          >
            Save
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}

function FundraisingPage() {
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function"
    ? (can("churchProjects", "view") || can("pledges", "view"))
    : false), [can]);

  if (!canRead) {
    return (
      <div className="max-w-6xl">
        <div className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Fundraising</div>
        <p className="mt-2 text-gray-600 text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }

  return <FundraisingPageInner />;
}

export default FundraisingPage;
