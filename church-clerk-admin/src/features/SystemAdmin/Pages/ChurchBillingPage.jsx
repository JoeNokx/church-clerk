import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import ChurchContext from "../../Church/church.store.js";

import { adminGetInvoices, adminGetPayments, adminGetPlans, adminGetSubscriptions } from "../Services/adminBilling.api.js";

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

function ChurchBillingPage() {
  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;
  const activeChurchId = activeChurch?._id ? String(activeChurch._id) : "";

  const churchCurrency = useMemo(() => {
    const c = String(activeChurch?.currency || "").trim().toUpperCase();
    return c || "USD";
  }, [activeChurch?.currency]);

  const [tab, setTab] = useState("overview");

  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState("");
  const [usdRates, setUsdRates] = useState(null);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);

  const loadRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError("");
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      if (!res.ok) throw new Error(`Exchange rate request failed (${res.status})`);
      const data = await res.json();
      setUsdRates(data?.rates || null);
      setRatesUpdatedAt(data?.time_last_updated ? new Date(data.time_last_updated * 1000) : new Date());
    } catch (e) {
      setUsdRates(null);
      setRatesUpdatedAt(null);
      setRatesError(e?.message || "Failed to load exchange rates");
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const convertCurrency = useCallback(
    (amount, fromCurrency, toCurrency) => {
      const a = Number(amount);
      if (!Number.isFinite(a)) return null;

      const from = String(fromCurrency || "").trim().toUpperCase();
      const to = String(toCurrency || "").trim().toUpperCase();
      if (!from || !to) return null;
      if (from === to) return a;

      const rates = usdRates;
      if (!rates || typeof rates !== "object") return null;

      const fromRate = from === "USD" ? 1 : Number(rates?.[from]);
      const toRate = to === "USD" ? 1 : Number(rates?.[to]);

      if (!Number.isFinite(fromRate) || fromRate <= 0) return null;
      if (!Number.isFinite(toRate) || toRate <= 0) return null;

      const usdAmount = from === "USD" ? a : a / fromRate;
      const out = to === "USD" ? usdAmount : usdAmount * toRate;
      return Number.isFinite(out) ? out : null;
    },
    [usdRates]
  );

  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");
  const [plans, setPlans] = useState([]);

  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState("");
  const [subs, setSubs] = useState([]);

  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState("");
  const [invoices, setInvoices] = useState([]);

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [payments, setPayments] = useState([]);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError("");
    try {
      const res = await adminGetPlans();
      setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : []);
    } catch (e) {
      setPlans([]);
      setPlansError(e?.response?.data?.message || e?.message || "Failed to load plans");
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    if (!activeChurchId) return;
    setSubsLoading(true);
    setSubsError("");
    try {
      const res = await adminGetSubscriptions();
      const rows = Array.isArray(res?.data?.subscriptions) ? res.data.subscriptions : [];
      const filtered = rows.filter((s) => String(s?.church?._id || "") === activeChurchId);
      setSubs(filtered);
    } catch (e) {
      setSubs([]);
      setSubsError(e?.response?.data?.message || e?.message || "Failed to load subscriptions");
    } finally {
      setSubsLoading(false);
    }
  }, [activeChurchId]);

  const loadInvoices = useCallback(async () => {
    if (!activeChurchId) return;
    setInvLoading(true);
    setInvError("");
    try {
      const res = await adminGetInvoices({ limit: 50, page: 1, churchId: activeChurchId });
      const rows = Array.isArray(res?.data?.invoices) ? res.data.invoices : [];
      const filtered = rows.filter((i) => String(i?.church?._id || "") === activeChurchId);
      setInvoices(filtered);
    } catch (e) {
      setInvoices([]);
      setInvError(e?.response?.data?.message || e?.message || "Failed to load invoices");
    } finally {
      setInvLoading(false);
    }
  }, [activeChurchId]);

  const loadPayments = useCallback(async () => {
    if (!activeChurchId) return;
    setPayLoading(true);
    setPayError("");
    try {
      const res = await adminGetPayments({ limit: 50, page: 1, churchId: activeChurchId });
      const rows = Array.isArray(res?.data?.payments) ? res.data.payments : [];
      const filtered = rows.filter((p) => String(p?.church?._id || "") === activeChurchId);
      setPayments(filtered);
    } catch (e) {
      setPayments([]);
      setPayError(e?.response?.data?.message || e?.message || "Failed to load payments");
    } finally {
      setPayLoading(false);
    }
  }, [activeChurchId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPlans(), loadSubscriptions(), loadInvoices(), loadPayments()]);
  }, [loadInvoices, loadPayments, loadPlans, loadSubscriptions]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const activeSubscription = useMemo(() => {
    if (!subs.length) return null;
    return subs[0];
  }, [subs]);

  const activePlan = useMemo(() => {
    const planId = activeSubscription?.plan?._id || activeSubscription?.planId;
    if (!planId) return activeSubscription?.plan || null;
    const found = plans.find((p) => String(p?._id || "") === String(planId));
    return found || activeSubscription?.plan || null;
  }, [activeSubscription?.plan, activeSubscription?.planId, plans]);

  const invoiceStats = useMemo(() => {
    const rows = Array.isArray(invoices) ? invoices : [];
    const unpaid = rows.filter((i) => String(i?.status || "").toLowerCase() !== "paid");
    const paid = rows.filter((i) => String(i?.status || "").toLowerCase() === "paid");
    return {
      total: rows.length,
      unpaidCount: unpaid.length,
      paidCount: paid.length
    };
  }, [invoices]);

  const paymentStats = useMemo(() => {
    const rows = Array.isArray(payments) ? payments : [];
    const ok = rows.filter((p) => String(p?.status || "").toLowerCase() === "paid");
    return {
      total: rows.length,
      paidCount: ok.length
    };
  }, [payments]);

  const showMoney = useCallback(
    (amount, currency) => {
      const cur = String(currency || "").trim().toUpperCase();
      const base = `${Number(amount || 0).toLocaleString()} ${cur}`;
      if (!cur || cur === churchCurrency) return base;
      const approx = convertCurrency(amount, cur, churchCurrency);
      if (approx === null) return base;
      return `${base} (≈ ${approx.toFixed(2)} ${churchCurrency})`;
    },
    [churchCurrency, convertCurrency]
  );

  const tabs = useMemo(
    () => [
      { key: "overview", label: "Overview" },
      { key: "subscription", label: "Subscription" },
      { key: "invoices", label: "Invoices" },
      { key: "payments", label: "Payments" }
    ],
    []
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">Billing</div>
          <div className="mt-1 text-sm text-gray-600">Billing info for this church.</div>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={refreshAll}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <div className="text-xs text-gray-500">
          Church currency: <span className="font-semibold text-gray-700">{churchCurrency}</span>
          {ratesLoading ? " · Loading exchange rates…" : ratesUpdatedAt ? ` · Rates updated: ${ratesUpdatedAt.toLocaleString()}` : ""}
          {ratesError ? <span className="text-red-600"> · {ratesError}</span> : null}
        </div>
      </div>

      {tab === "overview" ? (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs font-semibold text-gray-500 uppercase">Subscription</div>
              <div className="mt-2 text-sm text-gray-900 font-semibold">{activePlan?.name || activeSubscription?.plan?.name || "—"}</div>
              <div className="mt-1 text-sm text-gray-700">Status: {activeSubscription?.status || "—"}</div>
              <div className="mt-1 text-sm text-gray-700">Next billing: {fmtDate(activeSubscription?.nextBillingDate)}</div>
              {subsError ? <div className="mt-2 text-sm text-red-600">{subsError}</div> : null}
              {subsLoading ? <div className="mt-2 text-sm text-gray-500">Loading…</div> : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs font-semibold text-gray-500 uppercase">Invoices</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{invoiceStats.total}</div>
              <div className="mt-1 text-sm text-gray-700">Unpaid: {invoiceStats.unpaidCount}</div>
              <div className="mt-1 text-sm text-gray-700">Paid: {invoiceStats.paidCount}</div>
              {invError ? <div className="mt-2 text-sm text-red-600">{invError}</div> : null}
              {invLoading ? <div className="mt-2 text-sm text-gray-500">Loading…</div> : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs font-semibold text-gray-500 uppercase">Payments</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{paymentStats.total}</div>
              <div className="mt-1 text-sm text-gray-700">Paid: {paymentStats.paidCount}</div>
              {payError ? <div className="mt-2 text-sm text-red-600">{payError}</div> : null}
              {payLoading ? <div className="mt-2 text-sm text-gray-500">Loading…</div> : null}
            </div>
          </div>

          {!activeChurchId ? <div className="mt-4 text-sm text-red-600">No active church selected.</div> : null}
        </div>
      ) : null}

      {tab === "subscription" ? (
        <div className="mt-6">
          {subsError ? <div className="text-sm text-red-600">{subsError}</div> : null}
          {!activeSubscription ? (
            <div className="text-sm text-gray-600">No subscription found for this church.</div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Current subscription</div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Plan</div>
                  <div className="mt-1 text-gray-900">{activePlan?.name || activeSubscription?.plan?.name || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500">Status</div>
                  <div className="mt-1 text-gray-900">{activeSubscription?.status || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500">Start date</div>
                  <div className="mt-1 text-gray-900">{fmtDate(activeSubscription?.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500">Next billing date</div>
                  <div className="mt-1 text-gray-900">{fmtDate(activeSubscription?.nextBillingDate)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500">Currency</div>
                  <div className="mt-1 text-gray-900">{String(activeSubscription?.currency || churchCurrency).toUpperCase()}</div>
                </div>
              </div>

              {plansError ? <div className="mt-3 text-sm text-red-600">{plansError}</div> : null}
              {plansLoading ? <div className="mt-3 text-sm text-gray-500">Loading plans…</div> : null}

              {activePlan?.priceByCurrency || activePlan?.pricing ? (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-500">Plan pricing (approx.)</div>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-xs uppercase text-gray-400">
                        <tr className="border-b">
                          <th className="py-2 text-left font-semibold">Currency</th>
                          <th className="py-2 text-left font-semibold">Monthly</th>
                          <th className="py-2 text-left font-semibold">6 months</th>
                          <th className="py-2 text-left font-semibold">Yearly</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(activePlan?.priceByCurrency || activePlan?.pricing || {}).map(([cur, row]) => (
                          <tr key={cur} className="border-b last:border-b-0">
                            <td className="py-2 text-gray-900">{String(cur || "").toUpperCase()}</td>
                            <td className="py-2 text-gray-700">{row?.monthly !== undefined && row?.monthly !== null ? showMoney(row.monthly, cur) : "—"}</td>
                            <td className="py-2 text-gray-700">{row?.halfYear !== undefined && row?.halfYear !== null ? showMoney(row.halfYear, cur) : "—"}</td>
                            <td className="py-2 text-gray-700">{row?.yearly !== undefined && row?.yearly !== null ? showMoney(row.yearly, cur) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {tab === "invoices" ? (
        <div className="mt-6">
          {invError ? <div className="text-sm text-red-600">{invError}</div> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-gray-400">
                <tr className="border-b">
                  <th className="py-3 text-left font-semibold">Invoice #</th>
                  <th className="py-3 text-left font-semibold">Amount</th>
                  <th className="py-3 text-left font-semibold">Due</th>
                  <th className="py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {invLoading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((i) => (
                    <tr key={i?._id} className="border-b last:border-b-0">
                      <td className="py-3 text-gray-900">{i?.invoiceNumber || "—"}</td>
                      <td className="py-3 text-gray-700">{showMoney(i?.amount || 0, i?.currency || churchCurrency)}</td>
                      <td className="py-3 text-gray-700">{fmtDate(i?.dueDate)}</td>
                      <td className="py-3 text-gray-700">{i?.status || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="mt-6">
          {payError ? <div className="text-sm text-red-600">{payError}</div> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-gray-400">
                <tr className="border-b">
                  <th className="py-3 text-left font-semibold">Amount</th>
                  <th className="py-3 text-left font-semibold">Provider</th>
                  <th className="py-3 text-left font-semibold">Reference</th>
                  <th className="py-3 text-left font-semibold">Status</th>
                  <th className="py-3 text-left font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {payLoading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p?._id} className="border-b last:border-b-0">
                      <td className="py-3 text-gray-700">{showMoney(p?.amount || 0, p?.currency || churchCurrency)}</td>
                      <td className="py-3 text-gray-700">{p?.paymentProvider || "—"}</td>
                      <td className="py-3 text-gray-700">{p?.providerReference || "—"}</td>
                      <td className="py-3 text-gray-700">{p?.status || "—"}</td>
                      <td className="py-3 text-gray-700">{fmtDateTime(p?.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ChurchBillingPage;
