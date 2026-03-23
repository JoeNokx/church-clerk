const USD_TO_GHS_CACHE_KEY = "cck_fx_usd_to_ghs_v1";
const USD_RATES_CACHE_KEY = "cck_fx_usd_rates_v1";
const USD_TO_GHS_CACHE_TTL_MS = 1000 * 60 * 60;

let memUsdToGhs = null;
let memUsdRates = null;

const nowMs = () => Date.now();

const readCache = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USD_TO_GHS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.rate || !Number.isFinite(Number(parsed.rate))) return null;
    if (!parsed.ts || !Number.isFinite(Number(parsed.ts))) return null;

    const age = nowMs() - Number(parsed.ts);
    if (age < 0 || age > USD_TO_GHS_CACHE_TTL_MS) return null;

    return { rate: Number(parsed.rate), ts: Number(parsed.ts) };
  } catch {
    return null;
  }
};

const readRatesCache = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USD_RATES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.ts || !Number.isFinite(Number(parsed.ts))) return null;
    if (!parsed.rates || typeof parsed.rates !== "object") return null;

    const age = nowMs() - Number(parsed.ts);
    if (age < 0 || age > USD_TO_GHS_CACHE_TTL_MS) return null;

    return { rates: parsed.rates, ts: Number(parsed.ts) };
  } catch {
    return null;
  }
};

const writeCache = (rate) => {
  memUsdToGhs = { rate: Number(rate), ts: nowMs() };
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      USD_TO_GHS_CACHE_KEY,
      JSON.stringify({ rate: memUsdToGhs.rate, ts: memUsdToGhs.ts })
    );
  } catch {
    
  }
};

const writeRatesCache = (rates) => {
  memUsdRates = { rates: rates || {}, ts: nowMs() };
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USD_RATES_CACHE_KEY, JSON.stringify({ rates: memUsdRates.rates, ts: memUsdRates.ts }));
  } catch {
    
  }
};

export async function getUsdToGhsRate() {
  if (memUsdToGhs && Number.isFinite(memUsdToGhs.rate)) return memUsdToGhs.rate;

  const cached = readCache();
  if (cached) {
    memUsdToGhs = cached;
    return cached.rate;
  }

  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
  if (!res.ok) {
    throw new Error("Failed to load exchange rate");
  }

  const json = await res.json();
  const rate = Number(json?.rates?.GHS);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid exchange rate");
  }

  writeCache(rate);
  return rate;
}

export async function getUsdRates() {
  if (memUsdRates && memUsdRates.rates && typeof memUsdRates.rates === "object") return memUsdRates.rates;

  const cached = readRatesCache();
  if (cached) {
    memUsdRates = cached;
    return cached.rates;
  }

  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
  if (!res.ok) {
    throw new Error("Failed to load exchange rates");
  }

  const json = await res.json();
  const rates = json?.rates && typeof json.rates === "object" ? json.rates : {};
  writeRatesCache(rates);
  return rates;
}

export async function getUsdToCurrencyRate(currency) {
  const cur = String(currency || "").trim().toUpperCase();
  if (!cur) return null;
  if (cur === "USD") return 1;

  const rates = await getUsdRates();
  const r = Number(rates?.[cur]);
  if (!Number.isFinite(r) || r <= 0) return null;
  return r;
}

export async function convertGhsToCurrency(amountGhs, targetCurrency) {
  const ghs = Number(amountGhs || 0);
  const cur = String(targetCurrency || "").trim().toUpperCase();
  if (!cur || cur === "GHS") return ghs;

  const usdToGhs = await getUsdToGhsRate();
  if (!Number.isFinite(usdToGhs) || usdToGhs <= 0) return ghs;
  const usd = ghs / usdToGhs;
  if (cur === "USD") return usd;

  const usdToTarget = await getUsdToCurrencyRate(cur);
  if (!Number.isFinite(usdToTarget) || usdToTarget <= 0) return ghs;
  return usd * usdToTarget;
}

export async function convertGhsToUsd(amountGhs) {
  const ghs = Number(amountGhs || 0);
  const usdToGhs = await getUsdToGhsRate();
  return usdToGhs > 0 ? ghs / usdToGhs : 0;
}
