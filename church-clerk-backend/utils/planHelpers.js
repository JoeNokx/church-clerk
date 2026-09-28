const normalizeBillingIntervalKey = (billingInterval) => {
  const v = String(billingInterval || "").trim().toLowerCase();
  if (v === "hourly")    return "hourly";
  if (v === "daily")     return "daily";
  if (v === "weekly")    return "weekly";
  if (v === "monthly" || v === "month") return "monthly";
  if (v === "quarterly") return "quarterly";
  if (v === "halfyear" || v === "half_year" || v === "half-year" || v === "biannually" || v === "semiannually") return "halfYear";
  if (v === "yearly" || v === "year" || v === "annually" || v === "annual") return "yearly";
  return String(billingInterval || "").trim();
};

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

const normalizePriceByCurrency = (body) => {
  const priceByCurrency = body?.priceByCurrency || body?.pricing;
  if (!priceByCurrency) return null;
  return priceByCurrency;
};

const sanitizePriceByCurrency = (priceByCurrency) => {
  if (!priceByCurrency || typeof priceByCurrency !== "object") return null;
  const sanitized = {};
  if (priceByCurrency?.GHS) sanitized.GHS = priceByCurrency.GHS;
  return Object.keys(sanitized).length ? sanitized : null;
};

const sanitizePlanCurrencies = (plan) => {
  if (!plan) return plan;
  const obj = typeof plan.toObject === "function" ? plan.toObject() : plan;
  const copy = { ...obj };

  const nextPricing = {};
  if (copy?.pricing?.GHS) nextPricing.GHS = copy.pricing.GHS;
  copy.pricing = nextPricing;

  const nextPriceByCurrency = {};
  if (copy?.priceByCurrency?.GHS) nextPriceByCurrency.GHS = copy.priceByCurrency.GHS;
  copy.priceByCurrency = nextPriceByCurrency;

  return copy;
};

const normalizePlanName = (name) => {
  return typeof name === "string" ? name.trim().toLowerCase() : name;
};

const validatePlanName = (name) => {
  const allowed = ["free", "free lite", "light", "basic", "standard", "premium"];
  if (!allowed.includes(String(name || "").trim().toLowerCase())) {
    throw new Error("Invalid plan name. Allowed: free, free lite, light, basic, standard, premium");
  }
};

// ---- Robust plan resolution ---------------------------------------------
// Several flows (trial release, trial display, cancellation fallback) need
// the "Free Lite" and "Premium" plans. Name-regex lookups alone are fragile —
// if a plan is renamed or removed the lookup silently returns null. These
// resolvers prefer the canonical names but fall back to tier/price ordering
// so the system keeps working even if plan names change.

const PLAN_TIER = {
  free: 0,
  "free lite": 0,
  light: 0,
  basic: 1,
  standard: 2,
  premium: 3
};

const planTier = (plan) => {
  const t = PLAN_TIER[String(plan?.name || "").trim().toLowerCase()];
  return t === undefined ? 99 : t;
};

const planMonthlyPrice = (plan) =>
  Number(plan?.priceByCurrency?.GHS?.monthly ?? plan?.pricing?.GHS?.monthly) || 0;

// Free-tier plan names — matches every name findFreeLitePlan() can resolve,
// so Free Lite feature gating keeps working even if the plan is renamed
// to "free" or "light".
const isFreeTierPlanName = (name) =>
  ["free", "free lite", "light"].includes(
    String(name || "").trim().toLowerCase()
  );

const findFreeLitePlan = async () => {
  const Plan = (await import("../models/billingModel/planModel.js")).default;

  // 1. Canonical name
  let plan = await Plan.findOne({ isActive: true, name: { $regex: /^free\s*lite$/i } }).lean();
  if (plan) return plan;

  // 2. Any other free-tier name
  plan = await Plan.findOne({ isActive: true, name: { $regex: /^(free|light)$/i } }).lean();
  if (plan) return plan;

  // 3. Cheapest active plan (tier first, then monthly price)
  const plans = await Plan.find({ isActive: true }).lean();
  if (!plans.length) return null;
  plans.sort((a, b) => (planTier(a) - planTier(b)) || (planMonthlyPrice(a) - planMonthlyPrice(b)));
  return plans[0] || null;
};

const findPremiumPlan = async () => {
  const Plan = (await import("../models/billingModel/planModel.js")).default;

  // 1. Canonical name
  let plan = await Plan.findOne({ isActive: true, name: { $regex: /^premium$/i } }).lean();
  if (plan) return plan;

  // 2. Highest-tier active paid plan
  const plans = await Plan.find({ isActive: true }).lean();
  if (!plans.length) return null;
  plans.sort((a, b) => (planTier(b) - planTier(a)) || (planMonthlyPrice(b) - planMonthlyPrice(a)));
  const top = plans[0];
  return planTier(top) >= 99 ? null : top;
};

export {
  normalizeBillingIntervalKey,
  clamp,
  normalizePriceByCurrency,
  sanitizePriceByCurrency,
  sanitizePlanCurrencies,
  normalizePlanName,
  validatePlanName,
  findFreeLitePlan,
  findPremiumPlan,
  isFreeTierPlanName
};
