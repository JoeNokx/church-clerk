import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

import { adminGetRevenue } from "../Services/adminBilling.api.js";

const fmtMoney = (v, cur = "") => `${Number(v || 0).toLocaleString()} ${cur}`;

const money = (map, currency) => {
  const v = map?.[currency];
  if (v === undefined || v === null) return "—";
  return fmtMoney(v, currency);
};

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-xl border bg-white p-5 ${accent || "border-gray-200"}`}>
      <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value ?? "—"}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function BillingRevenuePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [currency, setCurrency] = useState("GHS");

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

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals || {};
  const kpis = data?.kpis || {};
  const monthlyTrend = Array.isArray(data?.monthlyTrend) ? data.monthlyTrend : [];
  const planRevenue = Array.isArray(data?.planRevenue) ? data.planRevenue : [];

  const maxPlanTotal = planRevenue.length > 0 ? Math.max(...planRevenue.map((p) => p.total || 0), 1) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div>
          <div className="text-2xl font-bold text-gray-900">Revenue</div>
          <div className="text-sm text-gray-500 mt-0.5">Financial overview across all churches</div>
        </div>
        <div className="flex-1" />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}
          className="w-full md:w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
          <option value="GHS">GHS</option>
          <option value="NGN">NGN</option>
          <option value="USD">USD</option>
        </select>
        <button type="button" onClick={load} disabled={loading}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[0,1,2,3,4,5].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="h-7 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard label="Total Revenue (All-time)" value={money(totals?.totalRevenue, currency)} accent="border-blue-100" />
            <KpiCard label="Revenue This Month" value={money(totals?.revenueThisMonth, currency)} accent="border-green-100" />
            <KpiCard label="Revenue This Year" value={money(totals?.revenueThisYear, currency)} />
            <KpiCard label="Active Subscriptions" value={kpis?.activeSubscriptions} />
            <KpiCard label="Expiring in 7 Days" value={kpis?.expiringSubscriptions} sub="Subscriptions needing attention" />
            <KpiCard label="Failed Payments (month)" value={kpis?.failedPayments} accent={kpis?.failedPayments > 0 ? "border-red-200" : "border-gray-200"} />
          </div>

          {monthlyTrend.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-sm font-semibold text-gray-900 mb-4">Monthly Revenue Trend (Last 12 Months)</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={(v, name) => [fmtMoney(v, currency), name === "amount" ? "Revenue" : "Transactions"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Legend formatter={(v) => v === "amount" ? "Revenue" : "Transactions"} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="amount" />
                  <Bar dataKey="transactions" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="transactions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {planRevenue.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-sm font-semibold text-gray-900 mb-4">Revenue by Plan</div>
              <div className="space-y-3">
                {planRevenue.map((p) => (
                  <div key={p.plan} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-gray-700 font-medium truncate shrink-0">{p.plan}</div>
                    <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.round((p.total / maxPlanTotal) * 100)}%` }} />
                    </div>
                    <div className="w-32 text-right text-xs text-gray-600 shrink-0">
                      {fmtMoney(p.total, currency)} <span className="text-gray-400">({p.count} txns)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BillingRevenuePage;
