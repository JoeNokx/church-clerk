import mongoose from "mongoose";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { getDefaultSmsSenderId } from "../services/africasTalkingSmsService.js";
import { resolveSenderId } from "./resolveSenderId.js";

function computeCostPerRecipientCredits({ channels, smsCostCredits, whatsappCostCredits }) {
  const arr = Array.isArray(channels) ? channels : [];
  const costs = {
    sms: Number.isFinite(Number(smsCostCredits)) ? Number(smsCostCredits) : 5,
    whatsapp: Number.isFinite(Number(whatsappCostCredits)) ? Number(whatsappCostCredits) : 20
  };
  return arr.reduce((sum, c) => sum + (costs[String(c)] || 0), 0);
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
    throw new Error("SMS sender ID is required. Set AT_DEFAULT_SENDER_ID in .env or provide an approved church sender ID.");
  }
  return resolved;
}

function mapAfricasTalkingRecipientToStatus(statusRaw) {
  const s = String(statusRaw || "").trim().toLowerCase();
  if (s === "success") return "delivered";
  if (s) return "failed";
  return "failed";
}

export {
  computeCostPerRecipientCredits,
  parseSchedule,
  toScheduleParts,
  toObjectIdList,
  normalizeSmsPhoneE164,
  resolveSmsSenderIdOrThrow,
  mapAfricasTalkingRecipientToStatus
};
