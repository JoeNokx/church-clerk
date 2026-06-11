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
  const allowed = ["free lite", "basic", "standard", "premium"];
  if (!allowed.includes(String(name || "").trim().toLowerCase())) {
    throw new Error("Invalid plan name. Allowed: free lite, basic, standard, premium");
  }
};

export {
  normalizeBillingIntervalKey,
  clamp,
  normalizePriceByCurrency,
  sanitizePriceByCurrency,
  sanitizePlanCurrencies,
  normalizePlanName,
  validatePlanName
};
