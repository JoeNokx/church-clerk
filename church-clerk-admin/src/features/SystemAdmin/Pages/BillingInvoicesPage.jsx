import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminCreateInvoice,
  adminGetInvoiceDownloadUrl,
  adminGetInvoices,
  adminMarkInvoiceStatus
} from "../Services/adminBilling.api.js";
import { adminGetSubscriptions } from "../Services/adminBilling.api.js";

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

function BillingInvoicesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState({ subscriptionId: "", amount: "", currency: "GHS", dueDate: "" });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [currency, setCurrency] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const cur = String(currency || "").trim().toUpperCase();
    return (Array.isArray(rows) ? rows : []).filter((i) => {
      if (cur && String(i?.currency || "").toUpperCase() !== cur) return false;
      if (!q) return true;
      const invoiceNumber = String(i?.invoiceNumber || "").toLowerCase();
      const churchName = String(i?.church?.name || "").toLowerCase();
      const st = String(i?.status || "").toLowerCase();
      return invoiceNumber.includes(q) || churchName.includes(q) || st.includes(q);
    });
  }, [currency, rows, search]);

  const load = useCallback(
    async ({ nextPage } = {}) => {
      const actualPage = nextPage ?? page;
      setLoading(true);
      setError("");
      try {
        const res = await adminGetInvoices({ page: actualPage, limit, status: status || undefined });
        setRows(Array.isArray(res?.data?.invoices) ? res.data.invoices : []);
        setPagination(res?.data?.pagination || null);
        setPage(actualPage);
      } catch (e) {
        setRows([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    },
    [limit, page, status]
  );

  useEffect(() => {
    load({ nextPage: 1 });
  }, [status, load]);

  const openCreate = async () => {
    setCreateOpen(true);
    setCreateError("");
    setForm({ subscriptionId: "", amount: "", currency: "GHS", dueDate: "" });
    try {
      const res = await adminGetSubscriptions();
      setSubscriptions(Array.isArray(res?.data?.subscriptions) ? res.data.subscriptions : []);
    } catch (_) {
      setSubscriptions([]);
    }
  };

  const submitCreate = async () => {
    const sub = subscriptions.find((s) => s._id === form.subscriptionId);
    if (!form.subscriptionId || !sub) {
      setCreateError("Please select a subscription.");
      return;
    }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setCreateError("Enter a valid amount.");
      return;
    }
    setCreateLoading(true);
    setCreateError("");
    try {
      await adminCreateInvoice({
        churchId: sub.church?._id || sub.church,
        subscriptionId: form.subscriptionId,
        amount: Number(form.amount),
        currency: form.currency || "GHS",
        dueDate: form.dueDate || null
      });
      setCreateOpen(false);
      await load({ nextPage: 1 });
    } catch (e) {
      setCreateError(e?.response?.data?.message || e?.message || "Failed to create invoice");
    } finally {
      setCreateLoading(false);
    }
  };

  const onMark = async (id, nextStatus) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      await adminMarkInvoiceStatus(id, { status: nextStatus });
      await load({ nextPage: 1 });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to update invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">Invoices</div>
          <div className="mt-1 text-sm text-gray-500">Generate and manage invoices for church subscriptions.</div>
        </div>
        <button type="button" onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Generate Invoice
        </button>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice #, church, status..."
          className="w-full md:w-80 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full md:w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All statuses</option>
          <option value="paid">paid</option>
          <option value="unpaid">unpaid</option>
        </select>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full md:w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All currencies</option>
          <option value="GHS">GHS</option>
          <option value="NGN">NGN</option>
          <option value="USD">USD</option>
        </select>
        <div className="flex-1" />
        <div className="text-xs text-gray-500">{filtered.length} invoice(s)</div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr className="border-b">
              <th className="py-3 text-left font-semibold">Invoice #</th>
              <th className="py-3 text-left font-semibold">Church</th>
              <th className="py-3 text-left font-semibold">Amount</th>
              <th className="py-3 text-left font-semibold">Due</th>
              <th className="py-3 text-left font-semibold">Status</th>
              <th className="py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                  </tr>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No invoices found.
                </td>
              </tr>
            ) : (
              filtered.map((i) => (
                <tr key={i?._id} className="border-b last:border-b-0">
                  <td className="py-3 text-gray-900">{i?.invoiceNumber || "—"}</td>
                  <td className="py-3 text-gray-700">{i?.church?.name || "—"}</td>
                  <td className="py-3 text-gray-700">
                    {Number(i?.amount || 0).toLocaleString()} {i?.currency || ""}
                  </td>
                  <td className="py-3 text-gray-700">{fmtDate(i?.dueDate)}</td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      i?.status === "paid" ? "bg-green-100 text-green-700" :
                      i?.status === "unpaid" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{i?.status || "—"}</span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={adminGetInvoiceDownloadUrl(i?._id)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => onMark(i?._id, i?.status === "paid" ? "unpaid" : "paid")}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Mark {i?.status === "paid" ? "Unpaid" : "Paid"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => load({ nextPage: Math.max(1, page - 1) })}
          disabled={loading || !(pagination?.prevPage ?? false)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
        >
          Prev
        </button>
        <div className="text-xs text-gray-600">
          Page {page}
          {pagination?.totalPages ? ` / ${pagination.totalPages}` : ""}
        </div>
        <button
          type="button"
          onClick={() => load({ nextPage: page + 1 })}
          disabled={loading || !(pagination?.nextPage ?? false)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>

    {/* Create Invoice Modal */}
    {createOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <div className="text-base font-bold text-gray-900 mb-1">Generate Invoice</div>
          <div className="text-sm text-gray-500 mb-4">Create a manual invoice for a church subscription.</div>
          {createError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{createError}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subscription</label>
              <select value={form.subscriptionId}
                onChange={(e) => setForm((f) => ({ ...f, subscriptionId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">— select a subscription —</option>
                {subscriptions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.church?.name || s._id} — {s.plan?.name || "—"} ({s.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount</label>
                <input type="number" min="0" value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="w-28">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
                <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="GHS">GHS</option>
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date (optional)</label>
              <input type="date" value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setCreateOpen(false)} disabled={createLoading}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={submitCreate} disabled={createLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {createLoading ? "Creating…" : "Generate"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default BillingInvoicesPage;
