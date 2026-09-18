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
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Church</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Plan</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Method</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Reference</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
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
                <tr key={p?._id} className="max-md:text-xs text-gray-700 text-sm">
                  <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={p?.church?.name || ""}>
                    <span className="sm:hidden">{truncateMobileName(p?.church?.name)}</span>
                    <span className="hidden sm:inline">{truncateDesktopName(p?.church?.name)}</span>
                  </td>
                  <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={p?.subscription?.plan?.name || p?.invoiceSnapshot?.planName || ""}>
                    <span className="sm:hidden">{truncateMobileName(p?.subscription?.plan?.name || p?.invoiceSnapshot?.planName)}</span>
                    <span className="hidden sm:inline">{truncateDesktopName(p?.subscription?.plan?.name || p?.invoiceSnapshot?.planName)}</span>
                  </td>
                  <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                    {Number(p?.amount || 0).toLocaleString()} {p?.currency || ""}
                  </td>
                  <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{p?.paymentProvider || "—"}</td>
                  <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{p?.providerReference || "—"}</td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                    <StatusChip value={p?.status || "—"} />
                  </td>
                  <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDateTime(p?.createdAt)}</td>
                  <td className="max-md:px-4 py-1.5 text-right whitespace-nowrap px-4 md:px-6">
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
