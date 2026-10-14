import AnnouncementAutomation from "../../models/announcementAutomationModel.js";
import AnnouncementMessage from "../../models/announcementMessageModel.js";
import AnnouncementMessageDelivery from "../../models/announcementMessageDeliveryModel.js";
import Member from "../../models/memberModel.js";
import Church from "../../models/churchModel.js";
import { getSystemSettingsSnapshot } from "../../controller/systemSettingsController.js";
import { resolveAudienceRecipients } from "./audienceService.js";
import { sendSmsAndUpdateDeliveries } from "./smsService.js";
import { sendBulkSms } from "../africasTalkingSmsService.js";
import {
  getOrCreateWallet,
  getAvailableCredits,
  deductCreditsForMessage,
  refundCreditsForMessage
} from "./walletService.js";
import {
  countSmsSegments,
  normalizeSmsPhoneE164,
  resolveSmsSenderIdOrThrow,
  mapAfricasTalkingRecipientToStatus,
  isAfricasTalkingPreAcceptanceRejection,
  friendlySmsError,
  hasPlaceholders,
  renderPersonalizedContent
} from "../../utils/announcementHelpers.js";

const AUTOMATION_TYPES = ["birthday", "weekly_reminder", "daily", "monthly", "one_time"];

// Member statuses that should never receive automated SMS.
const BIRTHDAY_EXCLUDED_STATUSES = ["deceased", "transferred", "left_church", "former"];

function parseSendTime(value) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value || "").trim());
  if (!m) return { hours: 8, minutes: 0 };
  return { hours: Number(m[1]), minutes: Number(m[2]) };
}

/**
 * Next local occurrence of the automation's sendTime on an allowed day,
 * strictly after `from`. Weekly reminders require at least one day selected;
 * birthday and daily automations run every day; monthly runs on its day of
 * month (clamped to the month's last day); one_time runs once on runDate.
 * Returns null when no valid slot exists.
 */
function computeNextRunAt(automation, from = new Date()) {
  const { hours, minutes } = parseSendTime(automation?.sendTime);
  const type = String(automation?.type || "");

  if (type === "one_time") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(automation?.runDate || "").trim());
    if (!m) return null;
    const runAt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hours, minutes, 0, 0);
    return runAt.getTime() > from.getTime() ? runAt : null;
  }

  if (type === "monthly") {
    const day = Number(automation?.dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 31) return null;
    const cursor = new Date(from.getTime());
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 15; i += 1) {
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const runAt = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, daysInMonth), hours, minutes, 0, 0);
      if (runAt.getTime() > from.getTime()) return runAt;
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return null;
  }

  const isWeekly = type === "weekly_reminder";
  const days = Array.isArray(automation?.daysOfWeek)
    ? automation.daysOfWeek.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];
  if (isWeekly && !days.length) return null;

  const cursor = new Date(from.getTime());
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 8; i += 1) {
    if (!isWeekly || days.includes(cursor.getDay())) {
      const runAt = new Date(cursor.getTime());
      runAt.setHours(hours, minutes, 0, 0);
      if (runAt.getTime() > from.getTime()) return runAt;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

function runKeyFor(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function resolveAutomationRecipients(automation, today) {
  const type = String(automation?.type || "");

  if (type === "birthday") {
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const rows = await Member.find({
      church: automation.church,
      status: { $nin: BIRTHDAY_EXCLUDED_STATUSES },
      $expr: {
        $and: [
          { $eq: [{ $month: "$dateOfBirth" }, month] },
          { $eq: [{ $dayOfMonth: "$dateOfBirth" }, day] }
        ]
      }
    }).lean();

    return rows
      .map((m) => ({
        key: String(m?._id || ""),
        member: m?._id || null,
        memberName: String(`${m?.firstName || ""} ${m?.lastName || ""}`).trim(),
        firstName: String(m?.firstName || "").trim(),
        lastName: String(m?.lastName || "").trim(),
        phone: String(m?.phoneNumber || "").trim()
      }))
      .filter((r) => r.phone);
  }

  const audience = automation?.audience && typeof automation.audience === "object"
    ? automation.audience
    : { type: "all" };
  return await resolveAudienceRecipients({ churchId: automation.church, audience });
}

/**
 * Refund credits for deliveries the provider rejected before acceptance,
 * using the same proportional split as the interactive send flow.
 */
async function refundRejectedDeliveries({ churchId, messageDoc, rejectedCount, userId }) {
  if (!rejectedCount) return;
  const perRecipientCost = Number(messageDoc?.costPerRecipientCredits || 0);
  const refundTotal = perRecipientCost * rejectedCount;
  if (refundTotal <= 0) return;

  const totalDeducted = Number(messageDoc?.totalCostCredits || 0);
  const fromIncludedTotal = Number(messageDoc?.fromIncludedCredits || 0);
  const fromWalletTotal = Number(messageDoc?.fromWalletCredits || 0);
  const ratio = totalDeducted > 0 ? refundTotal / totalDeducted : 0;

  try {
    await refundCreditsForMessage({
      churchId,
      totalCostCredits: refundTotal,
      fromIncluded: Math.round(fromIncludedTotal * ratio),
      fromWallet: Math.round(fromWalletTotal * ratio),
      userId: userId || null,
      deductionKey: messageDoc?.deductionKey,
      description: `Automation refund: ${rejectedCount} recipient(s) rejected by provider`
    });
  } catch (err) {
    console.error("[announcements] automation refund failed", err);
  }
}

/**
 * Personalized send: one SMS per recipient so {firstName} / {lastName} /
 * {fullName} placeholders can be rendered individually.
 */
async function sendPersonalizedDeliveries({ churchId, senderId, template, deliveries, recipients }) {
  const result = { delivered: 0, sent: 0, failed: 0, rejectedDeliveryIds: [] };

  for (let i = 0; i < deliveries.length; i += 1) {
    const delivery = deliveries[i];
    const recipient = recipients[i] || delivery;
    const phoneE164 = normalizeSmsPhoneE164(delivery.phone);
    if (!phoneE164) {
      await AnnouncementMessageDelivery.updateOne(
        { _id: delivery._id, church: churchId },
        {
          $set: {
            status: "failed",
            provider: "africastalking",
            errorMessage: "The phone number is invalid or not formatted correctly."
          }
        }
      );
      result.failed += 1;
      continue;
    }

    const rendered = renderPersonalizedContent(template, recipient);

    try {
      const response = await sendBulkSms({ to: [phoneE164], message: rendered, from: senderId });
      const smsRecipients = response?.SMSMessageData?.Recipients;
      const r = Array.isArray(smsRecipients) ? smsRecipients[0] : null;
      const status = mapAfricasTalkingRecipientToStatus(r?.status);

      if (status === "delivered") result.delivered += 1;
      else if (status === "sent") result.sent += 1;
      else {
        result.failed += 1;
        if (isAfricasTalkingPreAcceptanceRejection(r?.status)) {
          result.rejectedDeliveryIds.push(delivery._id);
        }
      }

      await AnnouncementMessageDelivery.updateOne(
        { _id: delivery._id, church: churchId },
        {
          $set: {
            status,
            provider: "africastalking",
            providerMessageId: r?.messageId ? String(r.messageId) : null,
            errorMessage: status === "failed" ? friendlySmsError(r?.status || "Failed") : null,
            phone: phoneE164
          }
        }
      );
    } catch (err) {
      result.failed += 1;
      await AnnouncementMessageDelivery.updateOne(
        { _id: delivery._id, church: churchId },
        {
          $set: {
            status: "failed",
            provider: "africastalking",
            errorMessage: friendlySmsError(err?.message || "SMS send failed")
          }
        }
      );
    }
  }

  return result;
}

async function finalizeMessageCounts({ churchId, messageId }) {
  const [deliveredCount, sentCount, failedCount, pendingLeft] = await Promise.all([
    AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "delivered" }),
    AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "sent" }),
    AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "failed" }),
    AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "pending" })
  ]);

  await AnnouncementMessage.updateOne(
    { _id: messageId, church: churchId },
    {
      $set: {
        status: pendingLeft <= 0 ? "sent" : "processing",
        deliveredCount,
        sentCount,
        pendingCount: pendingLeft,
        failedCount
      }
    }
  );
}

async function runAutomation(automation, now) {
  const churchId = automation.church;
  const runKey = runKeyFor(now);
  const isOneTime = String(automation?.type || "") === "one_time";
  const nextRunAt = isOneTime ? null : computeNextRunAt(automation, now);
  // A one-time automation is finished after its run — disable it.
  const doneSet = isOneTime ? { nextRunAt: null, enabled: false } : { nextRunAt };

  const markRun = async (status, extra = {}) => {
    await AnnouncementAutomation.updateOne(
      { _id: automation._id },
      {
        $set: {
          lastRunAt: now,
          lastRunKey: runKey,
          lastRunStatus: status,
          ...doneSet,
          ...extra
        }
      }
    );
  };

  // Idempotency: never run the same automation twice for the same day.
  if (automation.lastRunKey && String(automation.lastRunKey) === runKey) {
    await AnnouncementAutomation.updateOne({ _id: automation._id }, { $set: doneSet });
    return { status: "skipped_duplicate" };
  }

  if (!isOneTime && !nextRunAt) {
    await markRun("skipped", { lastRunError: "No valid schedule", lastRunRecipientCount: 0 });
    return { status: "skipped" };
  }

  try {
    const resolved = await resolveAutomationRecipients(automation, now);

    const unique = new Map();
    for (const r of resolved) {
      const id = String(r?.key || r?.member || r?.phone || "");
      if (!id) continue;
      if (!unique.has(id)) unique.set(id, r);
    }
    const recipients = Array.from(unique.values());

    if (!recipients.length) {
      await markRun("sent", { lastRunError: null, lastRunRecipientCount: 0 });
      return { status: "sent", recipients: 0 };
    }

    const personalized = hasPlaceholders(automation.content);

    // Cost = worst-case segments across rendered variants x per-segment cost.
    const systemSettings = await getSystemSettingsSnapshot();
    const smsCostCredits = Number(systemSettings?.smsCostCredits ?? 5);
    const segmentsPerMessage = personalized
      ? recipients.reduce((max, r) => Math.max(max, countSmsSegments(renderPersonalizedContent(automation.content, r))), 1)
      : Math.max(1, countSmsSegments(automation.content));
    const costPerRecipientCredits = segmentsPerMessage * smsCostCredits;
    const totalCostCredits = costPerRecipientCredits * recipients.length;

    const available = await getAvailableCredits({ churchId });
    if (available.totalAvailable < totalCostCredits) {
      await markRun("skipped_insufficient_credits", {
        lastRunError: `Insufficient credits. Needed ${totalCostCredits}, available ${available.totalAvailable}.`,
        lastRunRecipientCount: 0
      });
      return { status: "skipped_insufficient_credits" };
    }

    const deductionKey = `auto-${automation._id}-${runKey}`;
    const wallet = await getOrCreateWallet({ churchId });
    const deduction = await deductCreditsForMessage({
      churchId,
      wallet,
      totalCostCredits,
      status: "sent",
      channels: ["sms"],
      recipientCount: recipients.length,
      userId: automation.createdBy || null,
      deductionKey,
      description: `Automated message: ${automation.name}`,
      segmentsPerMessage
    });

    const message = await AnnouncementMessage.create({
      church: churchId,
      createdBy: automation.createdBy || null,
      automation: automation._id,
      title: automation.title,
      content: automation.content,
      channels: ["sms"],
      status: "processing",
      audience: String(automation.type) === "birthday" ? { type: "birthday_members" } : automation.audience,
      recipientCount: recipients.length,
      costPerRecipientCredits,
      totalCostCredits,
      segmentsPerMessage,
      deductionKey,
      fromIncludedCredits: Number(deduction?.fromIncluded || 0),
      fromWalletCredits: Number(deduction?.fromWallet || 0)
    });

    const deliveries = await AnnouncementMessageDelivery.insertMany(
      recipients.map((r) => ({
        church: churchId,
        message: message._id,
        member: r.member || null,
        memberName: String(r?.memberName || "").trim(),
        phone: String(r?.phone || "").trim(),
        channel: "sms",
        status: "pending",
        provider: "africastalking"
      }))
    );

    const church = await Church.findById(churchId).lean();

    try {
      let sendResult;
      if (personalized) {
        const senderId = resolveSmsSenderIdOrThrow({ church, requestedSenderId: null });
        if (message._id) {
          await AnnouncementMessage.updateOne({ _id: message._id }, { $set: { sender_id_used: senderId } });
        }
        sendResult = await sendPersonalizedDeliveries({
          churchId,
          senderId,
          template: automation.content,
          deliveries,
          recipients
        });
      } else {
        sendResult = await sendSmsAndUpdateDeliveries({
          churchId,
          church,
          messageDoc: message,
          deliveries
        });
      }

      await refundRejectedDeliveries({
        churchId,
        messageDoc: message,
        rejectedCount: sendResult?.rejectedDeliveryIds?.length || 0,
        userId: automation.createdBy || null
      });
    } catch (sendErr) {
      console.error("[announcements] automation SMS send failed", sendErr);
      await AnnouncementMessage.updateOne(
        { _id: message._id, status: "processing" },
        { $set: { status: "failed" } }
      );
      await markRun("failed", {
        lastRunError: friendlySmsError(sendErr?.message || "SMS send failed"),
        lastRunRecipientCount: recipients.length
      });
      return { status: "failed" };
    }

    await finalizeMessageCounts({ churchId, messageId: message._id });
    await markRun("sent", { lastRunError: null, lastRunRecipientCount: recipients.length });
    return { status: "sent", recipients: recipients.length };
  } catch (err) {
    console.error("[announcements] automation run failed", err);
    await markRun("failed", {
      lastRunError: String(err?.message || "Automation run failed"),
      lastRunRecipientCount: 0
    });
    return { status: "failed", error: err };
  }
}

/**
 * Called by the messaging worker tick. Claims due automations by advancing
 * nextRunAt BEFORE processing so overlapping ticks cannot pick the same run.
 */
async function processDueAutomations() {
  const now = new Date();

  const due = await AnnouncementAutomation.find({
    enabled: true,
    nextRunAt: { $ne: null, $lte: now }
  }).lean();

  if (!due.length) return { processed: 0 };

  let processed = 0;

  for (const automation of due) {
    // Claim the run: advance nextRunAt first so the next tick skips this one.
    const claimed = await AnnouncementAutomation.findOneAndUpdate(
      { _id: automation._id, nextRunAt: { $lte: now } },
      { $set: { nextRunAt: computeNextRunAt(automation, now) || new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
      { new: false }
    );
    if (!claimed) continue;

    await runAutomation(automation, now);
    processed += 1;
  }

  return { processed };
}

export { AUTOMATION_TYPES, computeNextRunAt, parseSendTime, hasPlaceholders, processDueAutomations, runAutomation };
