import { useCallback, useEffect, useState } from "react";

import { adminGetPayments, adminVerifyPayment } from "../Services/adminBilling.api.js";

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

function BillingPaymentsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const load = useCallback(
    async ({ nextPage } = {}) => {
      const actualPage = nextPage ?? page;
      setLoading(true);
      setError("");
      try {
        const res = await adminGetPayments({ page: actualPage, limit, status: status || undefined });
        setRows(Array.isArray(res?.data?.payments) ? res.data.payments : []);
        setPagination(res?.data?.pagination || null);
        setPage(actualPage);
      } catch (e) {
        setRows([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load payments");
      } finally {
        setLoading(false);
      }
    },
    [limit, page, status]
  );

  useEffect(() => {
    load({ nextPage: 1 });
  }, [status, load]);

  const onVerify = async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      await adminVerifyPayment(id);
      await load({ nextPage: 1 });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to verify payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">Payments</div>
          <div className="mt-1 text-sm text-gray-600">View payment transactions across churches.</div>
        </div>
        <div className="flex-1" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full md:w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All statuses</option>
          <option value="paid">paid</option>
          <option value="failed">failed</option>
          <option value="pending">pending</option>
        </select>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr className="border-b">
              <th className="py-3 text-left font-semibold">Church</th>
              <th className="py-3 text-left font-semibold">Plan</th>
              <th className="py-3 text-left font-semibold">Amount</th>
              <th className="py-3 text-left font-semibold">Method</th>
              <th className="py-3 text-left font-semibold">Reference</th>
              <th className="py-3 text-left font-semibold">Status</th>
              <th className="py-3 text-left font-semibold">Date</th>
              <th className="py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-500">
                  No payments found.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p?._id} className="border-b last:border-b-0">
                  <td className="py-3 text-gray-900">{p?.church?.name || "—"}</td>
                  <td className="py-3 text-gray-700">{p?.subscription?.plan?.name || p?.invoiceSnapshot?.planName || "—"}</td>
                  <td className="py-3 text-gray-700">
                    {Number(p?.amount || 0).toLocaleString()} {p?.currency || ""}
                  </td>
                  <td className="py-3 text-gray-700">{p?.paymentProvider || "—"}</td>
                  <td className="py-3 text-gray-700">{p?.providerReference || "—"}</td>
                  <td className="py-3 text-gray-700">{p?.status || "—"}</td>
                  <td className="py-3 text-gray-700">{fmtDateTime(p?.createdAt)}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onVerify(p?._id)}
                      className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Verify
                    </button>
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
  );
}

export default BillingPaymentsPage;
