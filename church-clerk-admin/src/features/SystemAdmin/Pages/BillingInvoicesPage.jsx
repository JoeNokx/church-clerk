import { useCallback, useEffect, useState } from "react";

import {
  adminCreateInvoice,
  adminGetInvoiceDownloadUrl,
  adminGetInvoices,
  adminMarkInvoiceStatus
} from "../Services/adminBilling.api.js";

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

  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

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

  const onCreate = async () => {
    const churchId = window.prompt("Church ID");
    if (!churchId) return;
    const subscriptionId = window.prompt("Subscription ID");
    if (!subscriptionId) return;
    const amount = window.prompt("Amount (number)");
    if (!amount) return;

    setLoading(true);
    setError("");
    try {
      await adminCreateInvoice({
        churchId,
        subscriptionId,
        amount: Number(amount),
        currency: "GHS",
        dueDate: null
      });
      await load({ nextPage: 1 });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
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
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">Invoices</div>
          <div className="mt-1 text-sm text-gray-600">Generate and manage invoices.</div>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Generate Invoice
        </button>
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
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No invoices found.
                </td>
              </tr>
            ) : (
              rows.map((i) => (
                <tr key={i?._id} className="border-b last:border-b-0">
                  <td className="py-3 text-gray-900">{i?.invoiceNumber || "—"}</td>
                  <td className="py-3 text-gray-700">{i?.church?.name || "—"}</td>
                  <td className="py-3 text-gray-700">
                    {Number(i?.amount || 0).toLocaleString()} {i?.currency || ""}
                  </td>
                  <td className="py-3 text-gray-700">{fmtDate(i?.dueDate)}</td>
                  <td className="py-3 text-gray-700">{i?.status || "—"}</td>
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
  );
}

export default BillingInvoicesPage;
