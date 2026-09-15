import mongoose from "mongoose";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { getDefaultSmsSenderId } from "../services/africasTalkingSmsService.js";
import { resolveSenderId } from "./resolveSenderId.js";

function computeCostPerRecipientCredits({ channels, smsCostCredits }) {
  const arr = Array.isArray(channels) ? channels : [];
  const costs = {
    sms: Number.isFinite(Number(smsCostCredits)) ? Number(smsCostCredits) : 5
  };
  return arr.reduce((sum, c) => sum + (costs[String(c)] || 0), 0);
}

// GSM 03.38 character set (basic SMS). If a message contains only these characters
// it uses 7-bit encoding (160 chars/segment, 153 for multi-segment). Anything else
// falls back to UCS-2 (70 chars/segment, 67 for multi-segment).
const GSM_7_CHARS =
  "@\u00a3$\u00a5\u00e8\u00e9\u00f9\u00ec\u00f2\u00c7\n\u00d8\u00f8\r\u00c5\u00e5\u0394_\u03a6\u0393\u039b\u03a9\u03a0\u03a8\u03a3\u0398\u039e\u00c6\u00e6\u00df\u00c9 !\"#\u00a4%&'()*+,-./0123456789:;<=>?\u00a1ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00c4\u00d6\u00d1\u00dc\u00a7\u00bfabcdefghijklmnopqrstuvwxyz\u00e4\u00f6\u00f1\u00fc\u00e0";

const isGsm7 = (text) => {
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    if (!GSM_7_CHARS.includes(s[i])) return false;
  }
  return true;
};

/**
 * Count the number of SMS segments for a message body.
 * - GSM-7: 160 chars for a single segment, 153 per segment when split.
 * - UCS-2: 70 chars for a single segment, 67 per segment when split.
 */
function countSmsSegments(text) {
  const len = String(text || "").length;
  if (len === 0) return 0;

  const gsm = isGsm7(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;

  if (len <= single) return 1;
  return Math.ceil(len / multi);
}

/**
 * Total SMS credits for a broadcast = segments per message x recipients x per-segment cost.
 * `smsCostCredits` is now treated as the cost per SMS segment (not per recipient).
 */
function computeSmsBroadcastCredits({ content, recipientCount, smsCostCredits }) {
  const segments = countSmsSegments(content);
  const perSegment = Number.isFinite(Number(smsCostCredits)) ? Number(smsCostCredits) : 5;
  return Math.max(0, segments) * Math.max(0, recipientCount) * perSegment;
}

function parseSchedule({ scheduledDate, scheduledTime }) {
  const d = String(scheduledDate || "").trim();
  const t = String(scheduledTime || "").trim();
  if (!d || !t) return null;
  const dt = new Date(`${d}T${t}:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function toScheduleParts(dateValue) {
  if (!dateValue) return { scheduledDate: "", scheduledTime: "" };
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return { scheduledDate: "", scheduledTime: "" };
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { scheduledDate: `${yyyy}-${mm}-${dd}`, scheduledTime: `${hh}:${mi}` };
}

function toObjectIdList(ids) {
  const arr = Array.isArray(ids) ? ids : [];
  return arr
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .map((v) => {
      try {
        return new mongoose.Types.ObjectId(v);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function normalizeSmsPhoneE164(rawPhone) {
  const raw = String(rawPhone || "").trim();
  if (!raw) return null;

  try {
    const parsed = raw.startsWith("+")
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, "GH");

    if (!parsed || !parsed.isValid()) return null;
    return parsed.number;
  } catch {
    return null;
  }
}

function resolveSmsSenderIdOrThrow({ church, requestedSenderId }) {
  const primary = String(requestedSenderId || "").trim();
  const resolved = primary || resolveSenderId(church) || getDefaultSmsSenderId();
  if (!resolved) {
    // In development, allow sending without a sender ID — AT uses its default.
    if (process.env.NODE_ENV !== "production") {
      return null;
    }
    throw new Error("SMS sender ID is required. Set AFRICA_TALKING_SENDER_ID in .env or provide an approved church sender ID.");
  }
  return resolved;
}

function mapAfricasTalkingRecipientToStatus(statusRaw) {
  const s = String(statusRaw || "").trim().toLowerCase();
  if (s === "success" || s === "delivered") return "delivered";
  if (s === "sent" || s === "submitted" || s === "queued" || s === "buffered" || s === "accepted") return "sent";
  if (s === "rejected") return "failed";
  if (s === "failed" || s === "expired" || s === "undeliverable" || s === "dropped") return "failed";
  // Unknown / empty — treat as failed for safety
  return "failed";
}

/**
 * Returns true when Africa's Talking rejected the message BEFORE accepting it.
 * Only these cases warrant a credit refund. Once the provider accepts the SMS
 * (Sent / Submitted / Queued / Success), credits stay deducted even if final
 * delivery later fails.
 */
function isAfricasTalkingPreAcceptanceRejection(statusRaw) {
  const s = String(statusRaw || "").trim().toLowerCase();
  return s === "rejected" || s === "invalid" || s === "rejected";
}

/**
 * Converts an Africa's Talking status / error code into a simple English
 * explanation that a church admin can understand.
 */
function friendlySmsError(statusOrError) {
  const s = String(statusOrError || "").trim().toLowerCase();
  const map = {
    "rejected": "The phone number could not receive this SMS. It may be invalid, on a blocked list, or the sender ID is not approved for this network.",
    "invalid": "The phone number is invalid or not formatted correctly.",
    "failed": "The mobile network could not deliver this SMS. The phone may be switched off, out of coverage, or have a full inbox.",
    "expired": "The SMS was sent but not delivered within the allowed time. The phone may be switched off or out of coverage.",
    "undeliverable": "The mobile network confirmed this SMS cannot be delivered to this number.",
    "dropped": "The SMS was dropped before delivery. This can happen due to network congestion or an unsupported number.",
    "insufficient balance": "Your Africa's Talking account does not have enough credit to send this SMS.",
    "invalid sender id": "The sender ID is not approved on your Africa's Talking account. Please request and approve a sender ID.",
    "rate limit": "Too many SMS were sent at once. Please wait a moment and try again.",
    "invalid phone number": "The phone number is invalid or not formatted correctly.",
    "invalid phone": "The phone number is invalid or not formatted correctly."
  };
  if (map[s]) return map[s];
  // Partial match for common phrases
  if (s.includes("insufficient")) return "Your Africa's Talking account does not have enough credit to send this SMS.";
  if (s.includes("sender")) return "The sender ID is not approved on your Africa's Talking account.";
  if (s.includes("rate")) return "Too many SMS were sent at once. Please wait a moment and try again.";
  if (s.includes("invalid")) return "The phone number is invalid or not formatted correctly.";
  // Fallback — return the raw text if we can't match it
  return s ? String(statusOrError) : "Failed";
}

export {
  computeCostPerRecipientCredits,
  parseSchedule,
  toScheduleParts,
  toObjectIdList,
  normalizeSmsPhoneE164,
  resolveSmsSenderIdOrThrow,
  mapAfricasTalkingRecipientToStatus,
  isAfricasTalkingPreAcceptanceRejection,
  friendlySmsError,
  countSmsSegments,
  computeSmsBroadcastCredits
};
