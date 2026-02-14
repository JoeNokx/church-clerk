import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import {
  cancelMySubscription,
  changeMyPlan,
  addCardPaymentMethod,
  addMobileMoneyPaymentMethod,
  getAvailablePlans,
  getBillingInvoiceDownloadUrl,
  getMyBillingHistory,
  getMySubscription,
  initializePaystackPayment,
  removePaymentMethod,
  updatePaymentMethod,
  verifyPaystackPayment
} from "../services/subscription.api.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import MinistryPlusCustomPlanModal from "../../../shared/components/MinistryPlusCustomPlanModal.jsx";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { getUsdToGhsRate } from "../../../shared/utils/fx.js";

function formatCurrency(amount, currency) {
  return formatMoney(amount, currency);
}

function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function StatusPill({ value }) {
  const normalizedValue = String(value || "").trim();
  const v = normalizedValue.toLowerCase();
  const displayValue = v === "trialing" ? "free trial" : normalizedValue;
  const cls =
    v === "paid" || v === "active" || v === "rewarded"
      ? "bg-green-100 text-green-700"
      : v === "pending" || v === "free trial" || v === "trialing"
        ? "bg-blue-100 text-blue-700"
        : v === "payment required" || v === "failed" || v === "past_due" || v === "suspended" || v === "cancelled"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-700";

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{displayValue || "—"}</span>;
}

function limitValue(limit) {
  if (limit === null || limit === undefined) return Number.POSITIVE_INFINITY;
  const n = Number(limit);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function providerLabel(provider) {
  const v = String(provider || "").toLowerCase();
  if (v === "mtn") return "MTN Mobile Money";
  if (v === "vod") return "Telecel Cash";
  if (v === "tgo") return "AirtelTigo Money";
  if (v === "ussd") return "Mobile Money / USSD";
  if (v === "card") return "Visa/Mastercard";
  return provider || "Mobile Money";
}

function methodTitle(method) {
  const type = String(method?.type || "mobile_money").toLowerCase();
  if (type === "card") return method?.brand || "Visa/Mastercard";
  return providerLabel(method?.provider);
}

function methodSubtitle(method) {
  const type = String(method?.type || "mobile_money").toLowerCase();
  if (type === "card") {
    const last4 = String(method?.last4 || "");
    return last4 ? `Card ending in ${last4}` : "Card";
  }
  return phoneEnding(method?.phone);
}

function normalizeGhanaPhone(value) {
  let digits = String(value || "").replace(/\D+/g, "");
  if (digits.startsWith("233") && digits.length === 12) {
    digits = `0${digits.slice(3)}`;
  }
  return digits;
}

function isValidMomo(provider, digits) {
  const p = String(provider || "").toLowerCase();
  if (!digits || digits.length !== 10 || !digits.startsWith("0")) return false;
  const prefix = digits.slice(0, 3);
  const prefixByProvider = {
    mtn: ["024", "054", "055", "059"],
    vod: ["020", "050"],
    tgo: ["026", "027", "056", "057"]
  };
  const allowed = prefixByProvider[p] || [];
  return allowed.length === 0 ? true : allowed.includes(prefix);
}

function luhnCheck(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (Number.isNaN(d)) return false;
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(months || 0));
  return d;
}

function computeNextBillingDate(sub) {
  if (!sub) return null;
  const direct = sub?.nextBillingDate || sub?.trialEnd || null;
  if (direct) return new Date(direct);

  const base = sub?.updatedAt || sub?.createdAt || null;
  if (!base) return null;

  const interval = sub?.billingInterval || "monthly";
  const months = interval === "halfYear" ? 6 : interval === "yearly" ? 12 : 1;
  return addMonths(new Date(base), months);
}

function phoneEnding(phone) {
  const p = String(phone || "").replace(/\s+/g, "");
  if (!p) return "";
  const last = p.slice(-4);
  return `Mobile Money ending in ${last}`;
}

function ModalShell({ open, title, subtitle, onClose, children, maxWidthClass = "max-w-2xl", zIndexClass = "z-50" }) {
  if (!open) return null;

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/30 p-4`}>
      <div className={`w-full ${maxWidthClass} rounded-xl bg-white shadow-xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-gray-600">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function BillingPage() {
  const { user } = useAuth();
  const churchStore = useContext(ChurchContext);
  const activeChurch = churchStore?.activeChurch;
  const location = useLocation();
  const { toPage } = useDashboardNavigator();

  const [subscription, setSubscription] = useState(null);
  const [effectivePlan, setEffectivePlan] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [plans, setPlans] = useState([]);
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [planId, setPlanId] = useState("");
  const [history, setHistory] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({ currentPage: 1, nextPage: null, prevPage: null });

  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [error, setError] = useState("");

  const [toastMessage, setToastMessage] = useState("");

  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const [selectedSavedMethodIndex, setSelectedSavedMethodIndex] = useState(0);

  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [newProvider, setNewProvider] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");
  const [newCardHolderName, setNewCardHolderName] = useState("");
  const [editingMethodId, setEditingMethodId] = useState(null);
  const [addMethodError, setAddMethodError] = useState("");
  const [addMethodFieldErrors, setAddMethodFieldErrors] = useState({});
  const [checkoutError, setCheckoutError] = useState("");

  const [methodsLoading, setMethodsLoading] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [showCustomPlanModal, setShowCustomPlanModal] = useState(false);

  const setAddFieldError = useCallback((field, message) => {
    setAddMethodFieldErrors((prev) => ({
      ...(prev || {}),
      [field]: message || ""
    }));
  }, []);

  const country = String(activeChurch?.country || "").trim().toLowerCase();
  const isGhana = country === "ghana";
  const [usdToGhs, setUsdToGhs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isGhana) {
        setUsdToGhs(null);
        return;
      }

      try {
        const rate = await getUsdToGhsRate();
        if (cancelled) return;
        setUsdToGhs(rate);
      } catch {
        if (cancelled) return;
        setUsdToGhs(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGhana]);

  const displayCurrency = isGhana || !usdToGhs ? "GHS" : "USD";
  const freeMonths = useMemo(() => subscription?.freeMonths || { earned: 0, used: 0 }, [subscription]);
  const freeRemaining = Math.max(0, Number(freeMonths?.earned || 0) - Number(freeMonths?.used || 0));

  const paymentRequired = useMemo(() => {
    const normalized = String(subscription?.status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    const needsPayment = normalized === "past_due" || normalized === "suspended" || normalized === "cancelled";
    return Boolean(readOnly || needsPayment);
  }, [readOnly, subscription?.status]);

  const isFreeTrial = useMemo(() => {
    const normalized = String(subscription?.status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    return normalized === "free_trial" || normalized === "trialing";
  }, [subscription?.status]);

  const currentPlan = effectivePlan || subscription?.plan || null;
  const currentPlanId = currentPlan?._id || null;

  const subscribedPlan = subscription?.plan || null;
  const subscribedPlanId = subscribedPlan?._id || null;
  const subscribedLimit = limitValue(subscribedPlan?.memberLimit);

  const selectedPlan = useMemo(() => {
    const rows = Array.isArray(plans) ? plans : [];
    const found = rows.find((p) => String(p?._id || "") === String(planId || "")) || null;
    return found || currentPlan || null;
  }, [currentPlan, planId, plans]);

  const savedPaymentMethods = useMemo(() => {
    const rows = Array.isArray(subscription?.paymentMethods) ? subscription.paymentMethods : [];
    const filteredRows = rows
      .map((m) => ({
        ...m,
        type: m?.type || "mobile_money"
      }))
      .filter((m) => {
        const t = String(m?.type || "");
        return t === "mobile_money" || t === "card";
      });
    if (!isGhana) return filteredRows.filter((m) => String(m?.type || "").toLowerCase() === "card");
    return filteredRows;
  }, [subscription]);

  const latestPaymentAttempt = useMemo(() => {
    const rows = Array.isArray(history) ? history : [];
    return rows.find((h) => h?.type === "payment") || null;
  }, [history]);

  const plansSorted = useMemo(() => {
    const rows = Array.isArray(plans) ? plans : [];
    const order = { "free lite": 0, basic: 1, standard: 2, premium: 3 };
    return rows.slice().sort((a, b) => {
      const aName = String(a?.name || "").toLowerCase();
      const bName = String(b?.name || "").toLowerCase();
      const aRank = Number.isFinite(order[aName]) ? order[aName] : 99;
      const bRank = Number.isFinite(order[bName]) ? order[bName] : 99;
      if (aRank !== bRank) return aRank - bRank;
      return aName.localeCompare(bName);
    });
  }, [plans]);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [subRes, plansRes, historyRes] = await Promise.all([
        getMySubscription(),
        getAvailablePlans(),
        getMyBillingHistory({ page: 1, limit: 8 })
      ]);

      const sub = subRes?.data?.subscription;
      const eff = subRes?.data?.effectivePlan;
      const ro = Boolean(subRes?.data?.readOnly);
      const plansPayload = plansRes?.data?.data ?? plansRes?.data;
      const fetchedPlans = plansPayload?.plans || [];
      const fetchedHistory = historyRes?.data?.history || [];
      const fetchedPagination = historyRes?.data?.pagination || { currentPage: 1 };

      setSubscription(sub);
      setEffectivePlan(eff || null);
      setReadOnly(Boolean(subRes?.data?.readOnly));
      setHistory(Array.isArray(fetchedHistory) ? fetchedHistory : []);
      setHistoryPagination(fetchedPagination);

      setPlans(Array.isArray(fetchedPlans) ? fetchedPlans : []);

      if (sub?.billingInterval) {
        setBillingInterval(sub.billingInterval);
      }

      if (sub?.plan?._id) {
        setPlanId(sub.plan._id);
      } else if (eff?._id) {
        setPlanId(eff._id);
      } else if (Array.isArray(fetchedPlans) && fetchedPlans[0]?._id) {
        setPlanId(fetchedPlans[0]._id);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistoryPage = useCallback(async (page) => {
    setError("");
    try {
      const res = await getMyBillingHistory({ page, limit: 8 });
      setHistory(Array.isArray(res?.data?.history) ? res.data.history : []);
      setHistoryPagination(res?.data?.pagination || { currentPage: page });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load billing history");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) return;

    let cancelled = false;
    (async () => {
      try {
        const verified = await verifyPaystackPayment({ reference });
        if (cancelled) return;
        const status = String(verified?.data?.status || "").toLowerCase();
        if (status === "paid") {
          setPaymentResult({ status: "success" });
          setShowPaymentResult(true);
        } else if (status === "failed") {
          setPaymentResult({ status: "failed" });
          setShowPaymentResult(true);
        }
        await load();
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || "Failed to verify payment");
      } finally {
        if (cancelled) return;
        const clean = new URLSearchParams(location.search);
        clean.delete("reference");
        clean.delete("trxref");
        window.history.replaceState(null, "", `${location.pathname}${clean.toString() ? `?${clean.toString()}` : ""}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load, location.pathname, location.search]);

  const onPay = async () => {
    if (!planId) {
      setError("Please select a plan");
      return;
    }

    setError("");
    setPaymentResult(null);
    setShowPaymentResult(false);
    setShowPaymentMethod(false);

    if (savedPaymentMethods.length > 0) {
      setSelectedSavedMethodIndex(0);
    }

    setShowPaymentSummary(true);
  };

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="text-lg font-semibold text-gray-900">Billing & Subscription</div>
        <div className="mt-2 text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  const overviewInterval = subscription?.billingInterval || "monthly";
  const overviewIntervalLabel = overviewInterval === "halfYear" ? "6 months" : overviewInterval === "yearly" ? "12 months" : "month";

  const currentPriceGhs = currentPlan?.pricing?.GHS?.[overviewInterval] ?? currentPlan?.priceByCurrency?.GHS?.[overviewInterval] ?? null;
  const currentPriceDisplay =
    displayCurrency === "USD" && usdToGhs ? Number(currentPriceGhs || 0) / Number(usdToGhs || 1) : currentPriceGhs;

  const selectedPriceGhs = selectedPlan?.pricing?.GHS?.[billingInterval] ?? selectedPlan?.priceByCurrency?.GHS?.[billingInterval] ?? null;
  const selectedPriceDisplay =
    displayCurrency === "USD" && usdToGhs ? Number(selectedPriceGhs || 0) / Number(usdToGhs || 1) : selectedPriceGhs;
  const nextBillingDate = computeNextBillingDate(subscription);
  const nextBillingText = nextBillingDate ? formatShortDate(nextBillingDate) : "—";

  const onPlanAction = async (plan) => {
    if (!plan?._id) return;

    const nextId = plan._id;
    const isCurrent = String(nextId) === String(subscribedPlanId || "");
    if (isCurrent) {
      if (!paymentRequired) return;
      setPlanId(String(nextId));
      onPay();
      return;
    }

    const nextLimit = limitValue(plan?.memberLimit);
    const nextName = String(plan?.name || "").toLowerCase();
    const isFreeLite = nextName === "free lite";

    if (isFreeLite && isFreeTrial) {
      return;
    }

    if (isFreeLite || (subscribedPlanId && nextLimit <= subscribedLimit)) {
      setManageLoading(true);
      setError("");
      try {
        await changeMyPlan({ newPlanId: nextId });
        setToastMessage("Plan updated successfully.");
        setTimeout(() => setToastMessage(""), 4000);
        await load();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to change plan");
      } finally {
        setManageLoading(false);
      }
      return;
    }

    setPlanId(String(nextId));
    onPay();
  };

  const onCancel = async () => {
    setShowCancelConfirm(true);
  };

  const planManagementCard = (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
      <div>
        <div className="text-sm font-semibold text-gray-900">Plan Management</div>
        <div className="text-xs text-gray-500">Change your subscription plan or cancel anytime</div>
      </div>

      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
        <div className="text-xs font-semibold text-gray-500">Current: {isFreeTrial ? "Free trial" : currentPlan?.name || "—"} Plan</div>
        <div className="mt-1 text-xs text-gray-600">
          {currentPlan?.memberLimit === null ? "Unlimited members" : `Up to ${Number(currentPlan?.memberLimit || 0).toLocaleString()} members`}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-700 sm:grid-cols-2">
          <div>Advanced reporting</div>
          <div>Priority support</div>
          <div>Custom branding</div>
          <div>Finance module access</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="text-xs font-semibold text-gray-500">Available Plans</div>

          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setBillingInterval("monthly")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  billingInterval === "monthly" ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval("halfYear")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  billingInterval === "halfYear" ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                6 months
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval("yearly")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  billingInterval === "yearly" ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Yearly
              </button>
            </div>

            
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {plansSorted.map((p) => {
          const id = p?._id;
          const isCurrent = id && String(id) === String(subscribedPlanId || "");
          const name = String(p?.name || "");
          const isMostPopular = name.toLowerCase() === "standard";
          const priceGhs = p?.pricing?.GHS?.[billingInterval] ?? p?.priceByCurrency?.GHS?.[billingInterval] ?? 0;
          const priceDisplay = displayCurrency === "USD" && usdToGhs ? Number(priceGhs || 0) / Number(usdToGhs || 1) : priceGhs;
          const per = billingInterval === "monthly" ? "/month" : billingInterval === "halfYear" ? "/6 months" : "/year";

          const isFreeLite = name.toLowerCase() === "free lite";
          const isFreeLiteDuringTrial = Boolean(isFreeLite && isFreeTrial);

          const nextLimit = limitValue(p?.memberLimit);
          const isUpgrade = Boolean(subscribedPlanId && nextLimit > subscribedLimit);
          const isDowngrade = Boolean(subscribedPlanId && nextLimit < subscribedLimit);

          const actionLabel = isCurrent
            ? paymentRequired
              ? "Subscribe now"
              : "Current plan"
            : isFreeLiteDuringTrial
              ? "Starts after trial"
              : !subscribedPlanId
                ? "Subscribe now"
                : isUpgrade
                  ? "Upgrade now"
                  : isDowngrade
                    ? "Downgrade now"
                    : "Subscribe now";

          return (
            <div
              key={id}
              className={`relative rounded-xl border bg-white p-5 ${isCurrent ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"}`}
            >
              {isMostPopular ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-700 px-3 py-1 text-[10px] font-semibold text-white">
                  Most Popular
                </div>
              ) : null}

              <div className="text-sm font-semibold text-gray-900">{name || "—"}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(priceDisplay, displayCurrency)}</div>
              <div className="text-xs text-gray-500">{per}</div>

              <div className="mt-4 space-y-2 text-xs text-gray-700">
                <div>{p?.memberLimit === null ? "Unlimited members" : `Up to ${Number(p?.memberLimit || 0).toLocaleString()} members`}</div>
                <div>Basic analytics</div>
                <div>Finance module access</div>
                <div>Member management</div>
              </div>

              <button
                type="button"
                onClick={() => onPlanAction(p)}
                disabled={payLoading || manageLoading || isFreeLiteDuringTrial || (isCurrent && !paymentRequired)}
                className={`mt-5 w-full rounded-lg px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-60 ${
                  isCurrent
                    ? "bg-gray-100 text-gray-600"
                    : isUpgrade
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {actionLabel}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="text-sm font-semibold text-gray-900">Need a fully customized church management solution?</div>
        <div className="mt-2 text-sm text-gray-700">
          With Ministry Plus, get a tailor-made system built specifically for your church’s needs. Features, workflows, and integrations — all designed just for you.
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setShowCustomPlanModal(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          >
            Contact us for a custom plan
          </button>
        </div>
      </div>

    </div>
  );

  const cancelSubscriptionCard = (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Cancel Subscription</div>
          <div className="text-xs text-gray-500">You can cancel anytime. Your access continues until the end of the current billing period.</div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={manageLoading}
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          Cancel Subscription
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl">
      <div>
        <div className="text-2xl font-semibold text-gray-900">Billing &amp; Subscription</div>
        <div className="mt-1 text-sm text-gray-600">Manage your subscription, payment methods, and view billing history</div>
      </div>

      {paymentRequired ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100">!</span>
                Payment Required
              </div>
              <div className="mt-1 text-sm text-red-700/90">
                Your free months have ended. Complete payment to continue enjoying all features.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {planManagementCard}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Subscription Overview</div>
            <div className="text-xs text-gray-500">Your current plan and billing status</div>
          </div>
          <StatusPill value={paymentRequired ? "Payment Required" : subscription?.status || "—"} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs font-semibold text-gray-500">Current Plan</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{isFreeTrial ? "Free trial" : currentPlan?.name || "—"}</div>
            <div className="text-xs text-gray-500">
              {currentPriceGhs ? `${formatCurrency(currentPriceDisplay, displayCurrency)}/${overviewIntervalLabel}` : ""}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500">Currency</div>
            <div className="mt-2 text-sm font-semibold text-gray-900">{displayCurrency || "—"}</div>
            <div className="text-xs text-gray-500">Display currency</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500">Next Billing Date</div>
            <div className="mt-2 text-sm font-semibold text-gray-900">{nextBillingText}</div>
            <div className="text-xs text-gray-500">
              You will be charged {currentPriceGhs ? formatCurrency(currentPriceGhs, "GHS") : "—"} on this date
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Free Months Earned</div>
            <div className="text-xs text-gray-500">Rewards from your successful referrals</div>
          </div>
          <button
            type="button"
            onClick={() => toPage("referrals")}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            View Referral Program
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="text-xs font-semibold text-gray-500">Total Earned</div>
            <div className="mt-2 text-2xl font-semibold text-green-700">{Number(freeMonths?.earned || 0)}</div>
            <div className="text-xs text-gray-500">months</div>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="text-xs font-semibold text-gray-500">Used</div>
            <div className="mt-2 text-2xl font-semibold text-orange-700">{Number(freeMonths?.used || 0)}</div>
            <div className="text-xs text-gray-500">months</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-xs font-semibold text-gray-500">Remaining</div>
            <div className="mt-2 text-2xl font-semibold text-blue-700">{freeRemaining}</div>
            <div className="text-xs text-gray-500">months</div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <span className="font-semibold">How it works:</span> Each successful subscribed church you refer earns you 1 free month. Free months are cumulative with no limit and apply automatically.
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Payment Methods</div>
            <div className="text-xs text-gray-500">Manage your payment information</div>
            <div className="mt-2 text-xs text-blue-700">
              {isGhana ? "Payment options: Visa/Mastercard, Mobile Money" : "Payment options: Visa/Mastercard"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddPaymentMethod(true);
              setNewProvider("");
              setNewPhone("");
              setNewCardNumber("");
              setNewCardExpiry("");
              setNewCardCvv("");
              setNewCardHolderName("");
              setEditingMethodId(null);
              setAddMethodError("");
              setAddMethodFieldErrors({});
            }}
            disabled={methodsLoading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Add Payment Method
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {savedPaymentMethods.length > 0 ? (
            savedPaymentMethods.map((m, idx) => {
              const showFailedBadge = String(latestPaymentAttempt?.status || "").toLowerCase() === "failed" && idx === 0;
              return (
                <div key={m?._id || idx} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700">
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <path d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-blue-800">{methodTitle(m)}</div>
                        <div className="mt-0.5 text-xs text-gray-500">{methodSubtitle(m)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {showFailedBadge ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">Failed</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">Active</span>
                      )}

                      {String(m?.type || "").toLowerCase() !== "card" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (methodsLoading) return;
                            setShowAddPaymentMethod(true);
                            setEditingMethodId(m?._id || null);
                            setNewProvider(String(m?.provider || ""));
                            setNewPhone(String(m?.phone || ""));
                            setNewCardNumber("");
                            setNewCardExpiry("");
                            setNewCardCvv("");
                            setNewCardHolderName("");
                            setAddMethodError("");
                            setAddMethodFieldErrors({});
                          }}
                          disabled={methodsLoading}
                          className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-60"
                        >
                          Edit
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={async () => {
                          if (!m?._id) return;
                          setMethodsLoading(true);
                          setError("");
                          try {
                            const res = await removePaymentMethod(m._id);
                            setSubscription(res?.data?.subscription || subscription);
                          } catch (e) {
                            setError(e?.response?.data?.message || e?.message || "Failed to remove payment method");
                          } finally {
                            setMethodsLoading(false);
                          }
                        }}
                        disabled={methodsLoading}
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No saved payment methods yet.</div>
          )}
        </div>

        <ModalShell
          open={showAddPaymentMethod}
          title={editingMethodId ? "Edit Payment Method" : "Add Payment Method"}
          subtitle={editingMethodId ? "Update your payment method details" : "Add a new payment method"}
          onClose={() => {
            if (methodsLoading) return;
            setShowAddPaymentMethod(false);
          }}
          maxWidthClass="max-w-2xl"
          zIndexClass="z-[80]"
        >
          <div>
            {addMethodError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addMethodError}</div>
            ) : null}

            <div className="text-xs font-semibold text-gray-700">Payment Provider</div>
            <select
              value={newProvider}
              onChange={(e) => {
                if (editingMethodId) return;
                setNewProvider(e.target.value);
                setAddMethodError("");
                setAddMethodFieldErrors({});
              }}
              disabled={methodsLoading}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select payment method</option>
              <option value="card">Visa/Mastercard</option>
              {isGhana ? (
                <>
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="vod">Telecel Cash</option>
                  <option value="tgo">AirtelTigo Money</option>
                </>
              ) : null}
            </select>

            {newProvider === "card" ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-700">Card Number</div>
                <input
                  value={newCardNumber}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewCardNumber(v);
                    const digits = String(v || "").replace(/\D+/g, "");
                    if (!digits) {
                      setAddFieldError("cardNumber", "Card number is required");
                    } else if (digits.length < 13 || digits.length > 19) {
                      setAddFieldError("cardNumber", "Card number length is invalid");
                    } else if (!luhnCheck(digits)) {
                      setAddFieldError("cardNumber", "Card number is invalid");
                    } else {
                      setAddFieldError("cardNumber", "");
                    }
                  }}
                  placeholder="1234 5678 9012 3456"
                  disabled={methodsLoading}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
                {addMethodFieldErrors?.cardNumber ? (
                  <div className="mt-1 text-xs font-semibold text-red-600">{addMethodFieldErrors.cardNumber}</div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Expiry</div>
                    <input
                      value={newCardExpiry}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewCardExpiry(v);
                        const m = String(v || "").trim().match(/^(\d{2})\s*\/\s*(\d{2})$/);
                        if (!m) {
                          setAddFieldError("expiry", "Use MM/YY");
                          return;
                        }
                        const mm = Number(m[1]);
                        const yy = Number(m[2]);
                        if (!Number.isInteger(mm) || mm < 1 || mm > 12 || !Number.isInteger(yy)) {
                          setAddFieldError("expiry", "Expiry is invalid");
                          return;
                        }
                        setAddFieldError("expiry", "");
                      }}
                      placeholder="MM/YY"
                      disabled={methodsLoading}
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                    {addMethodFieldErrors?.expiry ? (
                      <div className="mt-1 text-xs font-semibold text-red-600">{addMethodFieldErrors.expiry}</div>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700">CVV</div>
                    <input
                      value={newCardCvv}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewCardCvv(v);
                        const digits = String(v || "").replace(/\D+/g, "");
                        if (!digits) {
                          setAddFieldError("cvv", "CVV is required");
                        } else if (digits.length !== 3 && digits.length !== 4) {
                          setAddFieldError("cvv", "CVV must be 3 or 4 digits");
                        } else {
                          setAddFieldError("cvv", "");
                        }
                      }}
                      placeholder="123"
                      disabled={methodsLoading}
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                    {addMethodFieldErrors?.cvv ? (
                      <div className="mt-1 text-xs font-semibold text-red-600">{addMethodFieldErrors.cvv}</div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-700">Cardholder Name</div>
                  <input
                    value={newCardHolderName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewCardHolderName(v);
                      const name = String(v || "").trim();
                      if (!name) {
                        setAddFieldError("holderName", "Cardholder name is required");
                      } else {
                        setAddFieldError("holderName", "");
                      }
                    }}
                    placeholder="John Doe"
                    disabled={methodsLoading}
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                  {addMethodFieldErrors?.holderName ? (
                    <div className="mt-1 text-xs font-semibold text-red-600">{addMethodFieldErrors.holderName}</div>
                  ) : null}
                </div>
              </div>
            ) : newProvider ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-700">Mobile Number</div>
                <input
                  value={newPhone}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewPhone(v);
                    const gh = normalizeGhanaPhone(v);
                    if (!gh) {
                      setAddFieldError("phone", "Mobile number is required");
                      return;
                    }
                    if (!isValidMomo(newProvider, gh)) {
                      setAddFieldError("phone", "Mobile number does not match selected provider");
                      return;
                    }
                    setAddFieldError("phone", "");
                  }}
                  placeholder="024 123 4567"
                  disabled={methodsLoading}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
                {addMethodFieldErrors?.phone ? (
                  <div className="mt-1 text-xs font-semibold text-red-600">{addMethodFieldErrors.phone}</div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddPaymentMethod(false)}
                disabled={methodsLoading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newProvider) {
                    setAddMethodError("Please select a payment provider");
                    return;
                  }

                  if (!isGhana && newProvider !== "card") {
                    setAddMethodError("Mobile money is only available for churches in Ghana");
                    return;
                  }

                  setMethodsLoading(true);
                  setAddMethodError("");
                  try {
                    if (editingMethodId) {
                      const phoneDigits = normalizeGhanaPhone(newPhone);
                      if (!isValidMomo(newProvider, phoneDigits)) {
                        setAddMethodError("Mobile number does not match selected provider");
                        return;
                      }

                      const res = await updatePaymentMethod(editingMethodId, { provider: newProvider, phone: phoneDigits });
                      const nextSub = res?.data?.subscription || subscription;
                      setSubscription(nextSub);
                      setShowAddPaymentMethod(false);
                      setEditingMethodId(null);
                      return;
                    }

                    if (newProvider === "card") {
                      const digits = String(newCardNumber || "").replace(/\D+/g, "");
                      if (!digits || digits.length < 13 || digits.length > 19 || !luhnCheck(digits)) {
                        setAddMethodError("Card number is invalid");
                        return;
                      }

                      const expiry = String(newCardExpiry || "").trim();
                      const match = expiry.match(/^(\d{2})\s*\/\s*(\d{2})$/);
                      if (!match) {
                        setAddMethodError("Expiry is invalid (use MM/YY)");
                        return;
                      }
                      const mm = Number(match[1]);
                      const yy = Number(match[2]);
                      if (!Number.isInteger(mm) || mm < 1 || mm > 12 || !Number.isInteger(yy)) {
                        setAddMethodError("Expiry is invalid (use MM/YY)");
                        return;
                      }
                      const expYear = 2000 + yy;

                      const cvvDigits = String(newCardCvv || "").replace(/\D+/g, "");
                      if (!cvvDigits || (cvvDigits.length !== 3 && cvvDigits.length !== 4)) {
                        setAddMethodError("CVV is invalid");
                        return;
                      }

                      const holderName = String(newCardHolderName || "").trim();
                      if (!holderName) {
                        setAddMethodError("Cardholder name is required");
                        return;
                      }

                      const res = await addCardPaymentMethod({
                        cardNumber: digits,
                        expMonth: mm,
                        expYear,
                        cvv: cvvDigits,
                        holderName
                      });
                      const nextSub = res?.data?.subscription || subscription;
                      setSubscription(nextSub);
                      const nextMethods = Array.isArray(nextSub?.paymentMethods) ? nextSub.paymentMethods : [];
                      const idx = nextMethods.findIndex(
                        (m) => String(m?.type || "").toLowerCase() === "card" && String(m?.last4 || "") === digits.slice(-4)
                      );
                      if (idx >= 0) setSelectedSavedMethodIndex(idx);
                      setShowAddPaymentMethod(false);
                    } else {
                      const phoneDigits = normalizeGhanaPhone(newPhone);
                      if (!isValidMomo(newProvider, phoneDigits)) {
                        setAddMethodError("Mobile number does not match selected provider");
                        return;
                      }

                      const res = await addMobileMoneyPaymentMethod({ provider: newProvider, phone: phoneDigits });
                      const nextSub = res?.data?.subscription || subscription;
                      setSubscription(nextSub);
                      const nextMethods = Array.isArray(nextSub?.paymentMethods) ? nextSub.paymentMethods : [];
                      const idx = nextMethods.findIndex(
                        (m) =>
                          String(m?.type || "").toLowerCase() === "mobile_money" &&
                          String(m?.provider || "") === String(newProvider) &&
                          String(m?.phone || "") === String(phoneDigits)
                      );
                      if (idx >= 0) setSelectedSavedMethodIndex(idx);
                      setShowAddPaymentMethod(false);
                    }
                  } catch (e) {
                    setAddMethodError(e?.response?.data?.message || e?.message || "Failed to add payment method");
                  } finally {
                    setMethodsLoading(false);
                  }
                }}
                disabled={methodsLoading}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
              >
                {methodsLoading ? "Saving…" : editingMethodId ? "Save Changes" : "Add Payment Method"}
              </button>
            </div>
          </div>
        </ModalShell>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <div className="text-sm font-semibold text-gray-900">Billing History</div>
          <div className="text-xs text-gray-500">Complete record of all transactions and free month usage</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-100">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-6 py-2">Date</th>
                <th className="px-6 py-2">Type</th>
                <th className="px-6 py-2">Amount</th>
                <th className="px-6 py-2">Currency</th>
                <th className="px-6 py-2">Status</th>
                <th className="px-6 py-2 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(Array.isArray(history) ? history : []).map((row, idx) => (
                <tr key={row?._id || idx} className="text-sm text-gray-700">
                  <td className="px-6 py-2">{row?.createdAt ? formatShortDate(row.createdAt) : "—"}</td>
                  <td className="px-6 py-2">{row?.type === "free_month" ? "Free Month" : "Payment"}</td>
                  <td className="px-6 py-2">{row?.type === "free_month" ? "—" : formatCurrency(row?.amount || 0, row?.currency)}</td>
                  <td className="px-6 py-2">{row?.currency || "—"}</td>
                  <td className="px-6 py-2">
                    <StatusPill value={row?.status || "—"} />
                  </td>
                  <td className="px-6 py-2 text-right">
                    {row?._id ? (
                      <a
                        href={getBillingInvoiceDownloadUrl(row._id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Download
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => loadHistoryPage(historyPagination?.prevPage)}
            disabled={!historyPagination?.prevPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">Page {historyPagination?.currentPage || 1}</div>
          <button
            type="button"
            onClick={() => loadHistoryPage(historyPagination?.nextPage)}
            disabled={!historyPagination?.nextPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {cancelSubscriptionCard}

      <ModalShell
        open={showCancelConfirm}
        title="Cancel Subscription"
        subtitle="Are you sure you want to cancel your subscription?"
        onClose={() => setShowCancelConfirm(false)}
        maxWidthClass="max-w-xl"
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900">If you cancel your subscription:</div>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <div>- You will retain access until the end of the current billing period</div>
            <div>- You will not be charged again</div>
            <div>- Your data will be preserved</div>
            <div>- You can reactivate anytime</div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowCancelConfirm(false)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Keep Subscription
          </button>
          <button
            type="button"
            onClick={async () => {
              setManageLoading(true);
              setError("");
              try {
                await cancelMySubscription();
                setShowCancelConfirm(false);
                await load();
              } catch (e) {
                setError(e?.response?.data?.message || e?.message || "Failed to cancel subscription");
              } finally {
                setManageLoading(false);
              }
            }}
            disabled={manageLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Confirm Cancellation
          </button>
        </div>
      </ModalShell>

      <MinistryPlusCustomPlanModal
        open={showCustomPlanModal}
        onClose={() => setShowCustomPlanModal(false)}
        defaultEmail={user?.email || ""}
      />

      <ModalShell
        open={showPaymentSummary}
        title="Payment Summary"
        subtitle="Review your payment details before proceeding"
        onClose={() => setShowPaymentSummary(false)}
      >
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="text-gray-700">Plan</div>
              <div className="font-semibold text-gray-900">{selectedPlan?.name || "—"}</div>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="text-gray-700">Amount (Display)</div>
              <div className="font-semibold text-gray-900">{formatCurrency(selectedPriceDisplay ?? 0, displayCurrency)}</div>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="text-gray-700">Amount (Charged)</div>
              <div className="font-semibold text-gray-900">{formatCurrency(selectedPriceGhs ?? 0, "GHS")}</div>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="text-gray-700">Billing Cycle</div>
              <div className="font-semibold text-gray-900">{billingInterval === "halfYear" ? "6 Months" : billingInterval === "yearly" ? "Yearly" : "Monthly"}</div>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="text-gray-700">Free Months Applied</div>
              <div className="font-semibold text-gray-900">0</div>
            </div>
          </div>

          <div className="mt-4 border-t border-blue-100 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-gray-700">Total Due Now</div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatCurrency(selectedPriceGhs ?? 0, "GHS")}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 16h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">What happens next:</div>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div>- You'll be charged {formatCurrency(selectedPriceGhs ?? 0, "GHS")} today</div>
                <div>- Your subscription will be activated immediately</div>
                <div>- Next billing date will be {nextBillingText}</div>
                <div>- You can cancel anytime before the next billing cycle</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowPaymentSummary(false)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPaymentSummary(false);
              setShowPaymentMethod(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            Continue to Payment
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </ModalShell>

      <ModalShell
        open={showPaymentMethod}
        title="Select Payment Method"
        subtitle="Choose how you'd like to pay for your subscription"
        onClose={() => {
          if (checkoutLoading) return;
          setShowPaymentMethod(false);
        }}
      >
        <div>
          {checkoutError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{checkoutError}</div>
          ) : null}

          <div className="text-sm font-semibold text-gray-900">Saved Payment Methods</div>
          <div className="mt-3 space-y-3">
            {savedPaymentMethods.length > 0 ? (
              savedPaymentMethods.map((m, idx) => {
                const isSelected = idx === selectedSavedMethodIndex;
                const showFailedBadge = String(latestPaymentAttempt?.status || "").toLowerCase() === "failed";

                return (
                  <label
                    key={String(m?._id || `${m?.type || "method"}-${idx}`)}
                    className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                      isSelected ? "border-blue-200 bg-blue-50/30" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <input
                        type="radio"
                        name="saved-method"
                        checked={isSelected}
                        onChange={() => {
                          setCheckoutError("");
                          setSelectedSavedMethodIndex(idx);
                        }}
                        className="h-4 w-4"
                      />
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700">
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <path d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-blue-800">{methodTitle(m)}</div>
                        <div className="truncate text-xs text-gray-500">{methodSubtitle(m)}</div>
                      </div>
                    </div>

                    {showFailedBadge ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">Last payment failed</span>
                    ) : null}
                  </label>
                );
              })
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No saved payment methods yet.</div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">Add New Payment Method</div>
            <button
              type="button"
              onClick={() => {
                if (checkoutLoading) return;
                setShowAddPaymentMethod(true);
                setNewProvider("");
                setNewPhone("");
                setNewCardNumber("");
                setNewCardExpiry("");
                setNewCardCvv("");
                setNewCardHolderName("");
                setAddMethodError("");
              }}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              + Add New
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (checkoutLoading) return;
                setShowPaymentMethod(false);
                setShowPaymentSummary(true);
              }}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={checkoutLoading}
            >
              Back
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!planId) {
                  setCheckoutError("Please select a plan");
                  return;
                }

                const amount = selectedPriceGhs ?? 0;

                const amountMajor = Number(amount);
                if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
                  setCheckoutError("Transaction amount is not set. Please re-select a plan and try again.");
                  return;
                }

                const method = savedPaymentMethods?.[selectedSavedMethodIndex] || null;
                if (!method) {
                  setCheckoutError("Please select a payment method");
                  return;
                }

                setCheckoutLoading(true);
                setCheckoutError("");
                try {
                  const pollVerify = async (reference) => {
                    if (!reference) return "unknown";
                    let finalStatus = "pending";
                    for (let attempt = 0; attempt < 10; attempt += 1) {
                      const verifyRes = await verifyPaystackPayment({ reference });
                      const st = String(verifyRes?.data?.status || "").toLowerCase();
                      finalStatus = st || finalStatus;
                      if (st === "paid" || st === "failed") break;
                      await new Promise((r) => setTimeout(r, 2500));
                    }
                    return finalStatus || "unknown";
                  };

                  const type = String(method?.type || "mobile_money").toLowerCase();
                  const channels =
                    type === "mobile_money"
                      ? ["mobile_money", "card"]
                      : type === "card"
                        ? ["card"]
                        : ["bank_transfer"];

                  const amountMinor = Math.round(amountMajor * 100);

                  const key =
                    import.meta.env.TEST_PUBLC_KEY ||
                    import.meta.env.TEST_PUBLIC_KEY ||
                    import.meta.env.VITE_TEST_PUBLC_KEY ||
                    import.meta.env.VITE_TEST_PUBLIC_KEY ||
                    import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
                    "";
                  if (!key) {
                    setCheckoutError(
                      "Paystack public key is not configured. Set VITE_TEST_PUBLC_KEY=pk_test_... (or TEST_PUBLC_KEY=pk_test_...) in frontend .env, then restart the frontend."
                    );
                    return;
                  }

                  const payerEmail = String(user?.email || "").trim();
                  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail);
                  if (!emailOk) {
                    setCheckoutError(
                      "Your account email is missing or invalid. Please update your profile email and try again."
                    );
                    return;
                  }

                  const res = await initializePaystackPayment({
                    planId,
                    billingInterval,
                    channels
                  });
                  const accessCode = res?.data?.accessCode;
                  const initRef = res?.data?.reference;
                  if (!accessCode) {
                    setCheckoutError(
                      "Paystack initialize did not return an access code. Restart the backend (and ensure paystack initialize returns accessCode), then try again."
                    );
                    return;
                  }

                  const paystack = window?.PaystackPop;
                  if (!paystack || typeof paystack.setup !== "function") {
                    setCheckoutError("Paystack inline script is not loaded");
                    return;
                  }

                  const reference = await new Promise((resolve, reject) => {
                    let settled = false;
                    const handler = paystack.setup({
                      key,
                      email: payerEmail,
                      amount: amountMinor,
                      currency: "GHS",
                      ...(channels.length ? { channels } : {}),
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

                  const st = await pollVerify(reference);
                  if (st === "paid") {
                    setPaymentResult({ status: "success", amount });
                    setShowPaymentMethod(false);
                    setShowPaymentResult(true);
                    setToastMessage("Payment successful! Your subscription has been activated.");
                    setTimeout(() => setToastMessage(""), 4000);
                    await load();
                  } else if (st === "failed") {
                    setPaymentResult({ status: "failed", amount });
                    setShowPaymentMethod(false);
                    setShowPaymentResult(true);
                    await load();
                  } else {
                    setPaymentResult({ status: "pending", amount });
                    setShowPaymentMethod(false);
                    setShowPaymentResult(true);
                    await load();
                  }
                } catch (e) {
                  setCheckoutError(e?.response?.data?.message || e?.message || "Failed to start payment");
                } finally {
                  setCheckoutLoading(false);
                }
              }}
              className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
              disabled={checkoutLoading}
            >
              {checkoutLoading
                ? "Processing…"
                : `Proceed to Pay ${formatCurrency(selectedPriceGhs ?? 0, "GHS")}`}
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={showPaymentResult}
        title={
          paymentResult?.status === "success"
            ? "Payment Successful!"
            : paymentResult?.status === "pending"
              ? "Payment Pending"
              : "Payment Failed"
        }
        subtitle={
          paymentResult?.status === "success"
            ? "Your subscription has been activated"
            : paymentResult?.status === "pending"
              ? "We’re still confirming your payment. Please wait a moment and refresh your billing page."
              : "Your payment could not be completed"
        }
        onClose={() => setShowPaymentResult(false)}
        maxWidthClass="max-w-xl"
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={`mt-1 inline-flex h-14 w-14 items-center justify-center rounded-full ${
              paymentResult?.status === "success"
                ? "bg-green-100 text-green-700"
                : paymentResult?.status === "pending"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {paymentResult?.status === "success" ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : paymentResult?.status === "pending" ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>

          <div className="mt-4 text-lg font-semibold text-gray-900">
            {paymentResult?.status === "success"
              ? "Payment Completed Successfully"
              : paymentResult?.status === "pending"
                ? "Payment Pending"
                : "Payment Not Completed"}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Amount paid: <span className="font-semibold text-gray-900">{formatCurrency(paymentResult?.amount ?? 0, "GHS")}</span>
          </div>

          {paymentResult?.status === "success" ? (
            <div className="mt-5 w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-left">
              <div className="text-sm font-semibold text-green-900">What's Next:</div>
              <div className="mt-2 space-y-1 text-sm text-green-900/90">
                <div>- Your {selectedPlan?.name || currentPlan?.name || "subscription"} is now active</div>
                <div>- Receipt has been sent to your email</div>
                <div>- Next billing: {nextBillingText}</div>
                <div>- Invoice available in billing history</div>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setShowPaymentResult(false);
              setPaymentResult(null);
            }}
            className={`mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm ${
              paymentResult?.status === "success" ? "bg-green-700 hover:bg-green-800" : "bg-gray-800 hover:bg-gray-900"
            }`}
          >
            Done
          </button>
        </div>
      </ModalShell>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="font-semibold">{toastMessage}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BillingPage;
