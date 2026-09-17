import { useCallback, useEffect, useMemo, useState } from "react";

import { adminGetPayments, adminVerifyPayment } from "../Services/adminBilling.api.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import Card from "../../../shared/components/Card/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";

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

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [currency, setCurrency] = useState("");
  const [provider, setProvider] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const cur = String(currency || "").trim().toUpperCase();
    const prov = String(provider || "").trim().toLowerCase();
    return (Array.isArray(rows) ? rows : []).filter((p) => {
      if (cur && String(p?.currency || "").toUpperCase() !== cur) return false;
      if (prov && String(p?.paymentProvider || "").toLowerCase() !== prov) return false;
      if (!q) return true;

      const churchName = String(p?.church?.name || "").toLowerCase();
      const planName = String(p?.subscription?.plan?.name || p?.invoiceSnapshot?.planName || "").toLowerCase();
      const ref = String(p?.providerReference || "").toLowerCase();
      const st = String(p?.status || "").toLowerCase();

      return churchName.includes(q) || planName.includes(q) || ref.includes(q) || st.includes(q);
    });
  }, [currency, provider, rows, search]);

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
    <Card>
      <Card.Header title="Payments" />
      <p className="-mt-2 text-sm text-gray-600">View payment transactions across churches.</p>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search church, plan, reference..."
        selects={[
          {
            key: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: [
              { label: "paid", value: "paid" },
              { label: "failed", value: "failed" },
              { label: "pending", value: "pending" },
            ],
          },
          {
            key: "currency",
            value: currency,
            onChange: setCurrency,
            placeholder: "All currencies",
            options: [
              { label: "GHS", value: "GHS" },
              { label: "NGN", value: "NGN" },
              { label: "USD", value: "USD" },
            ],
          },
          {
            key: "provider",
            value: provider,
            onChange: setProvider,
            placeholder: "All providers",
            options: [{ label: "paystack", value: "paystack" }],
          },
        ]}
      />

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="overflow-x-auto">
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
              <>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                  </tr>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    compact
                    illustration="billing"
                    title="No payments found"
                    description="Try adjusting your search or filters to see results."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p?._id} className="border-b last:border-b-0">
                  <td className="py-3 text-gray-900" title={p?.church?.name || ""}>
                    <span className="sm:hidden">{truncateMobileName(p?.church?.name)}</span>
                    <span className="hidden sm:inline">{truncateDesktopName(p?.church?.name)}</span>
                  </td>
                  <td className="py-3 text-gray-700" title={p?.subscription?.plan?.name || p?.invoiceSnapshot?.planName || ""}>
                    <span className="sm:hidden">{truncateMobileName(p?.subscription?.plan?.name || p?.invoiceSnapshot?.planName)}</span>
                    <span className="hidden sm:inline">{truncateDesktopName(p?.subscription?.plan?.name || p?.invoiceSnapshot?.planName)}</span>
                  </td>
                  <td className="py-3 text-gray-700">
                    {Number(p?.amount || 0).toLocaleString()} {p?.currency || ""}
                  </td>
                  <td className="py-3 text-gray-700">{p?.paymentProvider || "—"}</td>
                  <td className="py-3 text-gray-700">{p?.providerReference || "—"}</td>
                  <td className="py-3">
                    <StatusChip value={p?.status || "—"} />
                  </td>
                  <td className="py-3 text-gray-700">{fmtDateTime(p?.createdAt)}</td>
                  <td className="py-3 text-right">
                    {(p?.status === "pending" || p?.status === "failed") && p?.paymentProvider === "paystack" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onVerify(p?._id)}
                      >
                        Verify
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => load({ nextPage: Math.max(1, page - 1) })}
          disabled={loading || !(pagination?.prevPage ?? false)}
        >
          Prev
        </Button>
        <div className="text-xs text-gray-600">
          Page {page}
          {pagination?.totalPages ? ` / ${pagination.totalPages}` : ""}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => load({ nextPage: page + 1 })}
          disabled={loading || !(pagination?.nextPage ?? false)}
        >
          Next
        </Button>
      </div>
    </Card>
  );
}

export default BillingPaymentsPage;
