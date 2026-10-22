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
