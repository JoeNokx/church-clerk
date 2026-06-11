function pickTop(rows) {
  const valid = (rows || []).filter((r) => Number(r?.amount || 0) > 0);
  if (!valid.length) return null;
  valid.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  return valid[0];
}

function withPercent(rows, total) {
  const denom = Number(total || 0);
  return (rows || []).map((r) => {
    const amount = Number(r?.amount || 0);
    const pct = denom > 0 ? (amount / denom) * 100 : 0;
    return { ...r, amount, percentage: pct };
  });
}

export { pickTop, withPercent };
