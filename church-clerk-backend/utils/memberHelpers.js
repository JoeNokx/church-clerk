import Church from "../models/churchModel.js";

function parseOptionalDate(value) {
  const v = String(value || "").trim();
  if (!v) return { date: null, error: null };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { date: null, error: "Invalid date" };
  return { date: d, error: null };
}

async function getChurchPrefix(churchId) {
  const church = await Church.findById(churchId).lean();
  if (!church) return null;

  const prefix = String(church?.name || "")
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, "")[0])
    .filter(Boolean)
    .map((ch) => ch.toUpperCase())
    .join("");

  return prefix || "CH";
}

function generateMemberId(prefix, existingCount) {
  const count = Number(existingCount) + 1;
  const padded = String(count).padStart(4, "0");
  return `${prefix}-${padded}`;
}

export { parseOptionalDate, getChurchPrefix, generateMemberId };
