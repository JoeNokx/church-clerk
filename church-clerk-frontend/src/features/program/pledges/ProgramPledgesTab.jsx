import { useContext, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import ChurchContext from "../../church/church.store.js";
import PermissionContext from "../../permissions/permission.store.js";
import { getPledges, updatePledge } from "../../pledge/services/pledge.api.js";
import { createPledgePayment } from "../../pledge/payments/services/pledgePayments.api.js";
import EditPledgeModal from "../../pledge/components/EditPledgeModal.jsx";
import CreatePledgeModal from "../../pledge/components/CreatePledgeModal.jsx";
import PledgeDetailsModal, { PaymentFormModal } from "../../pledge/components/PledgeDetailsModal.jsx";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { resolveEmptyReason, buildRecoveryActions } from "../../../shared/utils/emptyState.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return { label: "Completed", cls: "bg-green-100 text-green-700" };
  if (s === "overdue") return { label: "Overdue", cls: "bg-red-100 text-red-700" };
  if (s === "in progress" || s === "active") return { label: "In Progress", cls: "bg-blue-100 text-blue-700" };
  return { label: "Not Started", cls: "bg-gray-100 text-gray-600" };
}

const PLEDGE_STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Not Started", value: "not started" },
  { label: "In Progress", value: "in progress" },
  { label: "Completed", value: "completed" },
  { label: "Overdue", value: "overdue" }
];

function ProgramPledgesTab({ programId, programTitle }) {
  const guarded = useGuardedAction();
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const canWrite = churchStore?.activeChurch?._id ? churchStore?.activeChurch?.canEdit !== false : true;
  const { can } = useContext(PermissionContext) || {};
  const canCreate = useMemo(() => (typeof can === "function" ? can("pledges", "create") : true), [can]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pledgeStatus, setPledgeStatus] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editPledgeRow, setEditPledgeRow] = useState(null);
  const [pledgeModal, setPledgeModal] = useState(null); // { id, view: "details" | "payments" }
  const [payPledge, setPayPledge] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const loadPledges = async (nextPage) => {
    if (!programId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getPledges({
        page: nextPage,
        limit: 10,
        search: String(debouncedSearch || "").trim(),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: pledgeStatus || undefined,
        event: programId
      });
      const payload = res?.data?.data ?? res?.data;
      setRows(Array.isArray(payload?.pledges) ? payload.pledges : []);
      setPagination(payload?.pagination || null);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load pledges");
      setRows([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPledges(page);
  }, [programId, page, debouncedSearch, dateFrom, dateTo, pledgeStatus]);

  const reload = async () => loadPledges(page);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold text-gray-900 text-sm">Pledges</div>
          <div className="text-gray-500 text-xs">Pledges made toward this program</div>
        </div>
        <FilterBar
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search name or phone"
          searchWidth="md:w-[160px]"
          selects={[
            {
              key: "pledgeStatus",
              value: pledgeStatus,
              onChange: (v) => { setPledgeStatus(v); setPage(1); },
              options: PLEDGE_STATUS_OPTIONS.filter((o) => o.value !== ""),
              placeholder: "Pledge Status"
            }
          ]}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
        >
          {canWrite && canCreate ? (
            <button
              type="button"
              onClick={() => guarded(() => setCreateOpen(true))}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 text-sm h-10"
            >
              <span className="leading-none text-lg">+</span>
              Add Pledge
            </button>
          ) : null}
        </FilterBar>
        <MobileFilterBar
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search name or phone"
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
          filters={[
            { key: "pledgeStatus", label: "Pledge Status", value: pledgeStatus, defaultValue: "", options: PLEDGE_STATUS_OPTIONS }
          ]}
          onApply={(pending) => {
            setPledgeStatus(pending?.pledgeStatus || "");
            setPage(1);
          }}
          resultCount={pagination?.totalResult ?? null}
          getLiveCount={async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
            try {
              const res = await getPledges({
                page: 1,
                limit: 1,
                search,
                dateFrom: dFrom || undefined,
                dateTo: dTo || undefined,
                status: f?.pledgeStatus || undefined,
                event: programId
              });
              const payload = res?.data?.data ?? res?.data;
              return payload?.pagination?.totalResult ?? null;
            } catch { return null; }
          }}
        />
      </div>

      <div>
        {loading ? (
          <div className="p-4 md:p-6 lg:p-8">
            <Skeleton height={14} count={6} />
          </div>
        ) : null}
        {error ? (
          <div className="p-4 md:p-6 lg:p-8">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
          </div>
        ) : null}

        {!loading && !error ? (
          rows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Name</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Phone</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Pledged</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Paid</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Balance</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date Pledged</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Deadline</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Ref ID</th>
                    <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, idx) => {
                    const badge = statusBadge(row?.status);
                    return (
                      <tr key={row?._id ?? `p-${idx}`} className="max-md:text-xs text-gray-700 text-sm">
                        <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={row?.name || "—"}>
                          <span className="sm:hidden">{truncateMobileName(row?.name)}</span>
                          <span className="hidden sm:inline">{truncateDesktopName(row?.name)}</span>
                        </td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{row?.phoneNumber || "—"}</td>
                        <td className="max-md:px-4 py-1.5 text-purple-700 whitespace-nowrap px-4 md:px-6">{formatMoney(row?.amount || 0, currency)}</td>
                        <td className="max-md:px-4 py-1.5 text-green-700 whitespace-nowrap px-4 md:px-6">{formatMoney(row?.totalPaid || 0, currency)}</td>
                        <td className="max-md:px-4 py-1.5 text-orange-600 whitespace-nowrap px-4 md:px-6">{formatMoney(row?.remainingBalance || 0, currency)}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-xs ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.pledgeDate)}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.deadline)}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                          {row?.referenceId ? (
                            <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{row.referenceId}</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                          <TableKebabMenu items={[
                            { label: "View", onClick: () => setPledgeModal({ id: row._id, view: "details" }), desktopClassName: "rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-xs" },
                            { label: "Pay", onClick: () => guarded(() => setPayPledge(row)), desktopClassName: "rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-xs" },
                            { label: "Edit", onClick: () => guarded(() => setEditPledgeRow(row)), desktopClassName: "rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-xs" }
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            (() => {
              const reason = resolveEmptyReason({ search, dateFrom, dateTo, filters: { pledgeStatus }, filterDefaults: { pledgeStatus: "" } });
              const isZero = reason === "zero";
              const recovery = buildRecoveryActions(reason, {
                onClearSearch: () => { setSearch(""); setPage(1); },
                onClearDate: () => { setDateFrom(""); setDateTo(""); setPage(1); },
                onClearFilters: () => { setPledgeStatus(""); setPage(1); }
              });
              return (
                <EmptyState
                  compact
                  illustration={isZero ? "contributions" : "search"}
                  title={isZero ? "No pledges yet" : "No pledges found"}
                  description={isZero
                    ? "Pledges made toward this program will appear here."
                    : "We couldn't find any pledges matching your search or filters."}
                  actionLabel={recovery?.actionLabel}
                  onAction={recovery?.onAction}
                  secondaryLabel={recovery?.secondaryLabel}
                  onSecondary={recovery?.onSecondary}
                />
              );
            })()
          )
        ) : null}

        <div className="flex items-center justify-end gap-3 max-md:px-4 py-3 px-4 md:px-6">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination?.hasPrev}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
          >
            Prev
          </button>
          <div className="text-gray-600 text-sm">Page {pagination?.currentPage || 1}</div>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination?.hasNext}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      </div>

      <CreatePledgeModal
        open={createOpen}
        scope={{ event: programId }}
        disabled={!canWrite}
        subtitle={programTitle ? `Record a pledge for ${programTitle}` : "Record a pledge for this program"}
        onClose={() => setCreateOpen(false)}
        onSuccess={async () => {
          setCreateOpen(false);
          await reload();
        }}
      />

      <EditPledgeModal
        open={Boolean(editPledgeRow)}
        initialData={editPledgeRow}
        onClose={() => setEditPledgeRow(null)}
        onSubmit={async (payload) => {
          if (!editPledgeRow?._id) return;
          await updatePledge(editPledgeRow._id, payload);
          await reload();
        }}
      />

      <PaymentFormModal
        open={Boolean(payPledge)}
        mode="create"
        initialData={null}
        onClose={() => setPayPledge(null)}
        onSubmit={async (payload) => {
          if (!payPledge?._id) return;
          await createPledgePayment(payPledge._id, payload);
          await reload();
        }}
      />

      <PledgeDetailsModal
        open={Boolean(pledgeModal)}
        pledgeId={pledgeModal?.id}
        view={pledgeModal?.view}
        onClose={() => setPledgeModal(null)}
        onChanged={async () => { await reload(); }}
      />
    </div>
  );
}

export default ProgramPledgesTab;
