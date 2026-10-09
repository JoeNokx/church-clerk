import { Fragment, useContext, useEffect, useMemo, useRef, useState } from "react";
import Spinner from "../../../shared/components/Spinner.jsx";
import PermissionContext from "../../permissions/permission.store.js";
import { useAuth } from "../../auth/useAuth.js";
import ChurchContext from "../../church/church.store.js";
import { getAdminConfiguredRate } from "../../../shared/utils/fx.js";
import { requestMyChurchSenderId } from "../../church/services/church.api.js";
import { getGroups } from "../../group/services/group.api.js";
import { getCells } from "../../cell/services/cell.api.js";
import { getDepartments } from "../../department/services/department.api.js";
import { getMinistries } from "../../ministry/services/ministry.api.js";
import { getPrograms } from "../../program/services/program.api.js";
import { getOutreachEvents } from "../../outreach/services/outreach.api.js";
import Select from "react-select";
import { getMembers } from "../../member/services/member.api.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import {
  createCommunicationMessage,
  fundWalletInitiate,
  fundWalletVerify,
  getWallet,
  getWalletTransactions,
  getCommunicationMessages,
  getMessageDeliveryReport,
  estimateMessageCost,
  updateCommunicationMessage,
  deleteCommunicationMessage,
  cancelCommunicationMessage,
  resendFailedDelivery,
  createMessageTemplate,
  deleteMessageTemplate,
  getMessageTemplates,
  updateMessageTemplate
} from "../services/communication.api.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction, useSubscriptionLock } from "../../../shared/context/SubscriptionLockContext.jsx";

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
        aria-label="More info"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm.75 14.5h-1.5v-6h1.5v6zm0-7.5h-1.5V7.5h1.5V9z" />
        </svg>
      </button>
      <div
        role="tooltip"
        className={`absolute top-full left-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 leading-relaxed text-gray-500 shadow-lg transition-opacity ${open ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 pointer-events-none"}`}
        style={{ fontSize: "11px" }}
      >
        <div className="absolute bottom-full left-3 border-4 border-transparent border-b-gray-200" />
        {text}
      </div>
    </div>
  );
}

function formatMoneyGhs(amount) {
  const n = Number(amount || 0);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoneyUsd(amount) {
  const n = Number(amount || 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `$${safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SenderIdWarningModal({
  open,
  onClose,
  onContinue,
  onRequest,
  loading,
  error,
  senderIdCurrent,
  senderIdStatus,
  remember,
  onRememberChange
}) {
  if (!open) return null;

  const status = String(senderIdStatus || "none").trim().toLowerCase();
  const requested = String(senderIdCurrent || "").trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Sender ID not approved</div>
            <div className="mt-1 text-gray-500 text-xs">
              You can still send with the default sender ID (CHURCHCLERK), or request approval for your custom Sender ID.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
          >
            Close
          </button>
        </div>

        <div className="px-4 md:px-5 lg:px-6 py-4">
          {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="font-semibold text-gray-500 text-xs">Current Sender ID status</div>
            <div className="mt-1 font-semibold text-gray-900 text-sm">
              {status === "pending" ? "Pending: Under review" : status === "rejected" ? "Rejected" : "Not requested"}
            </div>
            <div className="mt-1 text-gray-500 text-xs">Requested Sender ID: {requested || "—"}</div>
            <div className="mt-2 text-gray-600 text-xs">Your members will see your sender ID as: CHURCHCLERK</div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-gray-600 text-xs">
            <input
              type="checkbox"
              checked={Boolean(remember)}
              onChange={(e) => onRememberChange?.(e.target.checked)}
              id="remember-sender-warning"
              disabled={loading}
            />
            <label htmlFor="remember-sender-warning">Don&apos;t show this again (this session)</label>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={onRequest}
              disabled={loading}
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60 text-sm"
            >
              {loading ? "Requesting..." : status === "pending" ? "Resubmit Request" : "Request Sender ID"}
            </button>
            <button
              type="button"
              onClick={onContinue}
              disabled={loading}
              className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60 text-sm"
            >
              Continue with Default Sender (CHURCHCLERK)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplatesAndDraftsTab({ open, onUseTemplate, onUseDraft, onOpenDeliveryReport, onWalletUpdated }) {
  const [subTab, setSubTab] = useState("templates");

  useEffect(() => {
    if (!open) return;
    setSubTab("templates");
  }, [open]);

  if (!open) return null;

  return (
    <div className="mt-5">
      <PageTabs
        tabs={[
          { key: "templates", label: "Templates" },
          { key: "drafts", label: "Drafts" },
        ]}
        activeTab={subTab}
        onChange={setSubTab}
        sticky={false}
      />

      {subTab === "templates" ? (
        <TemplatesTab open={open} onUseTemplate={onUseTemplate} />
      ) : (
        <DraftsTable open={open} onUseDraft={onUseDraft} onWalletUpdated={onWalletUpdated} />
      )}
    </div>
  );
}

function formatInt(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return String(Math.trunc(n));
}

function creditsToGhs(credits) {
  return Number(credits || 0) / 100;
}

function ghsToCredits(ghs) {
  const n = Number(ghs || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function toScheduleParts(dateValue) {
  if (!dateValue) return { scheduledDate: "", scheduledTime: "" };
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return { scheduledDate: "", scheduledTime: "" };
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { scheduledDate: `${yyyy}-${mm}-${dd}`, scheduledTime: `${hh}:${mi}` };
}


function WalletCard({ wallet, allowance, onFund, onViewHistory, isGhana, usdToGhs }) {
  const balanceCredits = Number(wallet?.balanceCredits || 0);
  const balanceGhs = creditsToGhs(balanceCredits);
  const balanceUsd = (!isGhana && usdToGhs) ? balanceGhs / Number(usdToGhs) : null;

  const includedRemaining = Number(allowance?.remainingIncludedCredits || 0);
  const includedGranted = Number(allowance?.grantedCredits || 0);
  const includedUsed = Number(allowance?.usedCredits || 0);
  const totalAvailable = balanceCredits + includedRemaining;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold text-gray-500 text-xs">Total Available Credits</div>
          <div className="mt-2 font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">{formatInt(totalAvailable)}</div>
          <div className="mt-1 text-gray-500 text-xs">
            {formatInt(includedRemaining)} subscription + {formatInt(balanceCredits)} top-up
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onFund}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 text-sm"
          >
            Fund Wallet
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Subscription credits bar */}
        <div className="rounded-lg border border-gray-100 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-gray-600">Subscription Credits</span>
            <span className="text-gray-500">
              {formatInt(includedRemaining)} / {formatInt(includedGranted)} left
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${includedGranted > 0 ? Math.min(100, Math.round((includedRemaining / includedGranted) * 100)) : 0}%` }}
            />
          </div>
          <div className="mt-1 text-gray-500 text-xs">
            {formatInt(includedUsed)} used — resets next billing period
          </div>
        </div>

        {/* Top-up credits bar */}
        <div className="rounded-lg border border-gray-100 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-gray-600">Top-up Credits</span>
            <span className="text-gray-500">
              {formatInt(balanceCredits)} left
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-green-600"
              style={{ width: `${totalAvailable > 0 ? Math.min(100, Math.round((balanceCredits / totalAvailable) * 100)) : 0}%` }}
            />
          </div>
          <div className="mt-1 text-gray-500 text-xs">
            Persists across billing periods
          </div>
        </div>
      </div>
    </div>
  );
}

function FundWalletModal({ open, onClose, onFund, loading, error, isGhana, usdToGhs }) {
  const useUsd = !isGhana && Boolean(usdToGhs);
  const usdRate = Number(usdToGhs || 1);

  const [amount, setAmount] = useState(useUsd ? 10 : 50);

  useEffect(() => {
    if (!open) return;
    setAmount(useUsd ? 10 : 50);
  }, [open, useUsd]);

  if (!open) return null;

  const presets = useUsd ? [5, 10, 20] : [50, 100, 200];
  const minAmount = useUsd ? Number((10 / usdRate).toFixed(2)) : 10;
  const amountNum = Number(amount || 0);
  const amountOk = Number.isFinite(amountNum) && amountNum >= minAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Fund Wallet</div>
            <div className="mt-1 text-gray-500 text-xs">Payment processed in GHS via Paystack</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
          >
            Close
          </button>
        </div>

        <div className="px-4 md:px-5 lg:px-6 py-4">
          {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

          <div className="font-semibold text-gray-600 text-xs">
            {useUsd ? "Amount to deposit (USD)" : "Amount to deposit (GHS)"}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                disabled={loading}
                className={`rounded-lg border px-3 py-2 font-semibold disabled:opacity-60 ${Number(amount) === p ? "border-blue-200 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"} text-sm`}
              >
                {useUsd ? formatMoneyUsd(p) : `₵${p}`}
              </button>
            ))}
            <div className="flex items-center gap-2">
              <div className="font-semibold text-gray-700 text-sm">Custom:</div>
              <input
                value={String(amount ?? "")}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 w-28 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder={useUsd ? "USD" : "GHS"}
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="mt-2 text-gray-500 text-xs">
            Minimum deposit: {useUsd ? formatMoneyUsd(minAmount) : `₵${minAmount}`}
          </div>
          {!amountOk ? <div className="mt-2 font-semibold text-red-600 text-xs">Enter at least {useUsd ? formatMoneyUsd(minAmount) : `₵${minAmount}`} to proceed.</div> : null}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onFund(useUsd ? amountNum * usdRate : amountNum)}
              disabled={loading || !amountOk}
              className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60 text-sm"
            >
              {loading ? "Processing..." : "Proceed to Pay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTxType(type) {
  const t = String(type || "").toLowerCase();
  if (t === "fund") return "Top-up";
  if (t === "deduct") return "Deduction";
  if (t === "refund") return "Refund";
  if (t === "adjust") return "Adjustment";
  return t ? (t.charAt(0).toUpperCase() + t.slice(1)) : "—";
}

function WalletHistoryTab({ open, transactions, loading, error, onReload, isGhana, usdToGhs }) {
  const [viewTx, setViewTx] = useState(null);

  if (!open) return null;

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 md:px-5 lg:px-6 py-4">
        <div>
          <div className="font-semibold text-gray-900 text-sm">Wallet History</div>
          <div className="mt-1 text-gray-500 text-xs">All wallet transactions and credit deductions.</div>
        </div>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="p-4 md:p-6 lg:p-8">
        {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left font-semibold text-gray-500 text-xs">
                <th className="sticky left-0 z-20 bg-white py-2 pr-4 whitespace-nowrap">Transaction Date</th>
                <th className="py-2 pr-4 whitespace-nowrap">Type</th>
                <th className="py-2 pr-4 whitespace-nowrap">Amount</th>
                <th className="py-2 whitespace-nowrap">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center"><Spinner className="mx-auto text-gray-400" /></td>
                </tr>
              ) : !transactions.length ? (
                <tr>
                  <td colSpan={4} className="px-4">
                    <EmptyState compact illustration="wallet" title="No wallet transactions yet" description="Top up your wallet to start sending announcements." />
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr key={t?._id || `tx-${idx}`} className="text-gray-700 text-sm cursor-pointer hover:bg-gray-50" onClick={() => setViewTx(t)}>
                    <td className="sticky left-0 z-10 bg-white py-2 pr-4 text-gray-600 whitespace-nowrap">{t?.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{formatTxType(t?.type)}</td>
                    <td className="py-2 pr-4 font-semibold whitespace-nowrap">
                      {typeof t?.amountCredits === "number" ? (
                        !isGhana && usdToGhs
                          ? `${t.amountCredits >= 0 ? "+" : ""}${formatMoneyUsd(creditsToGhs(t.amountCredits) / Number(usdToGhs))}`
                          : `${t.amountCredits >= 0 ? "+" : "-"}${Math.abs(t.amountCredits)} credits`
                      ) : "—"}
                    </td>
                    <td className="py-2 font-semibold text-gray-900">
                      {typeof t?.balanceAfterCredits === "number" ? (
                        !isGhana && usdToGhs
                          ? formatMoneyUsd(creditsToGhs(t.balanceAfterCredits) / Number(usdToGhs))
                          : `${t.balanceAfterCredits} credits`
                      ) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewTx ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto" onClick={() => setViewTx(null)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Transaction Details</div>
              <button
                type="button"
                onClick={() => setViewTx(null)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="px-4 md:px-5 lg:px-6 py-4 space-y-3 text-sm">
              <div>
                <div className="font-semibold text-gray-500 text-xs">Transaction Date</div>
                <div className="mt-0.5 text-gray-800">{viewTx?.createdAt ? new Date(viewTx.createdAt).toLocaleString() : "—"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Type</div>
                <div className="mt-0.5 text-gray-800">{formatTxType(viewTx?.type)}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Description</div>
                <div className="mt-0.5 text-gray-800 whitespace-pre-wrap">{viewTx?.description || "—"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Amount</div>
                <div className="mt-0.5 text-gray-800 font-semibold">
                  {typeof viewTx?.amountCredits === "number" ? (
                    !isGhana && usdToGhs
                      ? `${viewTx.amountCredits >= 0 ? "+" : ""}${formatMoneyUsd(creditsToGhs(viewTx.amountCredits) / Number(usdToGhs))}`
                      : `${viewTx.amountCredits >= 0 ? "+" : "-"}${Math.abs(viewTx.amountCredits)} credits`
                  ) : "—"}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Balance After</div>
                <div className="mt-0.5 text-gray-800 font-semibold">
                  {typeof viewTx?.balanceAfterCredits === "number" ? (
                    !isGhana && usdToGhs
                      ? formatMoneyUsd(creditsToGhs(viewTx.balanceAfterCredits) / Number(usdToGhs))
                      : `${viewTx.balanceAfterCredits} credits`
                  ) : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TemplatesTab({ open, onUseTemplate }) {
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("announcements", "read") : true), [can]);
  const canWrite = useMemo(() => (typeof can === "function" ? can("announcements", "create") : true), [can]);
  const { isLocked } = useSubscriptionLock();
  const guarded = useGuardedAction();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const [editId, setEditId] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("sms");
  const [message, setMessage] = useState("");
  const [viewRow, setViewRow] = useState(null);

  const load = async () => {
    if (!canRead) {
      setRows([]);
      setError("You do not have permission to view templates");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getMessageTemplates();
      setRows(Array.isArray(res?.data?.templates) ? res.data.templates : []);
    } catch (e) {
      setRows([]);
      setError(e?.response?.data?.message || e?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, canRead]);

  const resetForm = () => {
    setEditId("");
    setName("");
    setChannel("sms");
    setMessage("");
  };

  const onEdit = (t) => {
    setEditId(t?._id || "");
    setName(t?.name || "");
    setChannel(t?.channel || "sms");
    setMessage(t?.message || "");
  };

  const onSave = async () => {
    if (!canWrite) return;
    setError("");
    setLoading(true);
    try {
      if (editId) {
        await updateMessageTemplate(editId, { name, channel: "sms", message });
      } else {
        await createMessageTemplate({ name, channel: "sms", message });
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id) => {
    if (!id) return;
    setError("");
    setLoading(true);
    try {
      await deleteMessageTemplate(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete template");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mt-5">
      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
        <div className="font-semibold text-gray-900 text-sm">Templates</div>

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

        <fieldset disabled={isLocked} className="m-0 mt-4 grid min-w-0 grid-cols-1 gap-3 border-0 p-0">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            disabled={loading || !canWrite}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            disabled={loading || !canWrite}
            className="min-h-[120px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
          />
        </fieldset>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            disabled={loading || !canWrite}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => guarded(onSave)}
            disabled={loading || !canWrite}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60 text-sm"
          >
            {loading ? "Saving..." : editId ? "Update Template" : "Create Template"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between">
          <div className="font-semibold text-gray-900 text-sm">Saved Templates</div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
          >
            Refresh
          </button>
        </div>
        <div className="p-4 overflow-x-auto md:p-6 lg:p-8">
          <table className="min-w-full">
            <thead>
              <tr className="text-left font-semibold text-gray-500 text-xs">
                <th className="sticky left-0 z-20 bg-white py-2 pr-4 whitespace-nowrap">Template Name</th>
                <th className="py-2 pr-4 whitespace-nowrap">Message</th>
                <th className="py-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center"><Spinner className="mx-auto text-gray-400" /></td>
                </tr>
              ) : !rows.length ? (
                <tr>
                  <td colSpan={3} className="px-4">
                    <EmptyState compact illustration="templates" title="No templates found" description="Save reusable message templates to speed up announcements." />
                  </td>
                </tr>
              ) : (
                rows.map((t, idx) => (
                  <tr key={t?._id || `tpl-${idx}`} className="text-gray-700 text-sm">
                    <td className="sticky left-0 z-10 bg-white py-2 pr-4 font-semibold text-gray-900 whitespace-nowrap">{t?.name || "—"}</td>
                    <td className="py-2 pr-4 text-gray-600" title={t?.message || ""}>
                      <span className="block max-w-xs truncate">{t?.message || "—"}</span>
                    </td>
                    <td className="py-2">
                      <TableKebabMenu items={[
                        { label: "View", onClick: () => setViewRow(t) },
                        { label: "Use", onClick: () => onUseTemplate?.(t), desktopClassName: "rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-blue-700 hover:bg-gray-50 text-xs" },
                        { label: "Edit", onClick: () => guarded(() => onEdit(t)) },
                        { label: "Delete", onClick: () => guarded(() => onDelete(t?._id)), danger: true }
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto" onClick={() => setViewRow(null)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="font-semibold text-gray-900 text-sm">Record Details</div>
              <button type="button" onClick={() => setViewRow(null)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div>
                <div className="font-semibold text-gray-500 text-xs">Template Name</div>
                <div className="mt-0.5 text-gray-800">{viewRow?.name || "—"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Message</div>
                <div className="mt-0.5 text-gray-800 whitespace-pre-wrap">{viewRow?.message || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatAudienceLabel(audience) {
  const type = String(audience?.type || "all");
  if (type === "all") return "All Members";
  if (type === "groups") {
    const g = Array.isArray(audience?.groupIds) ? audience.groupIds.length : 0;
    const c = Array.isArray(audience?.cellIds) ? audience.cellIds.length : 0;
    const d = Array.isArray(audience?.departmentIds) ? audience.departmentIds.length : 0;
    const m = Array.isArray(audience?.ministryIds) ? audience.ministryIds.length : 0;
    const parts = [];
    if (g) parts.push(`${g} group${g > 1 ? "s" : ""}`);
    if (c) parts.push(`${c} cell${c > 1 ? "s" : ""}`);
    if (d) parts.push(`${d} dept${d > 1 ? "s" : ""}`);
    if (m) parts.push(`${m} ministr${m > 1 ? "ies" : "y"}`);
    return parts.length ? parts.join(", ") : "Groups / Cells / Depts / Ministries";
  }
  if (type === "programs" || type === "events") {
    const ids = audience?.programIds ?? audience?.eventIds;
    const n = Array.isArray(ids) ? ids.length : 0;
    return n ? `${n} program${n > 1 ? "s" : ""}` : "Programs";
  }
  if (type === "outreach") {
    const n = Array.isArray(audience?.outreachIds) ? audience.outreachIds.length : 0;
    return n ? `${n} outreach event${n > 1 ? "s" : ""}` : "Outreach Prospects";
  }
  if (type === "segment") {
    const parts = [];
    if (Array.isArray(audience?.statuses) && audience.statuses.length) parts.push(`${audience.statuses.length} status${audience.statuses.length > 1 ? "es" : ""}`);
    if (Array.isArray(audience?.genders) && audience.genders.length) parts.push(`${audience.genders.length} gender${audience.genders.length > 1 ? "s" : ""}`);
    if (Array.isArray(audience?.ageGroups) && audience.ageGroups.length) parts.push(`${audience.ageGroups.length} age group${audience.ageGroups.length > 1 ? "s" : ""}`);
    if (Array.isArray(audience?.maritalStatuses) && audience.maritalStatuses.length) parts.push(`${audience.maritalStatuses.length} marital status${audience.maritalStatuses.length > 1 ? "es" : ""}`);
    return parts.length ? `Members: ${parts.join(", ")}` : "Member Segment";
  }
  if (type === "members") {
    const n = Array.isArray(audience?.memberIds) ? audience.memberIds.length : 0;
    return `${n} member${n !== 1 ? "s" : ""}`;
  }
  return type;
}

function DraftsTable({ open, onUseDraft, onWalletUpdated }) {
  const guarded = useGuardedAction();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const { can } = useContext(PermissionContext) || {};
  const canDelete = useMemo(() => (typeof can === "function" ? can("announcements", "delete") : true), [can]);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getCommunicationMessages({ status: "draft" });
      setRows(Array.isArray(res?.data?.messages) ? res.data.messages : []);
    } catch (e) {
      setRows([]);
      setError(e?.response?.data?.message || e?.message || "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  if (!open) return null;

  const onDeleteRow = async (row) => {
    const id = String(row?._id || "");
    if (!id) return;
    const ok = window.confirm("Delete this draft?");
    if (!ok) return;

    setActionLoadingId(id);
    setError("");
    try {
      await deleteCommunicationMessage(id);
      await load();
      if (typeof onWalletUpdated === "function") {
        await onWalletUpdated();
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete draft");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-900 text-sm">Draft Messages</div>
          {error ? <div className="mt-1 text-red-700 text-xs">{error}</div> : null}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="p-4 overflow-x-auto md:p-6 lg:p-8">
        <table className="min-w-full">
          <thead>
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-white py-2 pr-4 whitespace-nowrap">Title</th>
              <th className="py-2 pr-4 whitespace-nowrap">Audience / Recipients</th>
              <th className="py-2 pr-4 whitespace-nowrap">Created Date</th>
              <th className="py-2 pr-4 whitespace-nowrap">Last Updated</th>
              <th className="py-2 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center"><Spinner className="mx-auto text-gray-400" /></td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={5} className="px-4">
                  <EmptyState compact illustration="announcements" title="No drafts found" description="Save a message as a draft to continue editing later." />
                </td>
              </tr>
            ) : (
              rows.map((m, idx) => (
                <tr key={m?._id || `d-${idx}`} className="text-gray-700 text-sm">
                  <td className="sticky left-0 z-10 bg-white py-2 pr-4 font-semibold text-gray-900 whitespace-nowrap" title={m?.title || ""}>
                    <span className="sm:hidden">{truncateMobileName(m?.title)}</span>
                    <span className="hidden sm:inline">{truncateDesktopName(m?.title)}</span>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{formatAudienceLabel(m?.audience)}</td>
                  <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{m?.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}</td>
                  <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{m?.updatedAt ? new Date(m.updatedAt).toLocaleString() : "—"}</td>
                  <td className="py-2">
                    <TableKebabMenu items={[
                      { label: "Continue Editing", onClick: () => onUseDraft?.(m), desktopClassName: "rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-blue-700 hover:bg-gray-50 text-xs" },
                      canDelete && m?.canDelete !== false && { label: "Delete", onClick: () => guarded(() => onDeleteRow(m)), danger: true, disabled: actionLoadingId === m?._id }
                    ]} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    scheduled: "bg-blue-100 text-blue-700",
    processing: "bg-amber-100 text-amber-700",
    sent: "bg-green-100 text-green-700",
    cancelled: "bg-gray-200 text-gray-600",
    failed: "bg-red-100 text-red-700",
    draft: "bg-gray-100 text-gray-500"
  };
  const cls = map[s] || "bg-gray-100 text-gray-500";
  const label = s === "processing" ? "Sending" : (s.charAt(0).toUpperCase() + s.slice(1));
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function MessagesTable({ title, open, query, onOpenDeliveryReport, onWalletUpdated, variant = "sent" }) {
  const guarded = useGuardedAction();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const { can } = useContext(PermissionContext) || {};
  const canView = useMemo(() => (typeof can === "function" ? can("announcements", "view") : false), [can]);
  const canUpdate = useMemo(() => (typeof can === "function" ? can("announcements", "update") : true), [can]);

  const [menuId, setMenuId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [cancelRow, setCancelRow] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const closeEdit = () => {
    if (actionLoadingId) return;
    setEditOpen(false);
    setEditRow(null);
  };

  const openEdit = (row) => {
    setMenuId(null);
    setEditRow(row || null);
    setEditOpen(true);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getCommunicationMessages(query);
      setRows(Array.isArray(res?.data?.messages) ? res.data.messages : []);
    } catch (e) {
      setRows([]);
      setError(e?.response?.data?.message || e?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMenuId(null);
  }, [open]);

  if (!open) return null;

  const onSaveEdit = async (payload) => {
    const id = String(editRow?._id || "");
    if (!id) return;
    setActionLoadingId(id);
    setError("");
    try {
      await updateCommunicationMessage(id, payload);
      closeEdit();
      await load();
      if (typeof onWalletUpdated === "function") {
        await onWalletUpdated();
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to update message");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onCancelRow = (row) => {
    setMenuId(null);
    setCancelRow(row);
    setCancelError("");
  };

  const confirmCancel = async () => {
    const id = String(cancelRow?._id || "");
    if (!id) return;
    setCancelLoading(true);
    setCancelError("");
    try {
      await cancelCommunicationMessage(id);
      setCancelRow(null);
      await load();
      if (typeof onWalletUpdated === "function") {
        await onWalletUpdated();
      }
    } catch (e) {
      setCancelError(e?.response?.data?.message || e?.message || "Failed to cancel message");
    } finally {
      setCancelLoading(false);
    }
  };

  const isScheduledVariant = variant === "scheduled";

  // Column count for colSpan
  const colCount = isScheduledVariant ? 6 : 7;

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-900 text-sm">{title}</div>
          {error ? <div className="mt-1 text-red-700 text-xs">{error}</div> : null}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="p-4 overflow-x-auto md:p-6 lg:p-8">
        <table className="min-w-full">
          <thead>
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-white py-2 pr-4 whitespace-nowrap">Title</th>
              <th className="py-2 pr-4 whitespace-nowrap">Recipients</th>
              {isScheduledVariant ? (
                <>
                  <th className="py-2 pr-4 whitespace-nowrap">Scheduled Date/Time</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Status</th>
                </>
              ) : (
                <>
                  <th className="py-2 pr-4 whitespace-nowrap">Delivered</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Pending</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Failed</th>
                </>
              )}
              <th className="py-2 pr-4 whitespace-nowrap">Created Date</th>
              <th className="py-2 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={colCount} className="py-6 text-center"><Spinner className="mx-auto text-gray-400" /></td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={colCount} className="px-4">
                  <EmptyState compact illustration="announcements" title="No messages found" description={isScheduledVariant ? "Scheduled messages will appear here." : "Sent announcements will appear here."} />
                </td>
              </tr>
            ) : (
              rows.map((m, idx) => {
                const status = String(m?.status || "");
                const canEdit = isScheduledVariant && status === "scheduled" && canUpdate;
                const canCancel = isScheduledVariant && status === "scheduled" && canUpdate;

                return (
                  <tr key={m?._id || `m-${idx}`} className="text-gray-700 text-sm">
                    <td className="sticky left-0 z-10 bg-white py-2 pr-4 font-semibold text-gray-900 whitespace-nowrap" title={m?.title || ""}>
                      <span className="sm:hidden">{truncateMobileName(m?.title)}</span>
                      <span className="hidden sm:inline">{truncateDesktopName(m?.title)}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{typeof m?.recipientCount === "number" ? m.recipientCount : "—"}</td>
                    {isScheduledVariant ? (
                      <>
                        <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                          {m?.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">{statusBadge(status)}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pr-4 text-gray-600">{typeof m?.deliveredCount === "number" ? m.deliveredCount : "—"}</td>
                        <td className="py-2 pr-4 text-gray-600">{typeof m?.pendingCount === "number" ? m.pendingCount : "—"}</td>
                        <td className="py-2 pr-4 text-gray-600">{typeof m?.failedCount === "number" ? m.failedCount : "—"}</td>
                      </>
                    )}
                    <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{m?.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}</td>
                    <td className="py-2">
                      <TableKebabMenu items={[
                        canView && { label: "View", onClick: () => onOpenDeliveryReport(m), desktopClassName: "rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-blue-700 hover:bg-gray-50 text-xs" },
                        canEdit && { label: "Edit", onClick: () => guarded(() => openEdit(m)), disabled: actionLoadingId === m?._id },
                        canCancel && { label: "Cancel", onClick: () => guarded(() => onCancelRow(m)), danger: true, disabled: actionLoadingId === m?._id }
                      ]} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <EditScheduledMessageModal
        open={editOpen}
        onClose={closeEdit}
        message={editRow}
        loading={Boolean(actionLoadingId)}
        onSave={onSaveEdit}
      />

      {cancelRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="font-semibold text-gray-900 text-sm">Cancel Scheduled Message</div>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              {cancelError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{cancelError}</div> : null}
              <div className="text-gray-600">
                Are you sure you want to cancel <span className="font-semibold text-gray-900">{cancelRow?.title || "this message"}</span>?
              </div>
              <div className="text-gray-500 text-xs">
                Sending will be stopped. The status will change to Cancelled. Reserved SMS credits will be released back to your wallet. The record will remain in Scheduled Messages as Cancelled for history.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => { if (!cancelLoading) { setCancelRow(null); setCancelError(""); } }}
                disabled={cancelLoading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
              >
                Keep Scheduled
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelLoading}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60 text-sm"
              >
                {cancelLoading ? "Cancelling..." : "Yes, Cancel Message"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditScheduledMessageModal({ open, onClose, message, onSave, loading }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [error, setError] = useState("");

  const isScheduled = String(message?.status || "") === "scheduled";

  useEffect(() => {
    if (!open) return;
    const parts = toScheduleParts(message?.scheduledAt);
    setTitle(String(message?.title || ""));
    setContent(String(message?.content || ""));
    setScheduledDate(parts.scheduledDate);
    setScheduledTime(parts.scheduledTime);
    setError("");
  }, [open, message?._id]);

  if (!open) return null;

  const submit = async () => {
    const t = String(title || "").trim();
    const c = String(content || "").trim();
    const d = String(scheduledDate || "").trim();
    const tm = String(scheduledTime || "").trim();

    if (!t) {
      setError("Title is required");
      return;
    }
    if (!c) {
      setError("Message content is required");
      return;
    }
    if (isScheduled && (!d || !tm)) {
      setError("Scheduled date and time are required");
      return;
    }

    setError("");
    await onSave(isScheduled ? { title: t, content: c, scheduledDate: d, scheduledTime: tm } : { title: t, content: c });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{isScheduled ? "Edit Scheduled Message" : "Edit Draft Message"}</div>
            <div className="mt-1 text-gray-500 text-xs">{isScheduled ? "This will update the message before it is sent." : "This will update the saved draft."}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
          >
            Close
          </button>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="font-semibold text-gray-600 text-xs">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 text-sm"
                placeholder="Message title"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-gray-600 text-xs">Message</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
                rows={5}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 text-sm"
                placeholder="Message content"
              />
            </div>

            {isScheduled ? (
              <>
                <div>
                  <label className="font-semibold text-gray-600 text-xs">Scheduled Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    disabled={loading}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 text-sm"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-600 text-xs">Scheduled Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    disabled={loading}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 text-sm"
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60 text-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryReportModal({ open, onClose, message }) {
  const guarded = useGuardedAction();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [resendError, setResendError] = useState("");
  const [expandedRecipient, setExpandedRecipient] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (!message?._id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getMessageDeliveryReport(message._id);
        if (cancelled) return;
        const all = Array.isArray(res?.data?.deliveries) ? res.data.deliveries : [];
        setRows(all);
        setStats(res?.data?.stats || null);
      } catch (e) {
        if (cancelled) return;
        setRows([]);
        setStats(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load delivery report");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, message?._id]);

  const reloadReport = async () => {
    try {
      const res = await getMessageDeliveryReport(message._id);
      setRows(Array.isArray(res?.data?.deliveries) ? res.data.deliveries : []);
      setStats(res?.data?.stats || null);
    } catch (e) {
      setResendError(e?.response?.data?.message || e?.message || "Failed to reload report");
    }
  };

  const onResend = async (deliveryId) => {
    setResendingId(deliveryId);
    setResendError("");
    try {
      await resendFailedDelivery(deliveryId);
      await reloadReport();
    } catch (e) {
      setResendError(e?.response?.data?.message || e?.message || "Failed to resend SMS");
    } finally {
      setResendingId(null);
    }
  };

  // Group all deliveries by recipient (member ID or phone) and keep only the
  // latest attempt for the main table. Full history is available on expand.
  const groupedRows = useMemo(() => {
    const byKey = new Map();
    for (const d of rows) {
      const key = d?.member ? String(d.member) : String(d?.phone || "");
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { latest: d, all: [d] });
      } else {
        existing.all.push(d);
        if ((d.attemptNumber || 1) > (existing.latest.attemptNumber || 1)) {
          existing.latest = d;
        }
      }
    }
    // Sort all attempts within each group by attemptNumber ascending
    for (const g of byKey.values()) {
      g.all.sort((a, b) => (a.attemptNumber || 1) - (b.attemptNumber || 1));
    }
    return Array.from(byKey.values());
  }, [rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Delivery Report</div>
            <div className="mt-1 text-gray-500 text-xs">{message?.title || "—"}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
          >
            Close
          </button>
        </div>

        <div className="p-4 overflow-y-auto md:p-6 lg:p-8">
          {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <div className="font-semibold text-gray-500 text-xs">Title</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{message?.title || "—"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Channel</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">
                  {Array.isArray(message?.channels) && message.channels.length
                    ? message.channels.map((c) => String(c).toUpperCase()).join(", ")
                    : "—"}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Audience</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{String(message?.audience?.type || "all")}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Send Options</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">
                  {String(message?.status || "—")}
                  {message?.scheduledAt ? ` • ${new Date(message.scheduledAt).toLocaleString()}` : ""}
                </div>
              </div>
              <div className="md:col-span-4">
                <div className="font-semibold text-gray-500 text-xs">Message Content</div>
                <div className="mt-1 text-gray-700 whitespace-pre-wrap text-sm">{message?.content || "—"}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="font-semibold text-gray-500 text-xs">Total Recipients</div>
              <div className="mt-1 font-semibold text-gray-900 text-lg">{stats?.total ?? message?.recipientCount ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="font-semibold text-gray-500 text-xs">Sent</div>
              <div className="mt-1 font-semibold text-gray-900 text-lg">{stats?.sent ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="font-semibold text-gray-500 text-xs">Delivered</div>
              <div className="mt-1 font-semibold text-gray-900 text-lg">{stats?.delivered ?? message?.deliveredCount ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="font-semibold text-gray-500 text-xs">Pending</div>
              <div className="mt-1 font-semibold text-gray-900 text-lg">{stats?.pending ?? message?.pendingCount ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="font-semibold text-gray-500 text-xs">Failed</div>
              <div className="mt-1 font-semibold text-gray-900 text-lg">{stats?.failed ?? message?.failedCount ?? 0}</div>
            </div>
          </div>

          {resendError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{resendError}</div>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-white py-2 pr-4 whitespace-nowrap">Member</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Phone</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Status</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Time</th>
                  <th className="py-2 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center"><Spinner className="mx-auto text-gray-400" /></td>
                  </tr>
                ) : !groupedRows.length ? (
                  <tr>
                    <td colSpan={5} className="px-4">
                      <EmptyState compact illustration="announcements" title="No delivery records" description="Delivery reports for this message will appear here." />
                    </td>
                  </tr>
                ) : (
                  groupedRows.map((g, idx) => {
                    const d = g.latest;
                    const isFailed = String(d?.status || "").toLowerCase() === "failed";
                    const recipientKey = d?.member ? String(d.member) : String(d?.phone || "");
                    const isExpanded = expandedRecipient === recipientKey;
                    const hasMultipleAttempts = g.all.length > 1;
                    return (
                      <Fragment key={recipientKey || `g-${idx}`}>
                        <tr className="text-gray-700 text-sm">
                          <td className="sticky left-0 z-10 bg-white py-2 pr-4 font-semibold text-gray-900 whitespace-nowrap">
                            {hasMultipleAttempts ? (
                              <button
                                type="button"
                                onClick={() => setExpandedRecipient(isExpanded ? null : recipientKey)}
                                className="mr-1 text-blue-600 hover:text-blue-800"
                              >
                                {isExpanded ? "▼" : "▶"}
                              </button>
                            ) : null}
                            {d?.memberName || "—"}
                          </td>
                          <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{d?.phone || "—"}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-700">{d?.status || "—"}</span>
                              {isFailed && d?.errorMessage ? (
                                <InfoTooltip text={d.errorMessage} />
                              ) : null}
                              {hasMultipleAttempts ? (
                                <span className="text-gray-400 text-xs">({g.all.length} attempts)</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-2 text-gray-600 whitespace-nowrap">{d?.updatedAt ? new Date(d.updatedAt).toLocaleString() : d?.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}</td>
                          <td className="py-2 whitespace-nowrap">
                            {isFailed ? (
                              <button
                                type="button"
                                onClick={() => guarded(() => onResend(d?._id))}
                                disabled={resendingId === d?._id}
                                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60 text-xs"
                              >
                                {resendingId === d?._id ? "Sending..." : "Resend"}
                              </button>
                            ) : "—"}
                          </td>
                        </tr>
                        {isExpanded && hasMultipleAttempts ? (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="px-8 py-3">
                              <div className="text-xs font-semibold text-gray-500 mb-2">Attempt History</div>
                              <div className="space-y-1.5">
                                {g.all.map((a, aIdx) => (
                                  <div key={a?._id || aIdx} className="flex items-center gap-3 text-xs text-gray-600">
                                    <span className="font-semibold text-gray-700 w-16">Attempt {a.attemptNumber || (aIdx + 1)}</span>
                                    <span className={
                                      String(a?.status || "").toLowerCase() === "delivered" ? "text-green-600 font-semibold" :
                                      String(a?.status || "").toLowerCase() === "failed" ? "text-red-600 font-semibold" :
                                      "text-gray-600 font-semibold"
                                    }>{a?.status || "—"}</span>
                                    {a?.errorMessage ? <span className="text-gray-400">{a.errorMessage}</span> : null}
                                    <span className="text-gray-400">{a?.updatedAt ? new Date(a.updatedAt).toLocaleString() : a?.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const AUDIENCE_SELECT_STYLES = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#93c5fd" : "#e5e7eb",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
    ":hover": { borderColor: state.isFocused ? "#93c5fd" : "#d1d5db" },
    fontSize: "0.875rem"
  }),
  multiValue: (base) => ({ ...base, backgroundColor: "#eff6ff", borderRadius: "0.375rem" }),
  multiValueLabel: (base) => ({ ...base, color: "#1d4ed8", fontWeight: 600 }),
  multiValueRemove: (base) => ({ ...base, color: "#1d4ed8", ":hover": { backgroundColor: "#dbeafe", color: "#1e40af" } }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 })
};

function toAudienceOptions(list, labelFor) {
  return (Array.isArray(list) ? list : [])
    .map((x) => ({ value: String(x?._id || ""), label: labelFor(x) }))
    .filter((o) => o.value);
}

function AudienceMultiSelect({ label, options, values, onChange, placeholder }) {
  const selected = useMemo(() => (options || []).filter((o) => (values || []).includes(o.value)), [options, values]);
  const allValues = useMemo(() => (options || []).map((o) => o.value), [options]);
  const allSelected = allValues.length > 0 && allValues.every((v) => (values || []).includes(v));
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-gray-500 text-xs">{label}</div>
        {allValues.length ? (
          <button
            type="button"
            onClick={() => onChange(allSelected ? [] : allValues)}
            className="font-semibold text-blue-700 hover:text-blue-800 text-xs"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        ) : null}
      </div>
      <Select
        isMulti
        closeMenuOnSelect={false}
        className="mt-2 text-sm"
        options={options}
        value={selected}
        onChange={(sel) => onChange((sel || []).map((o) => o.value))}
        placeholder={placeholder || "Select..."}
        styles={AUDIENCE_SELECT_STYLES}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        noOptionsMessage={() => "Nothing to select"}
      />
    </div>
  );
}

const AUDIENCE_OPTIONS = [
  {
    value: "all",
    label: "All Members",
    hint: "Everyone in the member directory",
    icon: <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" /><path d="M3 20a6 6 0 0112 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M16 5.5a3 3 0 010 5.5M17.8 14.4A6 6 0 0121 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  },
  {
    value: "groups",
    label: "Organisations",
    hint: "Groups, cells, departments or ministries",
    icon: <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" /><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M11 7h6a2 2 0 012 2v4M13 17H7a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  },
  {
    value: "segment",
    label: "Member Details",
    hint: "Filter by status, gender, age or marital status",
    icon: <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
  },
  {
    value: "programs",
    label: "Programs",
    hint: "People registered for selected programs",
    icon: <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M8 3v4M16 3v4M4 11h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  },
  {
    value: "outreach",
    label: "Outreach Prospects",
    hint: "Prospects reached through outreach events",
    icon: <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3 11l14-6v14L3 13v-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M17 8a4 4 0 010 8M7 13v5a1 1 0 001 1h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  },
  {
    value: "members",
    label: "Specific Members",
    hint: "Search and pick individual members",
    icon: <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="2" /><path d="M4 20a6 6 0 0112 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M16.5 12.5l2 2 3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  }
];

const SEGMENT_SECTIONS = [
  {
    label: "Membership Status",
    options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "dormant", label: "Dormant" }, { value: "visitor", label: "Visitor" }, { value: "transferred", label: "Transferred" }, { value: "temporarily_away", label: "Temporarily Away" }, { value: "former", label: "Former" }]
  },
  {
    label: "Gender",
    options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }]
  },
  {
    label: "Age Group",
    options: [{ value: "children", label: "Children" }, { value: "teenagers", label: "Teenagers" }, { value: "youth", label: "Youth" }, { value: "adult", label: "Adult" }, { value: "elderly", label: "Elderly" }]
  },
  {
    label: "Marital Status",
    options: [{ value: "single", label: "Single" }, { value: "married", label: "Married" }, { value: "divorced", label: "Divorced" }, { value: "widowed", label: "Widowed" }, { value: "other", label: "Other" }]
  }
];

function CommunicationTab({ open, wallet, allowance, onSent, prefill, prefillKey }) {
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("announcements", "read") : true), [can]);
  const canWrite = useMemo(() => (typeof can === "function" ? can("announcements", "create") : true), [can]);
  const { isLocked } = useSubscriptionLock();
  const guarded = useGuardedAction();

  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;
  const switchChurch = churchCtx?.switchChurch;

  const [loading, setLoading] = useState(false);
  const [submitAction, setSubmitAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [senderWarnOpen, setSenderWarnOpen] = useState(false);
  const [senderWarnLoading, setSenderWarnLoading] = useState(false);
  const [senderWarnError, setSenderWarnError] = useState("");
  const [senderWarnRemember, setSenderWarnRemember] = useState(false);
  const [pendingSendDraftFlag, setPendingSendDraftFlag] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [audienceType, setAudienceType] = useState("all");

  const [groups, setGroups] = useState([]);
  const [cells, setCells] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [outreachEvents, setOutreachEvents] = useState([]);

  const [groupIds, setGroupIds] = useState([]);
  const [cellIds, setCellIds] = useState([]);
  const [departmentIds, setDepartmentIds] = useState([]);
  const [ministryIds, setMinistryIds] = useState([]);
  const [programIds, setProgramIds] = useState([]);
  const [outreachIds, setOutreachIds] = useState([]);

  const [segStatuses, setSegStatuses] = useState([]);
  const [segGenders, setSegGenders] = useState([]);
  const [segAgeGroups, setSegAgeGroups] = useState([]);
  const [segMaritalStatuses, setSegMaritalStatuses] = useState([]);

  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberIds, setMemberIds] = useState([]);
  const [memberNameById, setMemberNameById] = useState({});

  const groupOptions = useMemo(() => toAudienceOptions(groups, (x) => x?.name || "—"), [groups]);
  const cellOptions = useMemo(() => toAudienceOptions(cells, (x) => x?.name || "—"), [cells]);
  const departmentOptions = useMemo(() => toAudienceOptions(departments, (x) => x?.name || "—"), [departments]);
  const ministryOptions = useMemo(() => toAudienceOptions(ministries, (x) => x?.name || "—"), [ministries]);
  const programOptions = useMemo(() => toAudienceOptions(programs, (x) => x?.name || x?.title || "—"), [programs]);
  const outreachOptions = useMemo(() => toAudienceOptions(outreachEvents, (x) => x?.title || x?.name || "—"), [outreachEvents]);

  const [channels, setChannels] = useState({ sms: true });

  const [sendMode, setSendMode] = useState("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);
  const [estimatedCostPerRecipient, setEstimatedCostPerRecipient] = useState(0);
  const [estimatedTotalCostServer, setEstimatedTotalCostServer] = useState(0);
  const [estimatedSegments, setEstimatedSegments] = useState(0);
  const [estimatedAvailableCredits, setEstimatedAvailableCredits] = useState(0);
  const [estimatedIncludedCredits, setEstimatedIncludedCredits] = useState(0);
  const [estimatedWalletCredits, setEstimatedWalletCredits] = useState(0);

  const totalRecipientsPreview = useMemo(() => {
    if (audienceType === "members") return memberIds.length;
    return estimatedRecipients;
  }, [audienceType, estimatedRecipients, memberIds.length]);

  // Local segment counter (matches backend GSM-7 / UCS-2 logic for preview only).
  const previewSegments = useMemo(() => {
    const len = String(content || "").length;
    if (!len) return 0;
    // Approximate: assume GSM-7 unless content has non-ASCII chars.
    const isAscii = /^[\x00-\x7F]*$/.test(String(content || ""));
    const single = isAscii ? 160 : 70;
    const multi = isAscii ? 153 : 67;
    if (len <= single) return 1;
    return Math.ceil(len / multi);
  }, [content]);

  const costPerRecipient = useMemo(() => {
    const smsCost = channels.sms ? 5 : 0;
    return smsCost * Math.max(1, previewSegments);
  }, [channels.sms, previewSegments]);

  const estimatedTotalCost = useMemo(() => {
    if (audienceType === "members") return totalRecipientsPreview * costPerRecipient;
    return estimatedTotalCostServer;
  }, [audienceType, costPerRecipient, estimatedTotalCostServer, totalRecipientsPreview]);

  const walletCredits = Number(wallet?.balanceCredits || 0);
  const includedCredits = Number(allowance?.remainingIncludedCredits || 0);
  const totalAvailableCredits = walletCredits + includedCredits;
  const hasEnoughCredits = totalAvailableCredits >= estimatedTotalCost;

  const messageCharCount = String(content || "").length;

  useEffect(() => {
    if (!open) return;
    if (!prefillKey) return;
    if (!prefill) return;

    setError("");
    setSuccess("");
    setTitle(String(prefill?.title || ""));
    setContent(String(prefill?.content || prefill?.message || ""));

    const nextAudienceType = String(prefill?.audience?.type || "all") === "events" ? "programs" : String(prefill?.audience?.type || "all");
    setAudienceType(nextAudienceType);
    setGroupIds(Array.isArray(prefill?.audience?.groupIds) ? prefill.audience.groupIds.map(String) : []);
    setCellIds(Array.isArray(prefill?.audience?.cellIds) ? prefill.audience.cellIds.map(String) : []);
    setDepartmentIds(Array.isArray(prefill?.audience?.departmentIds) ? prefill.audience.departmentIds.map(String) : []);
    setMinistryIds(Array.isArray(prefill?.audience?.ministryIds) ? prefill.audience.ministryIds.map(String) : []);
    const prefillProgramIds = prefill?.audience?.programIds ?? prefill?.audience?.eventIds;
    setProgramIds(Array.isArray(prefillProgramIds) ? prefillProgramIds.map(String) : []);
    setOutreachIds(Array.isArray(prefill?.audience?.outreachIds) ? prefill.audience.outreachIds.map(String) : []);
    setSegStatuses(Array.isArray(prefill?.audience?.statuses) ? prefill.audience.statuses.map(String) : []);
    setSegGenders(Array.isArray(prefill?.audience?.genders) ? prefill.audience.genders.map(String) : []);
    setSegAgeGroups(Array.isArray(prefill?.audience?.ageGroups) ? prefill.audience.ageGroups.map(String) : []);
    setSegMaritalStatuses(Array.isArray(prefill?.audience?.maritalStatuses) ? prefill.audience.maritalStatuses.map(String) : []);
    setMemberSearch("");
    setMemberResults([]);
    setMemberIds(Array.isArray(prefill?.audience?.memberIds) ? prefill.audience.memberIds.map(String) : []);
    setMemberNameById({});

    const arr = Array.isArray(prefill?.channels) ? prefill.channels : [];
    setChannels({
      sms: arr.includes("sms") || String(prefill?.channel || "") === "sms" || true
    });

    setSendMode("now");
    setScheduleDate("");
    setScheduleTime("");
  }, [open, prefillKey]);

  useEffect(() => {
    if (!open) return;
    if (isLocked) return;

    const selectedChannels = Object.entries(channels)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (!selectedChannels.length) {
      setEstimateError("");
      setEstimatedRecipients(0);
      setEstimatedCostPerRecipient(0);
      setEstimatedTotalCostServer(0);
      return;
    }

    if (audienceType === "members") {
      setEstimateError("");
      setEstimatedRecipients(0);
      setEstimatedCostPerRecipient(0);
      setEstimatedTotalCostServer(0);
      return;
    }

    if (audienceType === "groups" && !groupIds.length && !cellIds.length && !departmentIds.length && !ministryIds.length) {
      setEstimateError("");
      setEstimatedRecipients(0);
      setEstimatedCostPerRecipient(0);
      setEstimatedTotalCostServer(0);
      return;
    }

    if (audienceType === "segment" && !segStatuses.length && !segGenders.length && !segAgeGroups.length && !segMaritalStatuses.length) {
      setEstimateError("");
      setEstimatedRecipients(0);
      setEstimatedCostPerRecipient(0);
      setEstimatedTotalCostServer(0);
      return;
    }

    if ((audienceType === "programs" && !programIds.length) || (audienceType === "outreach" && !outreachIds.length)) {
      setEstimateError("");
      setEstimatedRecipients(0);
      setEstimatedCostPerRecipient(0);
      setEstimatedTotalCostServer(0);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setEstimateLoading(true);
      setEstimateError("");
      try {
        const res = await estimateMessageCost({
          audience: {
            type: audienceType,
            groupIds,
            cellIds,
            departmentIds,
            ministryIds,
            memberIds,
            programIds,
            outreachIds,
            statuses: segStatuses,
            genders: segGenders,
            ageGroups: segAgeGroups,
            maritalStatuses: segMaritalStatuses
          },
          channels: selectedChannels,
          content
        });

        if (cancelled) return;
        setEstimatedRecipients(Number(res?.data?.recipientCount || 0));
        setEstimatedCostPerRecipient(Number(res?.data?.costPerRecipientCredits || 0));
        setEstimatedTotalCostServer(Number(res?.data?.totalCostCredits || 0));
        setEstimatedSegments(Number(res?.data?.segmentsPerMessage || 0));
        setEstimatedAvailableCredits(Number(res?.data?.availableCredits || 0));
        setEstimatedIncludedCredits(Number(res?.data?.includedCredits || 0));
        setEstimatedWalletCredits(Number(res?.data?.walletCredits || 0));
      } catch (e) {
        if (cancelled) return;
        setEstimatedRecipients(0);
        setEstimatedCostPerRecipient(0);
        setEstimatedTotalCostServer(0);
        setEstimatedSegments(0);
        setEstimatedAvailableCredits(0);
        setEstimatedIncludedCredits(0);
        setEstimatedWalletCredits(0);
        setEstimateError(e?.response?.data?.message || e?.message || "Failed to estimate message cost");
      } finally {
        if (cancelled) return;
        setEstimateLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [audienceType, cellIds, channels, content, departmentIds, groupIds, ministryIds, programIds, outreachIds, memberIds, segStatuses, segGenders, segAgeGroups, segMaritalStatuses, isLocked, open]);

  useEffect(() => {
    if (!open) return;
    if (!canRead) return;

    let cancelled = false;

    const load = async () => {
      try {
        const [g, c, d, mn, ev, or] = await Promise.allSettled([
          getGroups({ page: 1, limit: 200 }),
          getCells({ page: 1, limit: 200 }),
          getDepartments({ page: 1, limit: 200 }),
          getMinistries({ page: 1, limit: 200 }),
          getPrograms({ page: 1, limit: 200 }),
          getOutreachEvents({ page: 1, limit: 200 })
        ]);

        if (cancelled) return;

        const groupsRows = g.status === "fulfilled" ? (Array.isArray(g.value?.data?.groups) ? g.value.data.groups : []) : [];
        const cellsRows = c.status === "fulfilled" ? (Array.isArray(c.value?.data?.cells) ? c.value.data.cells : []) : [];
        const departmentsRows = d.status === "fulfilled" ? (Array.isArray(d.value?.data?.departments) ? d.value.data.departments : []) : [];
        const ministriesRows = mn.status === "fulfilled"
          ? (Array.isArray(mn.value?.data?.ministries) ? mn.value.data.ministries
            : Array.isArray(mn.value?.data?.data?.ministries) ? mn.value.data.data.ministries : [])
          : [];
        const programsRows = ev.status === "fulfilled"
          ? (Array.isArray(ev.value?.data?.programs) ? ev.value.data.programs
            : Array.isArray(ev.value?.data?.data?.programs) ? ev.value.data.data.programs
            : Array.isArray(ev.value?.data?.data) ? ev.value.data.data : [])
          : [];
        const outreachRows = or.status === "fulfilled"
          ? (Array.isArray(or.value?.data?.data) ? or.value.data.data
            : Array.isArray(or.value?.data?.events) ? or.value.data.events
            : Array.isArray(or.value?.data?.data?.events) ? or.value.data.data.events : [])
          : [];

        setGroups(groupsRows);
        setCells(cellsRows);
        setDepartments(departmentsRows);
        setMinistries(ministriesRows);
        setEvents(programsRows);
        setOutreachEvents(outreachRows);
      } catch {
        if (cancelled) return;
        setGroups([]);
        setCells([]);
        setDepartments([]);
        setMinistries([]);
        setPrograms([]);
        setOutreachEvents([]);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, canRead]);

  useEffect(() => {
    if (!open) return;
    if (audienceType !== "members") return;

    const q = String(memberSearch || "").trim();
    if (q.length < 1) {
      setMemberResults([]);
      setMemberSearchLoading(false);
      return;
    }

    let cancelled = false;

    const t = setTimeout(async () => {
      setMemberSearchLoading(true);
      try {
        const res = await getMembers({ search: q, fastSearch: 0, limit: 10, page: 1 });
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data;
        const rows = Array.isArray(payload?.members) ? payload.members : [];
        setMemberResults(rows);
      } catch {
        if (cancelled) return;
        setMemberResults([]);
      } finally {
        if (cancelled) return;
        setMemberSearchLoading(false);
      }
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [audienceType, memberSearch, open]);

  const toggleId = (list, id) => {
    const sid = String(id || "");
    if (!sid) return list;
    if (list.includes(sid)) return list.filter((x) => x !== sid);
    return [...list, sid];
  };

  const memberLabel = (m) => {
    const first = String(m?.firstName || "").trim();
    const last = String(m?.lastName || "").trim();
    const full = `${first} ${last}`.trim();
    return full || String(m?.fullName || "").trim() || "—";
  };

  const toggleMember = (m) => {
    const id = String(m?._id || "");
    if (!id) return;
    const label = memberLabel(m);

    setMemberIds((prev) => toggleId(prev, id));
    setMemberNameById((prev) => ({
      ...(prev || {}),
      [id]: label
    }));
  };

  const removeMember = (id) => {
    const sid = String(id || "");
    if (!sid) return;
    setMemberIds((prev) => prev.filter((x) => x !== sid));
    setMemberNameById((prev) => {
      const next = { ...(prev || {}) };
      delete next[sid];
      return next;
    });
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setAudienceType("all");
    setGroupIds([]);
    setCellIds([]);
    setDepartmentIds([]);
    setMinistryIds([]);
    setProgramIds([]);
    setOutreachIds([]);
    setSegStatuses([]);
    setSegGenders([]);
    setSegAgeGroups([]);
    setSegMaritalStatuses([]);
    setMemberSearch("");
    setMemberResults([]);
    setMemberIds([]);
    setMemberNameById({});
    setChannels({ sms: true });
    setSendMode("now");
    setScheduleDate("");
    setScheduleTime("");

    setEstimateLoading(false);
    setEstimateError("");
    setEstimatedRecipients(0);
    setEstimatedCostPerRecipient(0);
    setEstimatedTotalCostServer(0);
  };

  const validateBeforeSend = ({ selectedChannels }) => {
    if (!title.trim()) {
      setError("Title is required");
      return false;
    }
    if (!content.trim()) {
      setError("Message content is required");
      return false;
    }
    if (!Array.isArray(selectedChannels) || !selectedChannels.length) {
      setError("Please select at least one channel");
      return false;
    }
    return true;
  };

  const shouldWarnSenderId = ({ selectedChannels, isDraft }) => {
    if (isDraft) return false;
    if (!Array.isArray(selectedChannels) || !selectedChannels.includes("sms")) return false;
    const status = String(activeChurch?.sender_id_status || "").trim().toLowerCase();
    if (status === "approved") return false;
    const suppressed = sessionStorage.getItem("cckSenderIdWarnSuppressed") === "1";
    return !suppressed;
  };

  const runSendNow = async ({ draft }) => {
    if (!canWrite) return;

    setSubmitAction(draft ? "draft" : "send");
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const selectedChannels = Object.entries(channels)
        .filter(([, v]) => v)
        .map(([k]) => k);

      if (!title.trim()) {
        setLoading(false);
        setError("Title is required");
        return;
      }
      if (!content.trim()) {
        setLoading(false);
        setError("Message content is required");
        return;
      }
      if (!selectedChannels.length) {
        setLoading(false);
        setError("Please select at least one channel");
        return;
      }

      const payload = {
        title,
        content,
        audience: {
          type: audienceType,
          groupIds,
          cellIds,
          departmentIds,
          ministryIds,
          memberIds,
          programIds,
          outreachIds,
          statuses: segStatuses,
          genders: segGenders,
          ageGroups: segAgeGroups,
          maritalStatuses: segMaritalStatuses
        },
        channels: selectedChannels,
        sendMode: draft ? "draft" : sendMode,
        scheduledDate: !draft && sendMode === "schedule" ? scheduleDate : null,
        scheduledTime: !draft && sendMode === "schedule" ? scheduleTime : null
      };

      await createCommunicationMessage(payload);
      setSuccess(draft ? "Draft saved" : sendMode === "schedule" ? "Message scheduled" : "Message sent");
      resetForm();
      onSent?.();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to send message");
    } finally {
      setLoading(false);
      setSubmitAction("");
    }
  };

  const onSend = async ({ draft = false } = {}) => {
    if (!canWrite) return;

    setError("");
    setSuccess("");

    const selectedChannels = Object.entries(channels)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (!validateBeforeSend({ selectedChannels })) {
      return;
    }

    if (shouldWarnSenderId({ selectedChannels, isDraft: draft })) {
      setPendingSendDraftFlag(Boolean(draft));
      setSenderWarnError("");
      setSenderWarnRemember(false);
      setSenderWarnOpen(true);
      return;
    }

    await runSendNow({ draft });
  };

  const closeSenderWarn = () => {
    if (senderWarnLoading) return;
    setSenderWarnOpen(false);
    setSenderWarnError("");
  };

  const continueWithDefaultSender = async () => {
    if (senderWarnRemember) {
      sessionStorage.setItem("cckSenderIdWarnSuppressed", "1");
    }
    setSenderWarnOpen(false);
    await runSendNow({ draft: pendingSendDraftFlag });
  };

  const requestSenderIdFromModal = async () => {
    if (!activeChurch?._id) return;

    setSenderWarnLoading(true);
    setSenderWarnError("");

    try {
      const current = String(activeChurch?.sender_id || "").trim();
      if (!current) {
        setSenderWarnError("No sender ID has been set for this church. Please request one from Settings > Church Profile.");
        return;
      }

      await requestMyChurchSenderId({ senderId: current });

      if (typeof switchChurch === "function") {
        try {
          await switchChurch(activeChurch._id);
        } catch (e) {
          void e;
        }
      }
      setSenderWarnError("");
    } catch (e) {
      setSenderWarnError(e?.response?.data?.message || e?.message || "Failed to request sender ID");
    } finally {
      setSenderWarnLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mt-5">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div> : null}
      {success ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 text-sm">{success}</div> : null}

      <SenderIdWarningModal
        open={senderWarnOpen}
        onClose={closeSenderWarn}
        onContinue={continueWithDefaultSender}
        onRequest={() => guarded(requestSenderIdFromModal)}
        loading={senderWarnLoading}
        error={senderWarnError}
        senderIdCurrent={activeChurch?.sender_id}
        senderIdStatus={activeChurch?.sender_id_status}
        remember={senderWarnRemember}
        onRememberChange={setSenderWarnRemember}
      />

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="font-semibold text-gray-900 text-sm">Announcement Info</div>
          <div className="text-gray-500 text-xs">
            Sender ID: <span className="font-semibold text-gray-700">{activeChurch?.sender_id_status === "approved" ? (activeChurch?.sender_id || "—") : "CHURCHCLERK"}</span>
          </div>
        </div>

        <fieldset disabled={isLocked} className="m-0 min-w-0 border-0 p-0">
        <div className="mt-4 grid grid-cols-1 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
          />

          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Message content"
              className="min-h-[140px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
            />
            <div className="mt-1 text-gray-500 text-xs">Characters: {messageCharCount}</div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="font-semibold text-gray-900 text-sm">Select Audience</div>
          <div className="mt-0.5 text-gray-500 text-xs">Pick who should receive this message, then fill in the matching section below.</div>

          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            {AUDIENCE_OPTIONS.map((o) => {
              const active = audienceType === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setAudienceType(o.value)}
                  className={`relative flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                    active ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300" : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <span className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                    {o.icon}
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-semibold text-sm ${active ? "text-blue-800" : "text-gray-800"}`}>{o.label}</span>
                    <span className="mt-0.5 block text-gray-500 leading-snug text-xs">{o.hint}</span>
                  </span>
                  {active ? (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                      <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {audienceType === "all" ? (
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800 text-xs">
              This message will be sent to every member in your member directory.
            </div>
          ) : null}

          {audienceType === "groups" ? (
            <div className="mt-4">
              <div className="text-gray-500 text-xs">Members in any of the selections below will receive the message. You can pick from multiple lists.</div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <AudienceMultiSelect label="Groups" options={groupOptions} values={groupIds} onChange={setGroupIds} placeholder="Select groups..." />
                <AudienceMultiSelect label="Cells" options={cellOptions} values={cellIds} onChange={setCellIds} placeholder="Select cells..." />
                <AudienceMultiSelect label="Departments" options={departmentOptions} values={departmentIds} onChange={setDepartmentIds} placeholder="Select departments..." />
                <AudienceMultiSelect label="Ministries" options={ministryOptions} values={ministryIds} onChange={setMinistryIds} placeholder="Select ministries..." />
              </div>
            </div>
          ) : null}

          {audienceType === "programs" ? (
            <div className="mt-4">
              <div className="text-gray-500 text-xs">Registered attendees of the selected programs will receive the message.</div>
              <div className="mt-3">
                <AudienceMultiSelect label="Programs" options={programOptions} values={programIds} onChange={setProgramIds} placeholder="Select programs..." />
              </div>
              {!programs.length ? <div className="mt-2 text-gray-500 text-xs">No programs found.</div> : null}
            </div>
          ) : null}

          {audienceType === "outreach" ? (
            <div className="mt-4">
              <div className="text-gray-500 text-xs">Prospects recorded under the selected outreach events will receive the message.</div>
              <div className="mt-3">
                <AudienceMultiSelect label="Outreach Events" options={outreachOptions} values={outreachIds} onChange={setOutreachIds} placeholder="Select outreach events..." />
              </div>
              {!outreachEvents.length ? <div className="mt-2 text-gray-500 text-xs">No outreach events found.</div> : null}
            </div>
          ) : null}

          {audienceType === "segment" ? (
            <div className="mt-4">
              <div className="text-gray-500 text-xs">Pick any combination — members matching all selected filters will receive the message.</div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <AudienceMultiSelect label="Membership Status" options={SEGMENT_SECTIONS[0].options} values={segStatuses} onChange={setSegStatuses} placeholder="Select statuses..." />
                <AudienceMultiSelect label="Gender" options={SEGMENT_SECTIONS[1].options} values={segGenders} onChange={setSegGenders} placeholder="Select genders..." />
                <AudienceMultiSelect label="Age Group" options={SEGMENT_SECTIONS[2].options} values={segAgeGroups} onChange={setSegAgeGroups} placeholder="Select age groups..." />
                <AudienceMultiSelect label="Marital Status" options={SEGMENT_SECTIONS[3].options} values={segMaritalStatuses} onChange={setSegMaritalStatuses} placeholder="Select marital statuses..." />
              </div>
              {!segStatuses.length && !segGenders.length && !segAgeGroups.length && !segMaritalStatuses.length ? (
                <div className="mt-2 text-gray-500 text-xs">Select at least one filter to target members.</div>
              ) : null}
            </div>
          ) : null}

          {audienceType === "members" ? (
            <div className="mt-4">
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members by name..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />

              {String(memberSearch || "").trim().length >= 1 ? (
                <div className="mt-1 text-gray-500 text-xs">
                  {memberSearchLoading ? "Searching..." : memberResults.length ? "" : "No members found"}
                </div>
              ) : null}

              {memberResults.length ? (
                <div className="mt-2 rounded-lg border border-gray-200 bg-white">
                  {memberResults.map((m) => {
                    const id = String(m?._id || "");
                    const checked = id ? memberIds.includes(id) : false;
                    return (
                      <label
                        key={id}
                        className="flex items-center justify-between gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                      >
                        <span className="min-w-0 truncate">{memberLabel(m)}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(m)}
                          className="shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {memberIds.length ? (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="font-semibold text-gray-600 text-xs">Selected Members</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {memberIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => removeMember(id)}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                      >
                        {memberNameById?.[id] || id.slice(-6)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-gray-500 text-xs">Click a chip to remove.</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="font-semibold text-gray-900 text-sm">Message Cost Preview</div>
          {estimateError ? <div className="mt-2 font-semibold text-red-700 text-xs">{estimateError}</div> : null}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold text-gray-500 text-xs">Segments per Message</div>
                <InfoTooltip text="A segment is a piece of your SMS. Short messages fit in 1 segment (160 characters). Longer messages split into multiple segments. Each segment costs credits." />
              </div>
              <div className="mt-1 font-semibold text-gray-900 text-sm">
                {audienceType === "members" ? previewSegments : (estimatedSegments || previewSegments)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold text-gray-500 text-xs">Cost per Recipient</div>
                <InfoTooltip text="How many credits it costs to send this message to one person. It is segments multiplied by the credit cost per segment set by the admin." />
              </div>
              <div className="mt-1 font-semibold text-gray-900 text-sm">
                {(audienceType === "members" ? costPerRecipient : estimatedCostPerRecipient || costPerRecipient)} credits
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold text-gray-500 text-xs">Estimated Total Cost</div>
                <InfoTooltip text="The total credits needed to send to everyone. It is cost per recipient multiplied by the number of recipients. Subscription credits are used first, then wallet top-up credits." />
              </div>
              <div className="mt-1 font-semibold text-gray-900 text-sm">{`${estimatedTotalCost} credits`}</div>
              <div className="mt-1 text-gray-500 text-xs">
                Available: {totalAvailableCredits} (subscription {includedCredits} + top-up {walletCredits})
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold text-gray-500 text-xs">Recipients</div>
                <InfoTooltip text="The number of people who will receive this message. Each recipient gets one copy of the SMS." />
              </div>
              <div className="mt-1 font-semibold text-gray-900 text-sm">{totalRecipientsPreview}</div>
            </div>
          </div>

          {!hasEnoughCredits && estimatedTotalCost > 0 ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
              Insufficient credits. Needed {estimatedTotalCost}, available {totalAvailableCredits}. Please fund your wallet.
            </div>
          ) : null}

          {audienceType !== "members" ? (
            <div className="mt-2 text-gray-500 text-xs">Recipient counts and costs for all audiences except Specific Members are computed accurately on the server.</div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="font-semibold text-gray-900 text-sm">Send Options</div>

          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-gray-700 text-sm">
              <input type="radio" checked={sendMode === "now"} onChange={() => setSendMode("now")} />
              Send Immediately
            </label>
            <label className="flex items-center gap-2 text-gray-700 text-sm">
              <input type="radio" checked={sendMode === "schedule"} onChange={() => setSendMode("schedule")} />
              Schedule Message
            </label>
          </div>

          {sendMode === "schedule" ? (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-500 text-xs">Send Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-500 text-xs">Send Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                />
              </div>
            </div>
          ) : null}
        </div>
          </fieldset>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => guarded(() => onSend({ draft: true }))}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
          >
            {loading && submitAction === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            onClick={() => guarded(() => onSend({ draft: false }))}
            disabled={loading || (!hasEnoughCredits && estimatedTotalCost > 0)}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60 text-sm"
          >
            {loading && submitAction === "send" ? "Sending..." : "Send Announcement"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AnnouncementPage() {
  const { can } = useContext(PermissionContext) || {};
  const { user } = useAuth();
  const guarded = useGuardedAction();
  const canRead = useMemo(() => (typeof can === "function" ? can("announcements", "read") : true), [can]);
  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;
  const isGhana = String(activeChurch?.country || "").trim().toLowerCase() === "ghana";
  const [usdToGhs, setUsdToGhs] = useState(null);

  useEffect(() => {
    if (isGhana) { setUsdToGhs(null); return; }
    let cancelled = false;
    getAdminConfiguredRate().then((r) => { if (!cancelled) setUsdToGhs(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isGhana]);

  const [tab, setTab] = useState("communication");

  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [wallet, setWallet] = useState(null);
  const [allowance, setAllowance] = useState(null);

  const [fundOpen, setFundOpen] = useState(false);
  const [fundLoading, setFundLoading] = useState(false);
  const [fundError, setFundError] = useState("");

  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [transactions, setTransactions] = useState([]);

  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryRow, setDeliveryRow] = useState(null);

  const [communicationPrefill, setCommunicationPrefill] = useState(null);
  const [communicationPrefillKey, setCommunicationPrefillKey] = useState(0);

  const loadWallet = async () => {
    if (!canRead) return;
    setWalletLoading(true);
    setWalletError("");
    try {
      const res = await getWallet();
      setWallet(res?.data?.wallet || null);
      setAllowance(res?.data?.allowance || null);
    } catch (e) {
      setWallet(null);
      setAllowance(null);
      setWalletError(e?.response?.data?.message || e?.message || "Failed to load wallet");
    } finally {
      setWalletLoading(false);
    }
  };

  const loadTx = async () => {
    if (!canRead) return;
    setTxLoading(true);
    setTxError("");
    try {
      const res = await getWalletTransactions();
      setTransactions(Array.isArray(res?.data?.transactions) ? res.data.transactions : []);
    } catch (e) {
      setTransactions([]);
      setTxError(e?.response?.data?.message || e?.message || "Failed to load wallet history");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    if (tab !== "wallet-history") return;
    loadTx();
  }, [tab]);

  const openFund = () => {
    setFundError("");
    setFundOpen(true);
  };

  const closeFund = () => {
    if (fundLoading) return;
    setFundOpen(false);
  };

  const onFund = async (amount) => {
    const n = Number(amount || 0);
    if (!Number.isFinite(n) || n < 10) {
      setFundError("Minimum deposit is 10 GHS");
      return;
    }

    setFundLoading(true);
    setFundError("");

    try {
      const res = await fundWalletInitiate({ amount: n });
      const accessCode = res?.data?.accessCode || "";
      const initRef = res?.data?.reference || "";
      if (!accessCode) {
        setFundError("Unable to start Paystack payment");
        return;
      }

      const key =
        import.meta.env.VITE_TEST_PUBLIC_KEY ||
        import.meta.env.TEST_PUBLIC_KEY ||
        import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
        "";
      if (!key) {
        setFundError(
          "Paystack public key is not configured. Set VITE_TEST_PUBLIC_KEY=pk_test_... in frontend .env, then restart the frontend."
        );
        return;
      }

      const payerEmail = String(user?.email || "").trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail);
      if (!emailOk) {
        setFundError("Your account email is missing or invalid. Please update your profile email and try again.");
        return;
      }

      const paystack = window?.PaystackPop;
      if (!paystack || typeof paystack.setup !== "function") {
        setFundError("Paystack inline script is not loaded");
        return;
      }

      const reference = await new Promise((resolve, reject) => {
        let settled = false;
        const handler = paystack.setup({
          key,
          email: payerEmail,
          amount: Math.round(n * 100),
          currency: "GHS",
          access_code: accessCode,
          ref: initRef,
          callback: (response) => {
            if (settled) return;
            settled = true;
            resolve(response?.reference || response?.trxref || initRef);
          },
          onClose: () => {
            if (settled) return;
            settled = true;
            reject(new Error("Payment was cancelled"));
          }
        });
        handler.openIframe();
      });

      const verifyRes = await fundWalletVerify({ reference });
      const status = String(verifyRes?.data?.status || "").toLowerCase();
      const nextWallet = verifyRes?.data?.wallet || null;

      if (nextWallet) {
        setWallet(nextWallet);
        setFundOpen(false);
        await loadWallet();
        return;
      }

      if (status === "failed") {
        setFundError("Payment failed");
        return;
      }

      setFundError("Payment pending. Please refresh your wallet balance shortly.");
    } catch (e) {
      setFundError(e?.response?.data?.message || e?.message || "Failed to initiate payment");
    } finally {
      setFundLoading(false);
    }
  };

  const onMessageSent = async () => {
    await loadWallet();
  };

  const openDelivery = (row) => {
    setDeliveryRow(row || null);
    setDeliveryOpen(true);
  };

  const closeDelivery = () => {
    setDeliveryOpen(false);
    setDeliveryRow(null);
  };

  const applyTemplatePrefill = (t) => {
    setCommunicationPrefill({
      title: "",
      content: String(t?.message || ""),
      channel: String(t?.channel || "sms"),
      channels: [String(t?.channel || "sms")],
      audience: { type: "all", groupIds: [], cellIds: [], departmentIds: [], ministryIds: [], memberIds: [], programIds: [], outreachIds: [], statuses: [], genders: [], ageGroups: [], maritalStatuses: [] }
    });
    setCommunicationPrefillKey((k) => k + 1);
    setTab("communication");
  };

  const applyDraftPrefill = (m) => {
    const channels = Array.isArray(m?.channels) ? m.channels.map((c) => String(c)) : [];
    setCommunicationPrefill({
      title: String(m?.title || ""),
      content: String(m?.content || ""),
      channels,
      audience: {
        type: String(m?.audience?.type || "all") === "events" ? "programs" : String(m?.audience?.type || "all"),
        groupIds: Array.isArray(m?.audience?.groupIds) ? m.audience.groupIds : [],
        cellIds: Array.isArray(m?.audience?.cellIds) ? m.audience.cellIds : [],
        departmentIds: Array.isArray(m?.audience?.departmentIds) ? m.audience.departmentIds : [],
        ministryIds: Array.isArray(m?.audience?.ministryIds) ? m.audience.ministryIds : [],
        memberIds: Array.isArray(m?.audience?.memberIds) ? m.audience.memberIds : [],
        programIds: Array.isArray(m?.audience?.programIds ?? m?.audience?.eventIds) ? (m.audience.programIds ?? m.audience.eventIds) : [],
        outreachIds: Array.isArray(m?.audience?.outreachIds) ? m.audience.outreachIds : [],
        statuses: Array.isArray(m?.audience?.statuses) ? m.audience.statuses : [],
        genders: Array.isArray(m?.audience?.genders) ? m.audience.genders : [],
        ageGroups: Array.isArray(m?.audience?.ageGroups) ? m.audience.ageGroups : [],
        maritalStatuses: Array.isArray(m?.audience?.maritalStatuses) ? m.audience.maritalStatuses : []
      }
    });
    setCommunicationPrefillKey((k) => k + 1);
    setTab("communication");
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Announcement</h2>
          <p className="mt-1 text-gray-500 text-sm hidden md:block">Send announcements via SMS. Track delivery and manage wallet credits.</p>
        </div>
      </div>

      {walletError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{walletError}</div> : null}

      <div className="mt-6">
        <WalletCard
          wallet={wallet}
          allowance={allowance}
          onFund={() => guarded(openFund)}
          onViewHistory={() => setTab("wallet-history")}
          isGhana={isGhana}
          usdToGhs={usdToGhs}
        />
        {walletLoading ? <div className="mt-2 flex items-center justify-center"><Spinner className="text-gray-400" /></div> : null}
      </div>

      <PageTabs
        tabs={[
          { key: "communication", label: "Communication" },
          { key: "sent", label: "Sent Messages" },
          { key: "scheduled", label: "Scheduled Messages" },
          { key: "templates", label: "Templates & Drafts" },
          { key: "wallet-history", label: "Wallet History" },
        ]}
        activeTab={tab}
        onChange={setTab}
        sticky={false}
        className="mt-6"
      />

      <CommunicationTab
        open={tab === "communication"}
        wallet={wallet}
        allowance={allowance}
        onSent={onMessageSent}
        prefill={communicationPrefill}
        prefillKey={communicationPrefillKey}
      />

      <MessagesTable
        title="Sent Messages"
        open={tab === "sent"}
        query={{ status: "sent" }}
        onOpenDeliveryReport={openDelivery}
        variant="sent"
      />

      <MessagesTable
        title="Scheduled Messages"
        open={tab === "scheduled"}
        query={{ status: "scheduled,processing,cancelled,failed" }}
        onOpenDeliveryReport={openDelivery}
        onWalletUpdated={loadWallet}
        variant="scheduled"
      />

      <TemplatesAndDraftsTab
        open={tab === "templates"}
        onUseTemplate={(t) => guarded(() => applyTemplatePrefill(t))}
        onUseDraft={(m) => guarded(() => applyDraftPrefill(m))}
        onOpenDeliveryReport={openDelivery}
        onWalletUpdated={loadWallet}
      />

      <WalletHistoryTab
        open={tab === "wallet-history"}
        transactions={transactions}
        loading={txLoading}
        error={txError}
        onReload={loadTx}
        isGhana={isGhana}
        usdToGhs={usdToGhs}
      />

      <FundWalletModal
        open={fundOpen}
        onClose={closeFund}
        onFund={onFund}
        loading={fundLoading}
        error={fundError}
        isGhana={isGhana}
        usdToGhs={usdToGhs}
      />

      <DeliveryReportModal
        open={deliveryOpen}
        onClose={closeDelivery}
        message={deliveryRow}
      />
    </div>
  );
}

export default AnnouncementPage;
