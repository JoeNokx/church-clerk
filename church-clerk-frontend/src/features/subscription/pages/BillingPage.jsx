import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import Skeleton from "react-loading-skeleton";
import PriceCard from "../../../shared/components/PriceCard/index.jsx";
import {
  cancelMySubscription,
  undoMyCancellation,
  changeMyPlan,
  calculateUpgradeProration,
  addCardPaymentMethod,
  addMobileMoneyPaymentMethod,
  getAvailablePlans,
  getBillingInvoiceDownloadUrl,
  getMyBillingHistory,
  getMySubscription,
  initializePaystackPayment,
  removePaymentMethod,
  updatePaymentMethod,
  verifyPaystackPayment,
  cancelPaystackPayment
} from "../services/subscription.api.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import { getMyReferralCode } from "../../referral/services/referral.api.js";
import MinistryPlusCustomPlanModal from "../../../shared/components/MinistryPlusCustomPlanModal.jsx";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { getUsdToGhsRate } from "../../../shared/utils/fx.js";
import PlanComparisonTable from "../components/PlanComparisonTable.jsx";
import { getPlanDescriptionFeatures } from "../../../shared/utils/planDescription.js";
import { getSystemSettingsAdmin, updateSystemSettingsAdmin, toggleGovernanceFlags } from "../../settings/services/settings.api.js";

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

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ${cls} text-xs`}>{displayValue || "—"}</span>;
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

function normalizeGhanaPhone(raw) {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("233") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  return "";
}

function toGhanaNationalFromE164(e164) {
  const digits = String(e164 || "").replace(/\D+/g, "");
  if (digits.startsWith("233") && digits.length === 12) return `0${digits.slice(3)}`;
  return "";
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

  const interval = String(sub?.billingInterval || "monthly").toLowerCase();
  if (interval === "hourly") {
    return new Date(new Date(base).getTime() + 60 * 60 * 1000);
  }
  if (interval === "daily") {
    const d = new Date(base); d.setDate(d.getDate() + 1); return d;
  }
  if (interval === "weekly") {
    const d = new Date(base); d.setDate(d.getDate() + 7); return d;
  }
  if (interval === "quarterly") return addMonths(new Date(base), 3);
  if (interval === "halfyear" || interval === "biannually") return addMonths(new Date(base), 6);
  if (interval === "yearly" || interval === "annually") return addMonths(new Date(base), 12);
  return addMonths(new Date(base), 1);
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
    <div className={`fixed inset-0 ${zIndexClass} flex items-end md:items-center justify-center bg-black/30 p-0 md:p-4`}>
      <div className={`w-full ${maxWidthClass} max-h-[92vh] md:max-h-[90vh] rounded-t-2xl md:rounded-xl bg-white shadow-xl flex flex-col overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 md:px-6 py-4 md:py-4 md:py-5 lg:py-6 shrink-0">
          <div>
            <div className="font-semibold text-gray-900 md:text-lg text-base">{title}</div>
            {subtitle ? <div className="mt-1 text-gray-500 text-sm">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 shrink-0 md:h-12 md:w-12"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 md:px-6 py-4 md:py-4 md:py-5 lg:py-6 overflow-y-auto flex-1">{children}</div>
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

  const plansRef = useRef(null);

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

  const cardNumberRef = useRef(null);
  const cardExpiryRef = useRef(null);
  const cardCvvRef = useRef(null);
  const cardHolderRef = useRef(null);
  const [editingMethodId, setEditingMethodId] = useState(null);
  const [addMethodError, setAddMethodError] = useState("");
  const [addMethodFieldErrors, setAddMethodFieldErrors] = useState({});
  const [checkoutError, setCheckoutError] = useState("");

  const [methodsLoading, setMethodsLoading] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [showProrationModal, setShowProrationModal] = useState(false);
  const [prorationData, setProrationData] = useState(null);
  const [prorationLoading, setProrationLoading] = useState(false);

  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState(null);
  const [showCustomPlanModal, setShowCustomPlanModal] = useState(false);
  const [referralBonusDays, setReferralBonusDays] = useState(30);

  // System admin settings (configuration durations + governance toggles)
  const isSystemAdmin = useMemo(() => {
    const raw = String(user?.role || "").trim().toLowerCase();
    const norm = raw.replace(/[\s_\-]+/g, "");
    return norm === "superadmin" || norm === "supportadmin";
  }, [user?.role]);

  const [sysLoading, setSysLoading] = useState(false);
  const [sysError, setSysError] = useState("");
  const [trialDays, setTrialDays] = useState(14);
  const [enforceBackdating, setEnforceBackdating] = useState(false);
  const [enforceImmutability, setEnforceImmutability] = useState(false);

  useEffect(() => {
    if (!isSystemAdmin) return;
    let cancelled = false;
    (async () => {
      setSysLoading(true);
      setSysError("");
      try {
        const res = await getSystemSettingsAdmin();
        if (cancelled) return;
        const s = res?.data?.settings || {};
        if (s?.trialDays !== undefined) setTrialDays(Number(s.trialDays));
        setEnforceBackdating(Boolean(s?.enforceBackdating));
        setEnforceImmutability(Boolean(s?.enforceImmutability));
      } catch (e) {
        if (cancelled) return;
        setSysError(e?.response?.data?.message || e?.message || "Failed to load system settings");
      } finally {
        if (cancelled) return;
        setSysLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isSystemAdmin]);

  const TRIAL_OPTIONS = [3, 7, 14, 21, 30, 40];

  const applyTrialDays = async () => {
    setSysError("");
    setSysLoading(true);
    try {
      await updateSystemSettingsAdmin({ trialDays });
    } catch (e) {
      setSysError(e?.response?.data?.message || e?.message || "Failed to update trial days");
    } finally {
      setSysLoading(false);
    }
  };

  const handleToggleGov = async (key, value) => {
    setSysError("");
    setSysLoading(true);
    const prev = { enforceBackdating, enforceImmutability };
    if (key === "enforceBackdating") setEnforceBackdating(value);
    if (key === "enforceImmutability") setEnforceImmutability(value);
    try {
      await toggleGovernanceFlags({ [key]: value });
    } catch (e) {
      setSysError(e?.response?.data?.message || e?.message || "Failed to update governance flag");
      setEnforceBackdating(prev.enforceBackdating);
      setEnforceImmutability(prev.enforceImmutability);
    } finally {
      setSysLoading(false);
    }
  };

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

  const displayCurrency = isGhana ? "GHS" : "USD";
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

  const savingsByInterval = useMemo(() => {
    const MONTHLY_EQUIV = { quarterly: 3, halfYear: 6, yearly: 12 };
    const paidPlans = plansSorted.filter((p) => String(p?.name || "").trim().toLowerCase() !== "free lite");
    const result = {};
    for (const [interval, months] of Object.entries(MONTHLY_EQUIV)) {
      const percentages = paidPlans
        .map((p) => {
          const ghsPrices = p?.pricing?.GHS || p?.priceByCurrency?.GHS || {};
          const mprice = Number(ghsPrices?.monthly || 0);
          const iprice = Number(ghsPrices?.[interval] || 0);
          if (!mprice || !iprice) return null;
          const pct = Math.round((1 - iprice / (mprice * months)) * 100);
          return pct > 0 ? pct : null;
        })
        .filter((v) => v !== null);
      if (percentages.length > 0) {
        result[interval] = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
      }
    }
    return result;
  }, [plansSorted]);

  const plansForComparison = useMemo(() => {
    const rows = Array.isArray(plansSorted) ? plansSorted.filter((p) => p?.isActive !== false) : [];
    const byName = (name) => rows.find((p) => String(p?.name || "").trim().toLowerCase() === name) || null;

    const picked = [byName("basic"), byName("standard"), byName("premium")].filter(Boolean);
    if (picked.length > 0) return picked;

    const withoutFreeLite = rows.filter((p) => String(p?.name || "").trim().toLowerCase() !== "free lite");
    return withoutFreeLite.slice(0, 3);
  }, [plansSorted]);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [subRes, plansRes, historyRes, referralCodeRes] = await Promise.all([
        getMySubscription(),
        getAvailablePlans(),
        getMyBillingHistory({ page: 1, limit: 8 }),
        getMyReferralCode().catch(() => null)
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
      if (referralCodeRes?.data?.referralBonusDays) {
        setReferralBonusDays(Number(referralCodeRes.data.referralBonusDays || 30));
      }
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
      <div className="max-w-6xl animate-pulse">
        <div className="font-semibold text-gray-900 text-lg">Billing & Subscription</div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 md:p-6 lg:p-8">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-6 w-20 rounded bg-gray-200" />
              <div className="h-3 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const overviewInterval = subscription?.billingInterval || "monthly";
  const intervalLabelMap = { hourly: "hour", daily: "day", weekly: "week", monthly: "month", quarterly: "3 months", halfYear: "6 months", yearly: "year" };
  const overviewIntervalLabel = intervalLabelMap[overviewInterval] || overviewInterval;

  const toDisplayPrice = (ghsAmount) => {
    if (ghsAmount === null || ghsAmount === undefined) return null;
    if (displayCurrency === "USD") return usdToGhs ? Number(ghsAmount) / Number(usdToGhs) : null;
    return Number(ghsAmount);
  };

  const isHQ = activeChurch?.type === "Headquarters";

  const currentPriceGhs = currentPlan?.pricing?.GHS?.[overviewInterval] ?? currentPlan?.priceByCurrency?.GHS?.[overviewInterval] ?? null;
  const currentPriceDisplay = toDisplayPrice(currentPriceGhs);

  const pendingPlanData = subscription?.pendingPlan || null;
  const hasPendingDowngrade = subscription?.pendingPlanAction === "downgrade" && !!pendingPlanData;
  const nextBillingPriceGhs = hasPendingDowngrade
    ? (pendingPlanData?.pricing?.GHS?.[overviewInterval] ?? pendingPlanData?.priceByCurrency?.GHS?.[overviewInterval] ?? currentPriceGhs)
    : currentPriceGhs;
  const nextBillingPriceDisplay = toDisplayPrice(nextBillingPriceGhs);

  const selectedPriceGhs = selectedPlan?.pricing?.GHS?.[billingInterval] ?? selectedPlan?.priceByCurrency?.GHS?.[billingInterval] ?? null;
  const selectedPriceDisplay = toDisplayPrice(selectedPriceGhs);
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
    const wouldBeDowngrade = isFreeLite || (subscribedPlanId && nextLimit <= subscribedLimit);

    if (isHQ && (wouldBeDowngrade || nextName !== "premium")) {
      setError("Headquarters churches must remain on the Premium plan and cannot downgrade or cancel.");
      return;
    }

    if (isFreeLite && isFreeTrial) {
      return;
    }

    if (wouldBeDowngrade) {
      setPendingDowngradePlan(plan);
      setShowDowngradeConfirm(true);
      return;
    }

    // New subscription - no existing paid plan (free trial / no plan yet)
    if (!subscribedPlanId) {
      setPlanId(String(nextId));
      setProrationData(null);
      setError("");
      setPaymentResult(null);
      setShowPaymentResult(false);
      setShowPaymentMethod(false);
      if (savedPaymentMethods.length > 0) {
        setSelectedSavedMethodIndex(0);
      }
      setShowPaymentSummary(true);
      return;
    }

    // UPGRADE with proration preview
    setProrationLoading(true);
    setError("");
    try {
      const res = await calculateUpgradeProration({
        newPlanId: nextId,
        billingInterval
      });
      setProrationData({ ...res.data, newPlanId: nextId });
      setPlanId(String(nextId));
      setShowProrationModal(true);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to calculate upgrade cost");
    } finally {
      setProrationLoading(false);
    }
  };

  const onCancel = async () => {
    setShowCancelConfirm(true);
  };

  const currentPlanFeatures = getPlanDescriptionFeatures(currentPlan, { max: 6 });
  const currentPlanName = String(currentPlan?.name || "").trim().toLowerCase();
  const isFreeLitePlan = currentPlanName === "free lite";
  const isPaidPlan = ["basic", "standard", "premium"].includes(currentPlanName);

  const planManagementCard = (
    <div ref={plansRef} className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
      <div>
        <div className="font-semibold text-gray-900 text-sm">Plan Management</div>
        <div className="text-gray-500 text-xs">Change your subscription plan or cancel anytime</div>
      </div>

      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
        <div className="font-semibold text-gray-500 text-xs">Current: {isFreeTrial ? "Free trial" : currentPlan?.name || "—"} Plan</div>
        <div className="mt-1 text-gray-600 text-xs">
          {currentPlan?.memberLimit === null ? "Unlimited members" : `Up to ${Number(currentPlan?.memberLimit || 0).toLocaleString()} members`}
        </div>
        {currentPlanFeatures.length ? (
          <div className="mt-3 space-y-2 text-gray-700 text-xs">
            {currentPlanFeatures.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M6 12.5l3.2 3.2L18 7.8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="font-semibold text-gray-500 text-xs">Available Plans</div>

          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-white p-1 gap-0.5">
              {[
                { key: "monthly",  label: "Monthly" },
                { key: "halfYear", label: "6 Months" },
                { key: "yearly",   label: "Yearly" }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBillingInterval(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    billingInterval === key ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
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
          const priceGhs = p?.pricing?.GHS?.[billingInterval] ?? p?.priceByCurrency?.GHS?.[billingInterval] ?? null;
          const priceDisplay = toDisplayPrice(priceGhs);
          const perMap = { hourly: "/hour", daily: "/day", weekly: "/week", monthly: "/month", quarterly: "/quarter", halfYear: "/6 months", yearly: "/year" };
          const per = perMap[billingInterval] || `/${billingInterval}`;
          const SAVINGS_MONTHS = { quarterly: 3, halfYear: 6, yearly: 12 };
          const intervalMonths = SAVINGS_MONTHS[billingInterval] || null;
          const planSavingsPct = (() => {
            if (!intervalMonths) return null;
            const ghsPrices = p?.pricing?.GHS || p?.priceByCurrency?.GHS || {};
            const mprice = Number(ghsPrices?.monthly || 0);
            const iprice = Number(priceGhs || 0);
            if (!mprice || !iprice) return null;
            const pct = Math.round((1 - iprice / (mprice * intervalMonths)) * 100);
            return pct > 0 ? pct : null;
          })();

          const planFeatures = getPlanDescriptionFeatures(p, { max: 5 });

          const isFreeLite = name.toLowerCase() === "free lite";
          const isFreeLiteDuringTrial = Boolean(isFreeLite && isFreeTrial);
          const isHQLockedPlan = isHQ && name.toLowerCase() !== "premium";

          const nextLimit = limitValue(p?.memberLimit);
          const isUpgrade = Boolean(subscribedPlanId && nextLimit > subscribedLimit);
          const isDowngrade = Boolean(subscribedPlanId && nextLimit < subscribedLimit);

          const actionLabel = isCurrent
            ? paymentRequired
              ? "Subscribe now"
              : "Current plan"
            : isHQLockedPlan
              ? "HQ: Premium only"
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
            <PriceCard
              id={id}
              name={name}
              price={priceDisplay}
              currency={displayCurrency}
              per={per}
              isMostPopular={isMostPopular}
              isCurrent={isCurrent}
              savingsPct={planSavingsPct}
              memberLimit={p?.memberLimit}
              features={planFeatures}
              actionLabel={actionLabel}
              onAction={() => onPlanAction(p)}
              disabled={payLoading || manageLoading || prorationLoading || isFreeLiteDuringTrial || isHQLockedPlan || (isCurrent && !paymentRequired)}
              loading={prorationLoading && isUpgrade && String(id) === String(planId)}
              variant="billing"
            />
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 md:p-6 lg:p-8">
        <div className="font-semibold text-gray-900 text-sm">Need a fully customized church management solution?</div>
        <div className="mt-2 text-gray-700 text-sm">
          With Ministry Plus, get a tailor-made system built specifically for your church’s needs. Features, workflows, and integrations — all designed just for you.
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setShowCustomPlanModal(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 text-xs"
          >
            Contact us for a custom plan
          </button>
        </div>
      </div>

      <PlanComparisonTable plans={plansForComparison} collapsible={true} collapsedCount={4} />

    </div>
  );

  const hasPendingCancel = subscription?.pendingPlanAction === "cancel";

  const cancelSubscriptionCard = (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold text-gray-900 text-sm">
            {hasPendingCancel ? "Cancellation Scheduled" : "Cancel Subscription"}
          </div>
          <div className="text-gray-500 text-xs">
            {hasPendingCancel
              ? "Your subscription is set to cancel at the end of the billing period. You can resume anytime before then."
              : "You can cancel anytime. Your access continues until the end of the current billing period."}
          </div>
        </div>
        {hasPendingCancel ? (
          <button
            type="button"
            onClick={() => setShowResumeConfirm(true)}
            disabled={manageLoading}
            className="rounded-lg border border-green-200 bg-white px-4 py-2 font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60 text-xs"
          >
            Resume Subscription
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            disabled={manageLoading || isFreeTrial || isHQ}
            title={isFreeTrial ? "Cannot cancel during free trial" : isHQ ? "Headquarters churches cannot cancel their Premium subscription" : undefined}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 text-xs"
          >
            Cancel Subscription
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl">
      <div>
        <div className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Billing &amp; Subscription</div>
        <div className="mt-1 text-gray-600 text-sm">Manage your subscription, payment methods, and view billing history</div>
      </div>

      {isSystemAdmin && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-gray-900 text-sm">System Settings · Configuration Duration</div>
              <div className="mt-1 text-gray-500 text-xs">Financial governance and trial duration for all churches</div>
            </div>
          </div>

          {sysError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{sysError}</div>
          ) : null}

          <div className="mt-4 space-y-4">
            {/* Governance toggles placed right before Free Trial Duration */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-gray-900 text-sm">Enforce Backdating Control</div>
                <div className="mt-0.5 text-gray-500 text-xs">Backdated creates require admin approval</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enforceBackdating}
                  onChange={(e) => handleToggleGov("enforceBackdating", e.target.checked)}
                  disabled={sysLoading}
                />
                <span className="text-gray-700 text-sm">{enforceBackdating ? "On" : "Off"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-gray-900 text-sm">Enforce Immutability</div>
                <div className="mt-0.5 text-gray-500 text-xs">Updates/deletes are disabled; use adjustments</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enforceImmutability}
                  onChange={(e) => handleToggleGov("enforceImmutability", e.target.checked)}
                  disabled={sysLoading}
                />
                <span className="text-gray-700 text-sm">{enforceImmutability ? "On" : "Off"}</span>
              </div>
            </div>

            {/* Free Trial Duration control */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block font-semibold text-gray-500 text-xs">Free Trial Duration (days)</label>
                <select
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                  disabled={sysLoading}
                >
                  {TRIAL_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={applyTrialDays}
                disabled={sysLoading}
                className="rounded-lg bg-blue-700 px-4 md:px-5 lg:px-6 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60 text-sm"
              >
                {sysLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentRequired ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 font-semibold text-red-700 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-xs">!</span>
                Payment Required
              </div>
              <div className="mt-1 text-red-700/90 text-sm">
                Your free days have ended. Complete payment to continue enjoying all features.
              </div>
            </div>
          </div>
        </div>
      ) : isFreeTrial && !isPaidPlan ? (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 font-semibold text-blue-700 text-sm">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs">i</span>
              You're on a free trial
            </div>
            <div className="text-blue-600 text-xs">
              {subscription?.trialEnd ? `Trial ends ${formatShortDate(subscription.trialEnd)}` : "Upgrade anytime to access all features"}
            </div>
          </div>
        </div>
      ) : isFreeLitePlan && !isFreeTrial ? (
        <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 font-semibold text-orange-700 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-xs">↑</span>
                You're on Free Lite
              </div>
              <div className="mt-1 text-orange-600 text-xs">
                Unlock more members, features, and tools by upgrading to a paid plan.
              </div>
            </div>
            <button
              type="button"
              onClick={() => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="shrink-0 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 text-xs"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Subscription Overview</div>
            <div className="text-gray-500 text-xs">Your current plan and billing status</div>
          </div>
          <StatusPill value={paymentRequired ? "Payment Required" : subscription?.status || "—"} />
        </div>

        {subscription?.status === "past_due" && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="text-red-800 text-xs">
                <strong>Payment overdue.</strong> Your subscription is past due.
                {subscription?.gracePeriodEnd
                  ? <> Grace period ends <strong>{new Date(subscription.gracePeriodEnd).toLocaleDateString()}</strong>. After that, all write actions will be locked.</>
                  : <> Please renew to avoid losing access.</>
                }
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setPlanId(String(currentPlanId)); onPay(); }}
              disabled={!currentPlanId || manageLoading}
              className="ml-2 flex-shrink-0 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60 text-xs"
            >
              Renew Now
            </button>
          </div>
        )}

        {subscription?.pendingPlanAction && subscription?.pendingPlanEffectiveDate && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div className="text-yellow-800 text-xs">
              {subscription.pendingPlanAction === "cancel"
                ? <>Your subscription will be <strong>cancelled</strong> on <strong>{new Date(subscription.pendingPlanEffectiveDate).toLocaleDateString()}</strong>. You will move to the Free Lite plan and retain all your data.</>
                : <>Your plan will be <strong>downgraded</strong> on <strong>{new Date(subscription.pendingPlanEffectiveDate).toLocaleDateString()}</strong>. You will retain all existing data but actions will be limited to your new plan.</>
              }
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="font-semibold text-gray-500 text-xs">Current Plan</div>
            <div className="mt-1 font-semibold text-gray-900 text-lg">{isFreeTrial ? "Free trial" : currentPlan?.name || "—"}</div>
            <div className="text-gray-500 text-xs">
              {!isFreeTrial && currentPriceGhs && currentPriceDisplay !== null ? `${formatCurrency(currentPriceDisplay, displayCurrency)}/${overviewIntervalLabel}` : ""}
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-500 text-xs">Currency</div>
            <div className="mt-2 font-semibold text-gray-900 text-sm">{displayCurrency || "—"}</div>
            <div className="text-gray-500 text-xs">Display currency</div>
          </div>

          <div>
            <div className="font-semibold text-gray-500 text-xs">{isFreeTrial ? "Trial Ends" : "Next Billing Date"}</div>
            <div className="mt-2 font-semibold text-gray-900 text-sm">{nextBillingText}</div>
            <div className="text-gray-500 text-xs">
              {isFreeTrial ? "Your free trial ends on this date" : `You will be charged ${nextBillingPriceGhs ? (nextBillingPriceDisplay !== null ? formatCurrency(nextBillingPriceDisplay, displayCurrency) : "—") : "—"} on this date`}
            </div>
          </div>
        </div>
      </div>

      {planManagementCard}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Free Days Earned</div>
            <div className="text-gray-500 text-xs">Rewards from your successful referrals</div>
          </div>
          <button
            type="button"
            onClick={() => toPage("referrals")}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
          >
            View Referral Program
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="font-semibold text-gray-500 text-xs">Total Earned</div>
            <div className="mt-2 font-semibold text-green-700 md:text-3xl lg:text-4xl text-xl md:text-2xl">{Number(freeMonths?.earned || 0) * referralBonusDays}</div>
            <div className="text-gray-500 text-xs">days ({Number(freeMonths?.earned || 0)} referral{Number(freeMonths?.earned || 0) === 1 ? "" : "s"})</div>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="font-semibold text-gray-500 text-xs">Used</div>
            <div className="mt-2 font-semibold text-orange-700 md:text-3xl lg:text-4xl text-xl md:text-2xl">{Number(freeMonths?.used || 0) * referralBonusDays}</div>
            <div className="text-gray-500 text-xs">days ({Number(freeMonths?.used || 0)} referral{Number(freeMonths?.used || 0) === 1 ? "" : "s"})</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="font-semibold text-gray-500 text-xs">Remaining</div>
            <div className="mt-2 font-semibold text-blue-700 md:text-3xl lg:text-4xl text-xl md:text-2xl">{freeRemaining * referralBonusDays}</div>
            <div className="text-gray-500 text-xs">days</div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-600 text-xs">
          <span className="font-semibold">How it works:</span> Each successful subscribed church you refer earns you {referralBonusDays} free day{referralBonusDays === 1 ? "" : "s"}. Free days are cumulative with no limit and apply automatically.
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Payment Methods</div>
            <div className="text-gray-500 text-xs">Manage your payment information</div>
            <div className="mt-2 text-blue-700 text-xs">
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
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-xs"
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
                      <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 md:h-12 md:w-12">
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <path d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-blue-800 text-sm">{methodTitle(m)}</div>
                        <div className="mt-0.5 text-gray-500 text-xs">{methodSubtitle(m)}</div>
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
                          className="font-semibold text-blue-700 hover:underline disabled:opacity-60 text-xs"
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
                        className="font-semibold text-red-600 hover:underline disabled:opacity-60 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 text-sm">No saved payment methods yet.</div>
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
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{addMethodError}</div>
            ) : null}

            <div className="font-semibold text-gray-700 text-xs">Payment Provider</div>
            <select
              value={newProvider}
              onChange={(e) => {
                if (editingMethodId) return;
                setNewProvider(e.target.value);
                setAddMethodError("");
                setAddMethodFieldErrors({});
              }}
              disabled={methodsLoading}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm"
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
                {!editingMethodId && savedPaymentMethods.some((m) => m?.type === "card") ? (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-xs">
                    <span className="font-semibold">One card allowed.</span> Saving this card will replace your existing saved card.
                  </div>
                ) : null}
                <div className="font-semibold text-gray-700 text-xs">Card Number</div>
                <input
                  ref={cardNumberRef}
                  value={newCardNumber}
                  inputMode="numeric"
                  maxLength={19}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D+/g, "").slice(0, 16);
                    const formatted = raw.replace(/(.{4})/g, "$1 ").trim();
                    setNewCardNumber(formatted);
                    if (!raw) {
                      setAddFieldError("cardNumber", "Card number is required");
                    } else if (raw.length < 13) {
                      setAddFieldError("cardNumber", "Card number length is invalid");
                    } else if (!luhnCheck(raw)) {
                      setAddFieldError("cardNumber", "Card number is invalid");
                    } else {
                      setAddFieldError("cardNumber", "");
                      if (raw.length >= 16) cardExpiryRef.current?.focus();
                    }
                  }}
                  placeholder="1234 5678 9012 3456"
                  disabled={methodsLoading}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 tracking-widest text-sm"
                />
                {addMethodFieldErrors?.cardNumber ? (
                  <div className="mt-1 font-semibold text-red-600 text-xs">{addMethodFieldErrors.cardNumber}</div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <div className="font-semibold text-gray-700 text-xs">Expiry</div>
                    <input
                      ref={cardExpiryRef}
                      value={newCardExpiry}
                      inputMode="numeric"
                      maxLength={5}
                      onChange={(e) => {
                        const prev = newCardExpiry;
                        let raw = e.target.value.replace(/\D+/g, "").slice(0, 4);
                        let formatted = raw;
                        if (raw.length >= 3) {
                          formatted = raw.slice(0, 2) + "/" + raw.slice(2);
                        } else if (raw.length === 2 && prev.length < 3) {
                          formatted = raw + "/";
                        }
                        setNewCardExpiry(formatted);
                        const match = formatted.match(/^(\d{2})\/(\d{2})$/);
                        if (!match) {
                          setAddFieldError("expiry", "Use MM/YY");
                          return;
                        }
                        const mm = Number(match[1]);
                        if (mm < 1 || mm > 12) {
                          setAddFieldError("expiry", "Expiry is invalid");
                          return;
                        }
                        setAddFieldError("expiry", "");
                        cardCvvRef.current?.focus();
                      }}
                      placeholder="MM/YY"
                      disabled={methodsLoading}
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm"
                    />
                    {addMethodFieldErrors?.expiry ? (
                      <div className="mt-1 font-semibold text-red-600 text-xs">{addMethodFieldErrors.expiry}</div>
                    ) : null}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 text-xs">CVV</div>
                    <input
                      ref={cardCvvRef}
                      value={newCardCvv}
                      inputMode="numeric"
                      maxLength={4}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D+/g, "").slice(0, 4);
                        setNewCardCvv(digits);
                        if (!digits) {
                          setAddFieldError("cvv", "CVV is required");
                        } else if (digits.length !== 3 && digits.length !== 4) {
                          setAddFieldError("cvv", "CVV must be 3 or 4 digits");
                        } else {
                          setAddFieldError("cvv", "");
                          if (digits.length >= 3) cardHolderRef.current?.focus();
                        }
                      }}
                      placeholder="123"
                      disabled={methodsLoading}
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm"
                    />
                    {addMethodFieldErrors?.cvv ? (
                      <div className="mt-1 font-semibold text-red-600 text-xs">{addMethodFieldErrors.cvv}</div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="font-semibold text-gray-700 text-xs">Cardholder Name</div>
                  <input
                    ref={cardHolderRef}
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
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm"
                  />
                  {addMethodFieldErrors?.holderName ? (
                    <div className="mt-1 font-semibold text-red-600 text-xs">{addMethodFieldErrors.holderName}</div>
                  ) : null}
                </div>
              </div>
            ) : newProvider ? (
              <div className="mt-4">
                <div className="font-semibold text-gray-700 text-xs">Mobile Number</div>
                <div className="mt-2">
                  <PhoneNumberInput
                    value={newPhone}
                    onChange={(v) => {
                      setNewPhone(v);
                      if (!v) {
                        setAddFieldError("phone", "Mobile number is required");
                        return;
                      }
                      if (!isValidPhoneNumber(v)) {
                        setAddFieldError("phone", "Invalid phone number");
                        return;
                      }
                      const gh = toGhanaNationalFromE164(v);
                      if (!gh) {
                        setAddFieldError("phone", "Mobile number must be a Ghana number");
                        return;
                      }
                      if (!isValidMomo(newProvider, gh)) {
                        setAddFieldError("phone", "Mobile number does not match selected provider");
                        return;
                      }
                      setAddFieldError("phone", "");
                    }}
                    error={Boolean(addMethodFieldErrors?.phone)}
                    disabled={methodsLoading}
                    inputClassName="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                {addMethodFieldErrors?.phone ? (
                  <div className="mt-1 font-semibold text-red-600 text-xs">{addMethodFieldErrors.phone}</div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddPaymentMethod(false)}
                disabled={methodsLoading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
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
                      if (!newPhone || !isValidPhoneNumber(newPhone)) {
                        setAddMethodError("Invalid phone number");
                        return;
                      }
                      const phoneDigits = toGhanaNationalFromE164(newPhone);
                      if (!phoneDigits) {
                        setAddMethodError("Mobile money is only available for Ghana phone numbers");
                        return;
                      }
                      if (!isValidMomo(newProvider, phoneDigits)) {
                        setAddMethodError("Mobile number does not match selected provider");
                        return;
                      }

                      const res = await addMobileMoneyPaymentMethod({ provider: newProvider, phone: newPhone });
                      const nextSub = res?.data?.subscription || subscription;
                      setSubscription(nextSub);
                      const nextMethods = Array.isArray(nextSub?.paymentMethods) ? nextSub.paymentMethods : [];
                      const idx = nextMethods.findIndex(
                        (m) =>
                          String(m?.type || "").toLowerCase() === "mobile_money" &&
                          String(m?.provider || "") === String(newProvider) &&
                          String(m?.phone || "") === String(newPhone)
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
                className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60 text-sm"
              >
                {methodsLoading ? "Saving…" : editingMethodId ? "Save Changes" : "Add Payment Method"}
              </button>
            </div>
          </div>
        </ModalShell>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
        <div>
          <div className="font-semibold text-gray-900 text-sm">Billing History</div>
          <div className="text-gray-500 text-xs">Complete record of all transactions and free day usage</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-100">
              <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
                <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
                <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Currency</th>
                <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(Array.isArray(history) ? history : []).map((row, idx) => (
                <tr key={row?._id || idx} className="max-md:text-xs text-gray-700 text-sm">
                  <td className="sticky left-0 z-10 bg-white max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">{row?.createdAt ? formatShortDate(row.createdAt) : "—"}</td>
                  <td className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">{row?.type === "free_month" ? "Free Days" : "Payment"}</td>
                  <td className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">{row?.type === "free_month" ? "—" : (isGhana || !usdToGhs ? formatCurrency(row?.amount || 0, row?.currency || "GHS") : formatCurrency((row?.amount || 0) / Number(usdToGhs), "USD"))}</td>
                  <td className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">{isGhana || !usdToGhs ? (row?.currency || "—") : "USD"}</td>
                  <td className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">
                    <StatusPill value={row?.status || "—"}/>
                  </td>
                  <td className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">
                    {row?._id ? (
                      <a
                        href={getBillingInvoiceDownloadUrl(row._id)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-700 hover:underline text-xs"
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
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 disabled:opacity-50 text-sm"
          >
            Prev
          </button>
          <div className="text-gray-600 text-sm">Page {historyPagination?.currentPage || 1}</div>
          <button
            type="button"
            onClick={() => loadHistoryPage(historyPagination?.nextPage)}
            disabled={!historyPagination?.nextPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 disabled:opacity-50 text-sm"
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
          <div className="font-semibold text-gray-900 text-sm">If you cancel your subscription:</div>
          <div className="mt-3 space-y-2 text-gray-700 text-sm">
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
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
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
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60 text-sm"
          >
            Confirm Cancellation
          </button>
        </div>
      </ModalShell>

      <ModalShell
        open={showResumeConfirm}
        title="Resume Subscription"
        subtitle="Are you sure you want to keep your subscription active?"
        onClose={() => setShowResumeConfirm(false)}
        maxWidthClass="max-w-xl"
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-gray-700 text-sm">
            The scheduled cancellation will be removed. Your subscription will automatically renew as normal on the next billing date.
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowResumeConfirm(false)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
          >
            Keep Cancellation
          </button>
          <button
            type="button"
            onClick={async () => {
              setManageLoading(true);
              setError("");
              try {
                await undoMyCancellation();
                setShowResumeConfirm(false);
                await load();
              } catch (e) {
                setError(e?.response?.data?.message || e?.message || "Failed to resume subscription");
              } finally {
                setManageLoading(false);
              }
            }}
            disabled={manageLoading}
            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60 text-sm"
          >
            Confirm Resume
          </button>
        </div>
      </ModalShell>

      <ModalShell
        open={showDowngradeConfirm}
        title="Downgrade Plan"
        subtitle={`Switch to ${pendingDowngradePlan?.name || "a lower"} plan`}
        onClose={() => { if (manageLoading) return; setShowDowngradeConfirm(false); setPendingDowngradePlan(null); }}
        maxWidthClass="max-w-xl"
      >
        <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
          <div className="font-semibold text-gray-900 text-sm">If you downgrade your plan:</div>
          <div className="mt-3 space-y-2 text-gray-700 text-sm">
            <div>- The change takes effect at the end of your current billing period</div>
            <div>- You will retain all existing data</div>
            <div>- Some features and actions will be limited to your new plan</div>
            <div>- You can upgrade again at any time</div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => { setShowDowngradeConfirm(false); setPendingDowngradePlan(null); }}
            disabled={manageLoading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
          >
            Keep Current Plan
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!pendingDowngradePlan?._id) return;
              setManageLoading(true);
              setError("");
              try {
                await changeMyPlan({ newPlanId: pendingDowngradePlan._id });
                setShowDowngradeConfirm(false);
                setPendingDowngradePlan(null);
                setToastMessage("Plan downgrade scheduled.");
                setTimeout(() => setToastMessage(""), 4000);
                await load();
              } catch (e) {
                setError(e?.response?.data?.message || e?.message || "Failed to change plan");
              } finally {
                setManageLoading(false);
              }
            }}
            disabled={manageLoading}
            className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-60 text-sm"
          >
            {manageLoading ? "Processing…" : "Confirm Downgrade"}
          </button>
        </div>
      </ModalShell>

      {showProrationModal && prorationData && (() => {
        const bd = prorationData.breakdown || {};
        const proratedGhs = Number(bd.proratedAmount ?? 0);
        const usdRate = Number(prorationData.usdRate || 0);
        const showUsd = !prorationData.isGhana && usdRate > 0;
        const fmt = (ghs, cur) => {
          const v = cur === "USD" ? ghs / usdRate : ghs;
          return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(v);
        };
        const display = (ghs) => showUsd ? fmt(ghs, "USD") : fmt(ghs, "GHS");
        const pctRemaining = Math.round((bd.remainingFraction ?? 0) * 100);
        const renewDate = bd.retainNextBillingDate ? new Date(bd.retainNextBillingDate).toLocaleDateString() : "—";

        return (
          <ModalShell
            open={showProrationModal}
            title="Upgrade Plan"
            subtitle="Review your prorated upgrade charge before confirming"
            onClose={() => { setShowProrationModal(false); setProrationData(null); }}
            maxWidthClass="max-w-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="font-semibold text-gray-500 uppercase tracking-wide text-xs">Current Plan</div>
                <div className="mt-1 font-bold text-gray-900 text-base">{prorationData.currentPlan?.name || "—"}</div>
                <div className="mt-1 text-gray-500 text-xs">{display(bd.currentPlanPrice ?? 0)}/{billingInterval}</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="font-semibold text-blue-600 uppercase tracking-wide text-xs">New Plan</div>
                <div className="mt-1 font-bold text-blue-900 text-base">{prorationData.newPlan?.name || "—"}</div>
                <div className="mt-1 text-blue-700 text-xs">{display(bd.newPlanPrice ?? 0)}/{billingInterval}</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 text-sm">
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-600">Remaining billing period</span>
                <span className="font-semibold text-gray-900">{bd.remainingDays ?? 0} / {bd.totalDays ?? 0} days ({pctRemaining}%)</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-green-700">
                <span>Credit from {prorationData.currentPlan?.name}</span>
                <span className="font-semibold">− {display(bd.currentPlanCredit ?? 0)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-gray-700">
                <span>{prorationData.newPlan?.name} for remaining period</span>
                <span className="font-semibold">+ {display(bd.newPlanCost ?? 0)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-blue-50 rounded-b-xl">
                <span className="font-bold text-gray-900">You pay today</span>
                <span className="font-bold text-blue-700 md:text-2xl lg:text-3xl text-xl">{display(proratedGhs)}</span>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-gray-600 text-xs">
              Your plan upgrades <strong>immediately</strong> on payment. Next renewal on <strong>{renewDate}</strong> at the full {prorationData.newPlan?.name} price ({display(bd.newPlanPrice ?? 0)}).
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowProrationModal(false); setProrationData(null); }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProrationModal(false);
                  onPay();
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 text-sm"
              >
                Proceed to Payment — {display(proratedGhs)}
              </button>
            </div>
          </ModalShell>
        );
      })()}

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
        {(() => {
          const isProration = Boolean(prorationData?.breakdown?.proratedAmount >= 0);
          const bd = prorationData?.breakdown || {};
          const proratedGhs = isProration ? Number(bd.proratedAmount ?? 0) : null;
          const proratedDisplay = proratedGhs !== null ? toDisplayPrice(proratedGhs) : null;
          const displayAmt = isProration
            ? (isGhana ? formatCurrency(proratedGhs, "GHS") : proratedDisplay !== null ? formatCurrency(proratedDisplay, "USD") : "—")
            : (isGhana ? formatCurrency(selectedPriceGhs ?? 0, "GHS") : selectedPriceDisplay !== null ? formatCurrency(selectedPriceDisplay, "USD") : "—");

          return (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="text-gray-700">Plan</div>
                  <div className="font-semibold text-gray-900">{selectedPlan?.name || "—"}</div>
                </div>
                {isProration && (
                  <>
                    <div className="flex items-center justify-between gap-4 text-green-700 text-sm">
                      <div>Credit from {prorationData.currentPlan?.name}</div>
                      <div className="font-semibold">
                        − {isGhana ? formatCurrency(bd.currentPlanCredit ?? 0, "GHS") : toDisplayPrice(bd.currentPlanCredit ?? 0) !== null ? formatCurrency(toDisplayPrice(bd.currentPlanCredit ?? 0), "USD") : "—"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <div className="text-gray-700">{selectedPlan?.name} for remaining period</div>
                      <div className="font-semibold text-gray-900">
                        + {isGhana ? formatCurrency(bd.newPlanCost ?? 0, "GHS") : toDisplayPrice(bd.newPlanCost ?? 0) !== null ? formatCurrency(toDisplayPrice(bd.newPlanCost ?? 0), "USD") : "—"}
                      </div>
                    </div>
                  </>
                )}
                {!isProration && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div className="text-gray-700">Amount</div>
                    <div className="font-semibold text-gray-900">{displayAmt}</div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="text-gray-700">Billing Cycle</div>
                  <div className="font-semibold text-gray-900">{({ hourly: "Hourly", daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", halfYear: "6 Months", yearly: "Yearly" })[billingInterval] || billingInterval}</div>
                </div>
              </div>

              <div className="mt-4 border-t border-blue-100 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold text-gray-700 text-sm">{isProration ? "Prorated Amount Due Now" : "Total Due Now"}</div>
                  <div className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">{displayAmt}</div>
                </div>
                {isProration && (
                  <div className="mt-1 text-gray-500 text-xs">
                    Next renewal on {bd.retainNextBillingDate ? new Date(bd.retainNextBillingDate).toLocaleDateString() : "—"} at full price.
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
              <div className="font-semibold text-gray-900 text-sm">What happens next:</div>
              <div className="mt-2 space-y-1 text-gray-600 text-sm">
                <div>- You'll be charged {isGhana
                    ? formatCurrency(selectedPriceGhs ?? 0, "GHS")
                    : selectedPriceDisplay !== null
                      ? formatCurrency(selectedPriceDisplay, "USD")
                      : "—"} today</div>
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
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPaymentSummary(false);
              setShowPaymentMethod(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 md:px-5 lg:px-6 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 text-sm"
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
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{checkoutError}</div>
          ) : null}

          <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="text-sm">
              <span className="text-gray-500">Plan: </span>
              <span className="font-semibold text-gray-900">{selectedPlan?.name || "—"}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900 text-sm">
                {isGhana
                  ? formatCurrency(selectedPriceGhs ?? 0, "GHS")
                  : selectedPriceDisplay !== null
                    ? formatCurrency(selectedPriceDisplay, "USD")
                    : "—"}
              </div>
              <div className="text-gray-500 text-xs">
                {({ hourly: "/hour", daily: "/day", weekly: "/week", monthly: "/month", quarterly: "/quarter", halfYear: "/6 months", yearly: "/year" })[billingInterval] || `/${billingInterval}`}
              </div>
            </div>
          </div>

          <div className="font-semibold text-gray-900 text-sm">Saved Payment Methods</div>
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
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 md:h-12 md:w-12">
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <path d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-blue-800 text-sm">{methodTitle(m)}</div>
                        <div className="truncate text-gray-500 text-xs">{methodSubtitle(m)}</div>
                      </div>
                    </div>

                    {showFailedBadge ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">Last payment failed</span>
                    ) : null}
                  </label>
                );
              })
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 text-sm">No saved payment methods yet.</div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="font-semibold text-gray-900 text-sm">Add New Payment Method</div>
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
              className="font-semibold text-blue-700 hover:underline text-sm"
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
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 text-sm"
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

                const isProrationPayment = Boolean(prorationData?.breakdown?.proratedAmount >= 0);
                const amount = isProrationPayment
                  ? (prorationData.breakdown.proratedAmount ?? selectedPriceGhs ?? 0)
                  : (selectedPriceGhs ?? 0);
                const checkoutCurrency = "GHS";

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
                    channels,
                    currency: "GHS",
                    isUpgrade: isProrationPayment
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

                  const { reference, wasCancelled } = await new Promise((resolve) => {
                    let settled = false;
                    const handler = paystack.setup({
                      key,
                      email: payerEmail,
                      amount: amountMinor,
                      currency: checkoutCurrency,
                      ...(channels.length ? { channels } : {}),
                      access_code: accessCode,
                      ref: initRef,
                      callback: (response) => {
                        if (settled) return;
                        settled = true;
                        resolve({ reference: response?.reference || response?.trxref || initRef, wasCancelled: false });
                      },
                      onClose: () => {
                        if (settled) return;
                        settled = true;
                        resolve({ reference: initRef, wasCancelled: true });
                      }
                    });
                    handler.openIframe();
                  });

                  if (wasCancelled) {
                    try { await cancelPaystackPayment({ reference }); } catch {}
                    setCheckoutError("Payment was cancelled");
                    return;
                  }

                  const st = await pollVerify(reference);
                  if (st === "paid") {
                    setProrationData(null);
                    setPaymentResult({ status: "success", amount: amountMajor });
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
              className="rounded-lg bg-blue-700 px-4 md:px-5 lg:px-6 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60 text-sm"
              disabled={checkoutLoading}
            >
              {checkoutLoading
                ? "Processing…"
                : `Proceed to Pay ${
                    !isGhana && selectedPriceDisplay !== null
                      ? formatCurrency(selectedPriceDisplay, "USD")
                      : formatCurrency(selectedPriceGhs ?? 0, "GHS")
                  }`}
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

          <div className="mt-4 font-semibold text-gray-900 text-lg">
            {paymentResult?.status === "success"
              ? "Payment Completed Successfully"
              : paymentResult?.status === "pending"
                ? "Payment Pending"
                : "Payment Not Completed"}
          </div>
          <div className="mt-2 text-gray-600 text-sm">
            Amount paid: <span className="font-semibold text-gray-900">{formatCurrency(paymentResult?.amount ?? 0, "GHS")}</span>
          </div>

          {paymentResult?.status === "success" ? (
            <div className="mt-5 w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-left">
              <div className="font-semibold text-green-900 text-sm">What's Next:</div>
              <div className="mt-2 space-y-1 text-green-900/90 text-sm">
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
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-800 shadow-lg text-sm">
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
