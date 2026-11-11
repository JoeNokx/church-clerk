// Single source of truth for "Save X%" on plan cards.
// Compares a billing interval's total price against paying monthly
// for the same number of months.

export const SAVINGS_MONTHS = { quarterly: 3, halfYear: 6, yearly: 12 };

/**
 * @param {object} ghsPrices - plan.pricing.GHS (or priceByCurrency.GHS)
 * @param {string} interval  - "monthly" | "quarterly" | "halfYear" | "yearly"
 * @returns {number|null} rounded savings percent, or null when there is no saving
 */
export function computeSavingsPct(ghsPrices, interval) {
  const months = SAVINGS_MONTHS[interval];
  if (!months) return null;
  const monthly = Number(ghsPrices?.monthly || 0);
  const intervalPrice = Number(ghsPrices?.[interval] || 0);
  if (!monthly || !intervalPrice) return null;
  const pct = Math.round((1 - intervalPrice / (monthly * months)) * 100);
  return pct > 0 ? pct : null;
}

/**
 * @param {Array} plans - plan objects with pricing/priceByCurrency
 * @returns {object} map of interval -> rounded average savings percent
 *                   across plans, e.g. { halfYear: 8, yearly: 15 }
 */
export function computeIntervalSavingsMap(plans) {
  const result = {};
  for (const interval of Object.keys(SAVINGS_MONTHS)) {
    const percentages = (Array.isArray(plans) ? plans : [])
      .map((p) => computeSavingsPct(p?.pricing?.GHS || p?.priceByCurrency?.GHS || {}, interval))
      .filter((v) => v !== null);
    if (percentages.length > 0) {
      result[interval] = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
    }
  }
  return result;
}
