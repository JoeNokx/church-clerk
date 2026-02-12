import { useCallback, useEffect, useState } from "react";

import { adminGetRevenue } from "../Services/adminBilling.api.js";

const money = (map, currency) => {
  const v = map?.[currency];
  if (v === undefined || v === null) return "—";
  return `${Number(v || 0).toLocaleString()} ${currency}`;
};

function BillingRevenuePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminGetRevenue();
      setData(res?.data || null);
    } catch (e) {
      setData(null);
      setError(e?.response?.data?.message || e?.message || "Failed to load revenue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals || {};
  const kpis = data?.kpis || {};

  return (
    <div className="space-y-4">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase">Total Revenue</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">{money(totals?.totalRevenue, "GHS")}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase">This Month</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">{money(totals?.revenueThisMonth, "GHS")}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase">This Year</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">{money(totals?.revenueThisYear, "GHS")}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase">Active Subscriptions</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{kpis?.activeSubscriptions ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase">Expiring (7 days)</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{kpis?.expiringSubscriptions ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase">Failed Payments (month)</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{kpis?.failedPayments ?? "—"}</div>
        </div>
      </div>

      {loading ? <div className="text-sm text-gray-500">Loading...</div> : null}
    </div>
  );
}

export default BillingRevenuePage;
