export function parsePlanDescriptionFeatures(description) {
  const raw = typeof description === "string" ? description : "";
  const normalized = raw.replace(/\r\n?/g, "\n");

  const parts = normalized
    .split(/\n+/g)
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(?:[-*•]|\u2022|\u25CF|\u2713|\u2714|\d+\.|\d+\)|\([a-zA-Z]\)|\([0-9]+\))\s+/g, ""))
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  const unique = [];
  const seen = new Set();
  for (const item of parts) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export function getPlanDescriptionFeatures(plan, options = {}) {
  const max = Number.isFinite(Number(options.max)) ? Number(options.max) : null;
  const features = parsePlanDescriptionFeatures(plan?.description);
  if (!max || max <= 0) return features;
  return features.slice(0, max);
}
