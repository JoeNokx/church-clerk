export function formatMoney(value, currency) {
  const v = Number(value || 0);
  const cur = String(currency || "").trim().toUpperCase();

  if (!cur) return v.toLocaleString();

  if (cur === "USD") {
    try {
      const nf = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      return `$${nf.format(v)}`;
    } catch {
      return `$${v.toLocaleString()}`;
    }
  }

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

export function formatCompactMoney(value, currency) {
  const v = Number(value || 0);
  const cur = String(currency || "").trim().toUpperCase();
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";

  let compact;
  if (abs >= 1_000_000_000) compact = `${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  else if (abs >= 1_000_000) compact = `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  else if (abs >= 1_000) compact = `${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  else compact = `${abs}`;

  const prefix = cur === "USD" ? "$" : cur ? `${cur} ` : "";
  return `${sign}${prefix}${compact}`;
}
