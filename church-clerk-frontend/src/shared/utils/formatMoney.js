export function formatMoney(value, currency) {
  const v = Number(value || 0);
  const cur = String(currency || "").trim().toUpperCase();

  if (!cur) return v.toLocaleString();

  try {
    const nf = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0
    });
    return nf.format(v);
  } catch {
    return `${cur} ${v.toLocaleString()}`;
  }
}
