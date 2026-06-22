import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApprovals, approveRequest, rejectRequest } from "../services/governance.api.js";

const STATUS_LABELS = {
  PENDING_APPROVAL: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700" }
};

const ACTION_LABELS = {
  BACKDATE_CREATE: "Backdated Entry",
  ADJUSTMENT_HIGH_IMPACT: "Record Correction"
};

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function RejectModal({ open, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim());
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 font-semibold text-gray-900 text-base">Reject Request</div>
        <div className="mb-4 text-sm text-gray-500">Provide a reason for rejection (optional).</div>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-[80px]"
          placeholder="Reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => { setReason(""); onClose(); }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAYLOAD_SKIP_KEYS = new Set(["_id", "__v", "church", "createdBy", "updatedAt", "createdAt", "__t", "originalId", "originalSnapshot"]);

function formatFieldName(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function formatValue(val) {
  if (val === undefined || val === null) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return val.toLocaleString();
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) || (/^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)))) {
    return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  return s;
}

function isPrimitive(v) {
  if (v === null) return true;
  const t = typeof v;
  return t === "string" || t === "number" || t === "boolean";
}

function PayloadPreview({ payload, actionType }) {
  if (!payload) return null;

  if (actionType === "BACKDATE_CREATE") {
    const body = payload.fullBody || {};
    const displayDate = payload.date
      ? new Date(payload.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "—";
    const extraKeys = Object.keys(body).filter(
      (k) => !PAYLOAD_SKIP_KEYS.has(k) && k !== "serviceDate" && k !== "date" && isPrimitive(body[k])
    );
    return (
      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
          New record — a new entry will be created with the backdated date below. No existing record is modified.
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="w-24 shrink-0 font-semibold text-gray-500">Entry Date</span>
            <span className="font-bold text-blue-700">{displayDate}</span>
          </div>
          {extraKeys.slice(0, 6).map((k) => (
            <div key={k} className="flex items-baseline gap-2">
              <span className="w-24 shrink-0 font-semibold text-gray-500">{formatFieldName(k)}</span>
              <span className="text-gray-800">{formatValue(body[k])}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (actionType === "ADJUSTMENT_HIGH_IMPACT") {
    const original = payload.originalSnapshot || {};
    const patch = payload.patch || {};
    const keys = Object.keys(patch).filter((k) => !PAYLOAD_SKIP_KEYS.has(k) && isPrimitive(patch[k]));
    if (!keys.length) return null;
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
          Field correction — changes to an existing record. Review each field below before approving.
        </div>
        <div className="space-y-0">
          <div className="grid grid-cols-3 gap-x-3 pb-1 mb-1 border-b border-amber-200">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Field</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-red-400">Before</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-green-600">After</div>
          </div>
          {keys.map((k) => (
            <div key={k} className="grid grid-cols-3 gap-x-3 py-1 border-b border-amber-100 last:border-0">
              <div className="font-semibold text-gray-600">{formatFieldName(k)}</div>
              <div className="text-red-500 line-through">{formatValue(original[k])}</div>
              <div className="text-green-700 font-bold">{formatValue(patch[k])}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const body = payload.fullBody || payload;
  if (typeof body !== "object" || !body) return null;
  const keys = Object.keys(body).filter((k) => !PAYLOAD_SKIP_KEYS.has(k) && isPrimitive(body[k]));
  if (!keys.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
      {keys.slice(0, 4).map((k) => (
        <span key={k}>
          <span className="font-medium text-gray-600">{formatFieldName(k)}:</span> {formatValue(body[k])}
        </span>
      ))}
    </div>
  );
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("PENDING_APPROVAL");
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);

  const approvalsQuery = useQuery({
    queryKey: ["church-governance", statusFilter, page],
    queryFn: () => getApprovals({ status: statusFilter || undefined, page, limit: 20 }).then((r) => r.data),
    placeholderData: (prev) => prev
  });

  const approveMutation = useMutation({
    mutationFn: (id) => approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-governance"] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectRequest(id, reason),
    onSuccess: () => {
      setRejectTarget(null);
      queryClient.invalidateQueries({ queryKey: ["church-governance"] });
    }
  });

  const rows = approvalsQuery.data?.approvals || [];
  const pagination = approvalsQuery.data?.pagination || {};

  const handleApprove = useCallback((id) => {
    approveMutation.mutate(id);
  }, [approveMutation]);

  const handleRejectConfirm = useCallback((reason) => {
    if (!rejectTarget) return;
    rejectMutation.mutate({ id: rejectTarget, reason });
  }, [rejectTarget, rejectMutation]);

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-gray-900 text-xl md:text-2xl lg:text-4xl">Approval Requests</h2>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 md:h-11"
        >
          <option value="PENDING_APPROVAL">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {approvalsQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <svg viewBox="0 0 24 24" fill="none" className="mb-3 h-12 w-12 text-gray-300">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 3v6M9 9l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="font-semibold text-gray-500 text-sm">No {statusFilter === "PENDING_APPROVAL" ? "pending" : ""} approval requests</div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isActing = approveMutation.isPending && approveMutation.variables === row._id;
            const name = row.requestedBy?.fullName || row.requestedBy?.email || "Unknown";
            const actionLabel = ACTION_LABELS[row.actionType] || row.actionType;
            const module = row.module ? `${row.module} / ${row.entityType}` : "—";
            const date = row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

            return (
              <div key={row._id} className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{actionLabel}</span>
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Module:</span> {module}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Requested by:</span> {name} &middot; {date}
                    </div>
                    {row.reason ? (
                      <div className="mt-1 text-xs text-gray-500">
                        <span className="font-medium text-gray-600">Reason:</span> {row.reason}
                      </div>
                    ) : null}
                    <PayloadPreview payload={row.payload} actionType={row.actionType} />
                    {row.status === "REJECTED" && row.approverId ? (
                      <div className="mt-1 text-xs text-red-500">Rejected on {row.decidedAt ? new Date(row.decidedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
                    ) : null}
                  </div>

                  {row.status === "PENDING_APPROVAL" ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(row._id)}
                        disabled={isActing || approveMutation.isPending}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isActing ? "Approving..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectTarget(row._id)}
                        disabled={isActing || rejectMutation.isPending}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
          <div className="text-xs text-gray-400">
            {pagination.total
              ? `${((page - 1) * 20) + 1}–${Math.min(page * 20, pagination.total)} of ${pagination.total} request${pagination.total !== 1 ? "s" : ""}`
              : `Page ${page}`}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 font-semibold hover:bg-gray-50 disabled:opacity-30 text-xs"
              title="First page"
            >
              «
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold hover:bg-gray-50 disabled:opacity-30 text-xs"
            >
              Previous
            </button>
            {Array.from({ length: pagination.totalPages || 1 }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === (pagination.totalPages || 1) || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`rounded-lg border px-3 py-1.5 font-semibold text-xs ${
                      p === page
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              type="button"
              disabled={page >= (pagination.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold hover:bg-gray-50 disabled:opacity-30 text-xs"
            >
              Next
            </button>
            <button
              type="button"
              disabled={page >= (pagination.totalPages || 1)}
              onClick={() => setPage(pagination.totalPages || 1)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 font-semibold hover:bg-gray-50 disabled:opacity-30 text-xs"
              title="Last page"
            >
              »
            </button>
          </div>
        </div>
      ) : null}

      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        loading={rejectMutation.isPending}
      />
    </div>
  );
}
