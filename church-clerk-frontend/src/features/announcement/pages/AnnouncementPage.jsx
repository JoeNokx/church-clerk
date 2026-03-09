import { useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import { useAuth } from "../../auth/useAuth.js";
import { getGroups } from "../../group/services/group.api.js";
import { getCells } from "../../cell/services/cell.api.js";
import { getDepartments } from "../../department/services/department.api.js";
import { getMembers } from "../../member/services/member.api.js";
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
  createMessageTemplate,
  deleteMessageTemplate,
  getMessageTemplates,
  updateMessageTemplate
} from "../services/communication.api.js";

function formatMoneyGhs(amount) {
  const n = Number(amount || 0);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-semibold ${active ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
    >
      {children}
    </button>
  );
}

function WalletCard({ wallet, onFund, onViewHistory }) {
  const balanceCredits = Number(wallet?.balanceCredits || 0);
  const balanceGhs = creditsToGhs(balanceCredits);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-semibold text-gray-500">Wallet Balance</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">₵{formatMoneyGhs(balanceGhs)}</div>
          <div className="mt-1 text-xs text-gray-500">{formatInt(balanceCredits)} credits</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onFund}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Fund Wallet
          </button>
          <button
            type="button"
            onClick={onViewHistory}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Transaction History
          </button>
        </div>
      </div>
    </div>
  );
}

function FundWalletModal({ open, onClose, onFund, loading, error }) {
  const [amount, setAmount] = useState(50);

  useEffect(() => {
    if (!open) return;
    setAmount(50);
  }, [open]);

  if (!open) return null;

  const presets = [50, 100, 200];
  const minAmount = 10;
  const amountNum = Number(amount || 0);
  const amountOk = Number.isFinite(amountNum) && amountNum >= minAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Fund Wallet</div>
            <div className="mt-1 text-xs text-gray-500">Payment method: Paystack</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="px-5 py-4">
          {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="text-xs font-semibold text-gray-600">Amount to deposit (GHS)</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                disabled={loading}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60 ${Number(amount) === p ? "border-blue-200 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
              >
                ₵{p}
              </button>
            ))}
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-gray-700">Custom:</div>
              <input
                value={String(amount ?? "")}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 w-28 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="Amount"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500">Minimum deposit: ₵{minAmount}</div>
          {!amountOk ? <div className="mt-2 text-xs font-semibold text-red-600">Enter at least ₵{minAmount} to proceed.</div> : null}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onFund(amount)}
              disabled={loading || !amountOk}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Processing..." : "Proceed to Pay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WalletHistoryTab({ open, transactions, loading, error, onReload }) {
  if (!open) return null;

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">Wallet History</div>
          <div className="mt-1 text-xs text-gray-500">All wallet transactions and credit deductions.</div>
        </div>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      <div className="p-5">
        {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-4 text-sm text-gray-600">Loading...</td>
                </tr>
              ) : !transactions.length ? (
                <tr>
                  <td colSpan={5} className="py-4 text-sm text-gray-600">No wallet transactions yet.</td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr key={t?._id || `tx-${idx}`} className="text-sm text-gray-700">
                    <td className="py-2 pr-4 text-gray-600">{t?.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-4">{t?.type || "—"}</td>
                    <td className="py-2 pr-4 text-gray-600">{t?.description || "—"}</td>
                    <td className="py-2 pr-4 font-semibold">
                      {typeof t?.amountCredits === "number" ? `${t.amountCredits >= 0 ? "+" : "-"}${Math.abs(t.amountCredits)} credits` : "—"}
                    </td>
                    <td className="py-2 font-semibold text-gray-900">{typeof t?.balanceAfterCredits === "number" ? `${t.balanceAfterCredits} credits` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab({ open }) {
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("announcements", "read") : true), [can]);
  const canWrite = useMemo(() => (typeof can === "function" ? can("announcements", "create") : true), [can]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const [editId, setEditId] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("sms");
  const [message, setMessage] = useState("");

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
        await updateMessageTemplate(editId, { name, channel, message });
      } else {
        await createMessageTemplate({ name, channel, message });
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
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="text-sm font-semibold text-gray-900">Templates</div>
        <div className="mt-1 text-xs text-gray-500">Save and reuse messages. Variables like {"{{first_name}}"} are allowed.</div>

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            disabled={loading || !canWrite}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          />

          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            disabled={loading || !canWrite}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            disabled={loading || !canWrite}
            className="min-h-[120px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={loading || !canWrite}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={loading || !canWrite}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Saving..." : editId ? "Update Template" : "Create Template"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Saved Templates</div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="py-2 pr-4">Template Name</th>
                <th className="py-2 pr-4">Channel</th>
                <th className="py-2 pr-4">Message Preview</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-4 text-sm text-gray-600">Loading...</td>
                </tr>
              ) : !rows.length ? (
                <tr>
                  <td colSpan={4} className="py-4 text-sm text-gray-600">No templates found.</td>
                </tr>
              ) : (
                rows.map((t, idx) => (
                  <tr key={t?._id || `tpl-${idx}`} className="text-sm text-gray-700">
                    <td className="py-2 pr-4 font-semibold text-gray-900">{t?.name || "—"}</td>
                    <td className="py-2 pr-4 text-gray-600">{String(t?.channel || "").toUpperCase() || "—"}</td>
                    <td className="py-2 pr-4 text-gray-600">{String(t?.message || "").slice(0, 60) || "—"}</td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(t)}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(t?._id)}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-gray-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MessagesTable({ title, open, query, onOpenDeliveryReport, onWalletUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const { can } = useContext(PermissionContext) || {};
  const canUpdate = useMemo(() => (typeof can === "function" ? can("announcements", "update") : true), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("announcements", "delete") : true), [can]);

  const [menuId, setMenuId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const isScheduledView = String(query?.status || "") === "scheduled";

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

  const onDeleteRow = async (row) => {
    const id = String(row?._id || "");
    if (!id) return;
    const ok = window.confirm("Delete this scheduled message? This will refund its credits back to the wallet.");
    if (!ok) return;

    setMenuId(null);
    setActionLoadingId(id);
    setError("");
    try {
      await deleteCommunicationMessage(id);
      await load();
      if (typeof onWalletUpdated === "function") {
        await onWalletUpdated();
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete message");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {error ? <div className="mt-1 text-xs text-red-700">{error}</div> : null}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      <div className="p-5 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Channel</th>
              <th className="py-2 pr-4">Recipients</th>
              <th className="py-2 pr-4">Delivered</th>
              <th className="py-2 pr-4">Failed</th>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-4 text-sm text-gray-600">Loading...</td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={7} className="py-4 text-sm text-gray-600">No messages found.</td>
              </tr>
            ) : (
              rows.map((m, idx) => (
                <tr key={m?._id || `m-${idx}`} className="text-sm text-gray-700">
                  <td className="py-2 pr-4 font-semibold text-gray-900">{m?.title || "—"}</td>
                  <td className="py-2 pr-4 text-gray-600">{Array.isArray(m?.channels) ? m.channels.map((c) => String(c).toUpperCase()).join(", ") : "—"}</td>
                  <td className="py-2 pr-4 text-gray-600">{typeof m?.recipientCount === "number" ? m.recipientCount : "—"}</td>
                  <td className="py-2 pr-4 text-gray-600">{typeof m?.deliveredCount === "number" ? m.deliveredCount : "—"}</td>
                  <td className="py-2 pr-4 text-gray-600">{typeof m?.failedCount === "number" ? m.failedCount : "—"}</td>
                  <td className="py-2 pr-4 text-gray-600">{m?.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}</td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDeliveryReport(m)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-gray-50"
                      >
                        View Report
                      </button>

                      {isScheduledView && String(m?.status || "") === "scheduled" && (canUpdate || canDelete) ? (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setMenuId((cur) => (cur === m?._id ? null : m?._id))}
                            disabled={actionLoadingId === m?._id}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            aria-label="More actions"
                          >
                            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                              <path d="M10 4.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 4.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 4.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                            </svg>
                          </button>

                          {menuId === m?._id ? (
                            <div className="absolute right-0 mt-1 w-32 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10">
                              {canUpdate ? (
                                <button
                                  type="button"
                                  onClick={() => openEdit(m)}
                                  className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                              ) : null}
                              {canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => onDeleteRow(m)}
                                  className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
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
    </div>
  );
}

function EditScheduledMessageModal({ open, onClose, message, onSave, loading }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [error, setError] = useState("");

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
    if (!d || !tm) {
      setError("Scheduled date and time are required");
      return;
    }

    setError("");
    await onSave({ title: t, content: c, scheduledDate: d, scheduledTime: tm });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Edit Scheduled Message</div>
            <div className="mt-1 text-xs text-gray-500">This will update the message before it is sent.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="p-5">
          {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
                placeholder="Message title"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Message</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
                rows={5}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
                placeholder="Message content"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Scheduled Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                disabled={loading}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Scheduled Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                disabled={loading}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);

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
        setRows(Array.isArray(res?.data?.deliveries) ? res.data.deliveries : []);
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Delivery Report</div>
            <div className="mt-1 text-xs text-gray-500">{message?.title || "—"}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="p-5">
          {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-500">Title</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{message?.title || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Channel</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {Array.isArray(message?.channels) && message.channels.length
                    ? message.channels.map((c) => String(c).toUpperCase()).join(", ")
                    : "—"}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-gray-500">Message Content</div>
                <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{message?.content || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Audience</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{String(message?.audience?.type || "all")}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Send Options</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {String(message?.status || "—")}
                  {message?.scheduledAt ? ` • ${new Date(message.scheduledAt).toLocaleString()}` : ""}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold text-gray-500">Total Recipients</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{stats?.total ?? message?.recipientCount ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold text-gray-500">Sent</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{stats?.sent ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold text-gray-500">Delivered</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{stats?.delivered ?? message?.deliveredCount ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold text-gray-500">Failed</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{stats?.failed ?? message?.failedCount ?? 0}</div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500">
                  <th className="py-2 pr-4">Member</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-sm text-gray-600">Loading...</td>
                  </tr>
                ) : !rows.length ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-sm text-gray-600">No delivery records.</td>
                  </tr>
                ) : (
                  rows.map((d, idx) => (
                    <tr key={d?._id || `d-${idx}`} className="text-sm text-gray-700">
                      <td className="py-2 pr-4 font-semibold text-gray-900">{d?.memberName || "—"}</td>
                      <td className="py-2 pr-4 text-gray-600">{d?.phone || "—"}</td>
                      <td className="py-2 pr-4 text-gray-600">{d?.status || "—"}</td>
                      <td className="py-2 text-gray-600">{d?.updatedAt ? new Date(d.updatedAt).toLocaleString() : d?.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunicationTab({ open, wallet, onSent }) {
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("announcements", "read") : true), [can]);
  const canWrite = useMemo(() => (typeof can === "function" ? can("announcements", "create") : true), [can]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [audienceType, setAudienceType] = useState("all");

  const [groups, setGroups] = useState([]);
  const [cells, setCells] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [groupIds, setGroupIds] = useState([]);
  const [cellIds, setCellIds] = useState([]);
  const [departmentIds, setDepartmentIds] = useState([]);

  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [memberNameById, setMemberNameById] = useState({});

  const [channels, setChannels] = useState({ sms: true, whatsapp: false });

  const [sendMode, setSendMode] = useState("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);
  const [estimatedCostPerRecipient, setEstimatedCostPerRecipient] = useState(0);
  const [estimatedTotalCostServer, setEstimatedTotalCostServer] = useState(0);

  const totalRecipientsPreview = useMemo(() => {
    if (audienceType === "members") return memberIds.length;
    return estimatedRecipients;
  }, [audienceType, estimatedRecipients, memberIds.length]);

  const costPerRecipient = useMemo(() => {
    const smsCost = channels.sms ? 5 : 0;
    const waCost = channels.whatsapp ? 20 : 0;
    return smsCost + waCost;
  }, [channels.sms, channels.whatsapp]);

  const estimatedTotalCost = useMemo(() => {
    if (audienceType === "members") return totalRecipientsPreview * costPerRecipient;
    return estimatedTotalCostServer;
  }, [audienceType, costPerRecipient, estimatedTotalCostServer, totalRecipientsPreview]);

  const walletCredits = Number(wallet?.balanceCredits || 0);
  const hasEnoughCredits = walletCredits >= estimatedTotalCost;

  const messageCharCount = String(content || "").length;

  useEffect(() => {
    if (!open) return;

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

    if (audienceType === "groups" && !groupIds.length && !cellIds.length && !departmentIds.length) {
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
            memberIds
          },
          channels: selectedChannels
        });

        if (cancelled) return;
        setEstimatedRecipients(Number(res?.data?.recipientCount || 0));
        setEstimatedCostPerRecipient(Number(res?.data?.costPerRecipientCredits || 0));
        setEstimatedTotalCostServer(Number(res?.data?.totalCostCredits || 0));
      } catch (e) {
        if (cancelled) return;
        setEstimatedRecipients(0);
        setEstimatedCostPerRecipient(0);
        setEstimatedTotalCostServer(0);
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
  }, [audienceType, cellIds, channels, departmentIds, groupIds, memberIds, open]);

  useEffect(() => {
    if (!open) return;
    if (!canRead) return;

    let cancelled = false;

    const load = async () => {
      try {
        const [g, c, d] = await Promise.allSettled([
          getGroups({ page: 1, limit: 200 }),
          getCells({ page: 1, limit: 200 }),
          getDepartments({ page: 1, limit: 200 })
        ]);

        if (cancelled) return;

        const groupsRows = g.status === "fulfilled" ? (Array.isArray(g.value?.data?.groups) ? g.value.data.groups : []) : [];
        const cellsRows = c.status === "fulfilled" ? (Array.isArray(c.value?.data?.cells) ? c.value.data.cells : []) : [];
        const departmentsRows = d.status === "fulfilled" ? (Array.isArray(d.value?.data?.departments) ? d.value.data.departments : []) : [];

        setGroups(groupsRows);
        setCells(cellsRows);
        setDepartments(departmentsRows);
      } catch {
        if (cancelled) return;
        setGroups([]);
        setCells([]);
        setDepartments([]);
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
    if (q.length < 2) {
      setMemberResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await getMembers({ search: q, fastSearch: 1, limit: 10, page: 1 });
        const payload = res?.data?.data ?? res?.data;
        const rows = Array.isArray(payload?.members) ? payload.members : [];
        setMemberResults(rows);
      } catch {
        setMemberResults([]);
      }
    }, 120);

    return () => clearTimeout(t);
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
    setMemberSearch("");
    setMemberResults([]);
    setMemberIds([]);
    setMemberNameById({});
    setChannels({ sms: true, whatsapp: false });
    setSendMode("now");
    setScheduleDate("");
    setScheduleTime("");

    setEstimateLoading(false);
    setEstimateError("");
    setEstimatedRecipients(0);
    setEstimatedCostPerRecipient(0);
    setEstimatedTotalCostServer(0);
  };

  const onSend = async ({ draft = false } = {}) => {
    if (!canWrite) return;

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
          memberIds
        },
        channels: selectedChannels,
        sendMode: draft ? "draft" : sendMode,
        scheduledDate: sendMode === "schedule" ? scheduleDate : null,
        scheduledTime: sendMode === "schedule" ? scheduleTime : null
      };

      await createCommunicationMessage(payload);
      setSuccess(draft ? "Draft saved" : sendMode === "schedule" ? "Message scheduled" : "Message sent");
      resetForm();
      onSent?.();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mt-5">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div> : null}

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="text-sm font-semibold text-gray-900">Announcement Info</div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          />

          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Message content"
              className="min-h-[140px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            />
            <div className="mt-1 text-xs text-gray-500">Characters: {messageCharCount}</div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="text-sm font-semibold text-gray-900">Select Audience</div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" checked={audienceType === "all"} onChange={() => setAudienceType("all")} />
              All Members
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" checked={audienceType === "groups"} onChange={() => setAudienceType("groups")} />
              Specific Groups / Cells / Departments
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" checked={audienceType === "members"} onChange={() => setAudienceType("members")} />
              Specific Members
            </label>
          </div>

          {audienceType === "groups" ? (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-600">Groups</div>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                  {groups.length ? (
                    <label className="flex items-center gap-2 py-1 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={groups.every((g) => groupIds.includes(String(g?._id || "")))}
                        onChange={() =>
                          setGroupIds((prev) => {
                            const allIds = groups.map((g) => String(g?._id || "")).filter(Boolean);
                            const allSelected = allIds.length > 0 && allIds.every((id) => prev.includes(id));
                            return allSelected ? [] : allIds;
                          })
                        }
                      />
                      Select all groups
                    </label>
                  ) : null}
                  {!groups.length ? <div className="text-sm text-gray-600">No groups found.</div> : null}
                  {groups.map((g) => (
                    <label key={g?._id} className="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={groupIds.includes(String(g?._id || ""))}
                        onChange={() => setGroupIds((prev) => toggleId(prev, g?._id))}
                      />
                      {g?.name || "—"}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Cells</div>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                  {cells.length ? (
                    <label className="flex items-center gap-2 py-1 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={cells.every((c) => cellIds.includes(String(c?._id || "")))}
                        onChange={() =>
                          setCellIds((prev) => {
                            const allIds = cells.map((c) => String(c?._id || "")).filter(Boolean);
                            const allSelected = allIds.length > 0 && allIds.every((id) => prev.includes(id));
                            return allSelected ? [] : allIds;
                          })
                        }
                      />
                      Select all cells
                    </label>
                  ) : null}
                  {!cells.length ? <div className="text-sm text-gray-600">No cells found.</div> : null}
                  {cells.map((c) => (
                    <label key={c?._id} className="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={cellIds.includes(String(c?._id || ""))}
                        onChange={() => setCellIds((prev) => toggleId(prev, c?._id))}
                      />
                      {c?.name || "—"}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Departments</div>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                  {departments.length ? (
                    <label className="flex items-center gap-2 py-1 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={departments.every((d) => departmentIds.includes(String(d?._id || "")))}
                        onChange={() =>
                          setDepartmentIds((prev) => {
                            const allIds = departments.map((d) => String(d?._id || "")).filter(Boolean);
                            const allSelected = allIds.length > 0 && allIds.every((id) => prev.includes(id));
                            return allSelected ? [] : allIds;
                          })
                        }
                      />
                      Select all departments
                    </label>
                  ) : null}
                  {!departments.length ? <div className="text-sm text-gray-600">No departments found.</div> : null}
                  {departments.map((d) => (
                    <label key={d?._id} className="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={departmentIds.includes(String(d?._id || ""))}
                        onChange={() => setDepartmentIds((prev) => toggleId(prev, d?._id))}
                      />
                      {d?.name || "—"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {audienceType === "members" ? (
            <div className="mt-4">
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members by name..."
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />

              {memberResults.length ? (
                <div className="mt-2 rounded-lg border border-gray-200 bg-white">
                  {memberResults.map((m) => {
                    const id = String(m?._id || "");
                    const checked = id ? memberIds.includes(id) : false;
                    return (
                      <label
                        key={id}
                        className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                  <div className="text-xs font-semibold text-gray-600">Selected Members</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {memberIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => removeMember(id)}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        {memberNameById?.[id] || id.slice(-6)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Click a chip to remove.</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="text-sm font-semibold text-gray-900">Select Channel</div>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={channels.sms}
                onChange={(e) => setChannels((prev) => ({ ...prev, sms: e.target.checked }))}
              />
              SMS
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={channels.whatsapp}
                onChange={(e) => setChannels((prev) => ({ ...prev, whatsapp: e.target.checked }))}
              />
              WhatsApp
            </label>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="text-sm font-semibold text-gray-900">Message Cost Preview</div>
          {estimateError ? <div className="mt-2 text-xs font-semibold text-red-700">{estimateError}</div> : null}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold text-gray-500">Cost per Recipient</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">
                {(audienceType === "members" ? costPerRecipient : estimatedCostPerRecipient || costPerRecipient)} credits
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold text-gray-500">Estimated Total Cost</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{estimateLoading ? "Calculating..." : `${estimatedTotalCost} credits`}</div>
              <div className="mt-1 text-xs text-gray-500">Wallet: {walletCredits} credits</div>
            </div>
          </div>

          {!hasEnoughCredits && estimatedTotalCost > 0 ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Insufficient credits. Please fund your wallet.
            </div>
          ) : null}

          {audienceType !== "members" ? (
            <div className="mt-2 text-xs text-gray-500">Recipient counts and costs for All Members and Groups/Cells/Departments are computed accurately on the server.</div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="text-sm font-semibold text-gray-900">Send Options</div>

          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" checked={sendMode === "now"} onChange={() => setSendMode("now")} />
              Send Immediately
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" checked={sendMode === "schedule"} onChange={() => setSendMode("schedule")} />
              Schedule Message
            </label>
          </div>

          {sendMode === "schedule" ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSend({ draft: true })}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => onSend({ draft: false })}
            disabled={loading || (!hasEnoughCredits && estimatedTotalCost > 0)}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Announcement"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AnnouncementPage() {
  const { can } = useContext(PermissionContext) || {};
  const { user } = useAuth();
  const canRead = useMemo(() => (typeof can === "function" ? can("announcements", "read") : true), [can]);

  const [tab, setTab] = useState("communication");

  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [wallet, setWallet] = useState(null);

  const [fundOpen, setFundOpen] = useState(false);
  const [fundLoading, setFundLoading] = useState(false);
  const [fundError, setFundError] = useState("");

  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [transactions, setTransactions] = useState([]);

  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryRow, setDeliveryRow] = useState(null);

  const loadWallet = async () => {
    if (!canRead) return;
    setWalletLoading(true);
    setWalletError("");
    try {
      const res = await getWallet();
      setWallet(res?.data?.wallet || null);
    } catch (e) {
      setWallet(null);
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
        import.meta.env.TEST_PUBLC_KEY ||
        import.meta.env.TEST_PUBLIC_KEY ||
        import.meta.env.VITE_TEST_PUBLC_KEY ||
        import.meta.env.VITE_TEST_PUBLIC_KEY ||
        import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
        "";
      if (!key) {
        setFundError(
          "Paystack public key is not configured. Set VITE_TEST_PUBLC_KEY=pk_test_... (or TEST_PUBLC_KEY=pk_test_...) in frontend .env, then restart the frontend."
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

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Announcement</h2>
          <p className="mt-2 text-sm text-gray-600">Send announcements via SMS, WhatsApp, or both. Track delivery and manage wallet credits.</p>
        </div>
      </div>

      {walletError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{walletError}</div> : null}

      <div className="mt-6">
        <WalletCard
          wallet={wallet}
          onFund={openFund}
          onViewHistory={() => setTab("wallet-history")}
        />
        {walletLoading ? <div className="mt-2 text-xs text-gray-500">Loading wallet...</div> : null}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-1 flex-wrap">
            <TabButton active={tab === "communication"} onClick={() => setTab("communication")}>Communication</TabButton>
            <TabButton active={tab === "sent"} onClick={() => setTab("sent")}>Sent Messages</TabButton>
            <TabButton active={tab === "scheduled"} onClick={() => setTab("scheduled")}>Scheduled Messages</TabButton>
            <TabButton active={tab === "templates"} onClick={() => setTab("templates")}>Templates</TabButton>
            <TabButton active={tab === "wallet-history"} onClick={() => setTab("wallet-history")}>Wallet History</TabButton>
            <TabButton active={tab === "message-history"} onClick={() => setTab("message-history")}>Message History</TabButton>
          </div>
        </div>
      </div>

      <CommunicationTab open={tab === "communication"} wallet={wallet} onSent={onMessageSent} />

      <MessagesTable
        title="Sent Messages"
        open={tab === "sent"}
        query={{ status: "sent" }}
        onOpenDeliveryReport={openDelivery}
      />

      <MessagesTable
        title="Scheduled Messages"
        open={tab === "scheduled"}
        query={{ status: "scheduled" }}
        onOpenDeliveryReport={openDelivery}
      />

      <TemplatesTab open={tab === "templates"} />

      <WalletHistoryTab
        open={tab === "wallet-history"}
        transactions={transactions}
        loading={txLoading}
        error={txError}
        onReload={loadTx}
      />

      <MessagesTable
        title="Message History"
        open={tab === "message-history"}
        query={{}}
        onOpenDeliveryReport={openDelivery}
      />

      <FundWalletModal
        open={fundOpen}
        onClose={closeFund}
        onFund={onFund}
        loading={fundLoading}
        error={fundError}
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
