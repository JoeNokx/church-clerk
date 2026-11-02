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

// Reserve the next member serial for a church — atomic, so concurrent
// registrations can never be handed the same number.
async function takeMemberSerial(churchId) {
  const updated = await Church.findByIdAndUpdate(
    churchId,
    { $inc: { memberSerial: 1 } },
    { new: true }
  );
  return updated ? Number(updated.memberSerial || 0) : null;
}

// Give back a serial that was taken but never used because the member
// save failed. Only releases it while it's still the newest number
// issued — if another registration has since taken a higher serial,
// the unused number stays a safe gap rather than risking a re-issue.
async function releaseMemberSerial(churchId, issuedSerial) {
  if (!issuedSerial) return;
  await Church.updateOne(
    { _id: churchId, memberSerial: issuedSerial },
    { $inc: { memberSerial: -1 } }
  );
}

export { parseOptionalDate, getChurchPrefix, generateMemberId, takeMemberSerial, releaseMemberSerial };
