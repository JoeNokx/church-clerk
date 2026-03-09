import { useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import { getGroups } from "../../group/services/group.api.js";
import { getCells } from "../../cell/services/cell.api.js";
import { getDepartments } from "../../department/services/department.api.js";
import { getMembers } from "../../member/services/member.api.js";
import {
  createCommunicationMessage,
  fundWalletInitiate,
  getWallet,
  getWalletTransactions,
  getCommunicationMessages,
  getMessageDeliveryReport,
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
              disabled={loading}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Processing..." : "Proceed to Paystack"}
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
    if (!canRead) return;
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
  }, [open]);

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
        <div className="mt-1 text-xs text-gray-500">Save and reuse messages. Variables like {{first_name}} are allowed.</div>

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          />

          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            className="min-h-[120px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={loading}
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

function MessagesTable({ title, open, query, onOpenDeliveryReport }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

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

  if (!open) return null;

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
                    </div>
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

  const [channels, setChannels] = useState({ sms: true, whatsapp: false });

  const [sendMode, setSendMode] = useState("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const totalRecipientsPreview = useMemo(() => {
    if (audienceType === "members") return memberIds.length;
    if (audienceType === "groups") {
      // This is a preview only; accurate count is computed server-side.
      return 0;
    }
    return 0;
  }, [audienceType, memberIds.length]);

  const costPerRecipient = useMemo(() => {
    const smsCost = channels.sms ? 5 : 0;
    const waCost = channels.whatsapp ? 20 : 0;
    return smsCost + waCost;
  }, [channels.sms, channels.whatsapp]);

  const estimatedTotalCost = useMemo(() => {
    return totalRecipientsPreview * costPerRecipient;
  }, [costPerRecipient, totalRecipientsPreview]);

  const walletCredits = Number(wallet?.balanceCredits || 0);
  const hasEnoughCredits = walletCredits >= estimatedTotalCost;

  const messageCharCount = String(content || "").length;

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
        const res = await getMembers({ search: q, limit: 10, page: 1 });
        const payload = res?.data?.data ?? res?.data;
        const rows = Array.isArray(payload?.members) ? payload.members : [];
        setMemberResults(rows);
      } catch {
        setMemberResults([]);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [audienceType, memberSearch, open]);

  const toggleId = (list, id) => {
    const sid = String(id || "");
    if (!sid) return list;
    if (list.includes(sid)) return list.filter((x) => x !== sid);
    return [...list, sid];
  };

  const addMember = (m) => {
    const id = String(m?._id || "");
    if (!id) return;
    setMemberIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeMember = (id) => {
    const sid = String(id || "");
    setMemberIds((prev) => prev.filter((x) => x !== sid));
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
    setChannels({ sms: true, whatsapp: false });
    setSendMode("now");
    setScheduleDate("");
    setScheduleTime("");
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
                  {memberResults.map((m) => (
                    <button
                      key={m?._id}
                      type="button"
                      onClick={() => addMember(m)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || m?.fullName || "—"}
                    </button>
                  ))}
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
                        {id.slice(-6)}
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
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold text-gray-500">Cost per Recipient</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{costPerRecipient} credits</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold text-gray-500">Estimated Total Cost</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{estimatedTotalCost} credits</div>
              <div className="mt-1 text-xs text-gray-500">Wallet: {walletCredits} credits</div>
            </div>
          </div>

          {!hasEnoughCredits && estimatedTotalCost > 0 ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Insufficient credits. Please fund your wallet.
            </div>
          ) : null}

          {audienceType !== "members" ? (
            <div className="mt-2 text-xs text-gray-500">Recipient counts for All Members and Groups are computed accurately on the server.</div>
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
    if (!Number.isFinite(n) || n <= 0) {
      setFundError("Please enter a valid amount");
      return;
    }

    setFundLoading(true);
    setFundError("");

    try {
      const res = await fundWalletInitiate({ amount: n });
      const url = res?.data?.authorizationUrl || "";
      if (!url) {
        setFundError("Unable to start Paystack payment");
        return;
      }

      window.location.href = url;
    } catch (e) {
      setFundError(e?.response?.data?.message || e?.message || "Failed to initiate payment");
    } finally {
      setFundLoading(false);
    }
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

      <CommunicationTab open={tab === "communication"} wallet={wallet} onSent={() => {}} />

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
