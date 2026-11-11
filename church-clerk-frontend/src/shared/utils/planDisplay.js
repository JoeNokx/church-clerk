export function formatPlanName(name) {
  return String(name || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isFreeTierPlanName(name) {
  return ["free lite", "free", "light"].includes(
    String(name || "").trim().toLowerCase()
  );
}
