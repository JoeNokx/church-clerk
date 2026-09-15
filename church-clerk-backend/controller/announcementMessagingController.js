import AnnouncementMessage from "../models/announcementMessageModel.js";
import AnnouncementMessageDelivery from "../models/announcementMessageDeliveryModel.js";
import AnnouncementWallet from "../models/announcementWalletModel.js";
import AnnouncementWalletTransaction from "../models/announcementWalletTransactionModel.js";
import Church from "../models/churchModel.js";
import { getSystemSettingsSnapshot } from "./systemSettingsController.js";
import { resolveSenderId } from "../utils/resolveSenderId.js";
import {
  computeCostPerRecipientCredits,
  computeSmsBroadcastCredits,
  countSmsSegments,
  parseSchedule,
  toScheduleParts,
  toObjectIdList,
  friendlySmsError
} from "../utils/announcementHelpers.js";
import {
  countUniqueMembersForAudience,
  resolveAudienceMembers
} from "../services/announcement/audienceService.js";
import { sendSmsAndUpdateDeliveries } from "../services/announcement/smsService.js";
import { getOrCreateWallet, getAvailableCredits, deductCreditsForMessage, refundCreditsForMessage } from "../services/announcement/walletService.js";

export const createMessage = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const title = String(req.body?.title || "").trim();
    const content = String(req.body?.content || "").trim();
    const channels = Array.isArray(req.body?.channels) ? req.body.channels.map((c) => String(c)) : [];
    const sendMode = String(req.body?.sendMode || "draft").trim();

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!content) {
      return res.status(400).json({ message: "Message content is required" });
    }
    if (!channels.length) {
      return res.status(400).json({ message: "Please select at least one channel" });
    }

    const primaryChannel = channels?.[0] || "sms";

    const status = sendMode === "draft" ? "draft" : sendMode === "schedule" ? "scheduled" : "sent";

    const smsSenderId = primaryChannel === "sms" ? String(req.body?.smsSenderId || "").trim() : null;
    const resolvedSenderId = primaryChannel === "sms" ? resolveSenderId(req.activeChurch) : null;

    // In production, a sender ID is required. In development, we allow sending
    // without one — AT will use its default sender so churches can test SMS.
    if (primaryChannel === "sms" && status !== "draft" && process.env.NODE_ENV === "production" && !(smsSenderId || resolvedSenderId)) {
      return res.status(400).json({
        message: "SMS sender ID is required. Set AFRICA_TALKING_SENDER_ID in .env or request and approve a Sender ID."
      });
    }
    const scheduledAt = status === "scheduled"
      ? parseSchedule({ scheduledDate: req.body?.scheduledDate, scheduledTime: req.body?.scheduledTime })
      : null;

    if (status === "scheduled" && !scheduledAt) {
      return res.status(400).json({ message: "Scheduled date and time are required" });
    }

    const audience = req.body?.audience || { type: "all" };
    const systemSettings = await getSystemSettingsSnapshot();
    const smsCostCredits = Number(systemSettings?.smsCostCredits ?? 5);

    // Segment-based pricing: cost = segments per message x recipients x per-segment cost.
    const segmentsPerMessage = primaryChannel === "sms" ? countSmsSegments(content) : 0;
    const costPerRecipientCredits = primaryChannel === "sms"
      ? segmentsPerMessage * smsCostCredits
      : 0;

    const members = status === "draft"
      ? []
      : await resolveAudienceMembers({ churchId: req.activeChurch._id, audience });

    const unique = new Map();
    for (const m of members) {
      const id = String(m?._id || "");
      if (!id) continue;
      if (!unique.has(id)) unique.set(id, m);
    }

    const recipients = Array.from(unique.values());
    const recipientCount = recipients.length;

    if (status !== "draft" && recipientCount <= 0) {
      return res.status(400).json({ message: "No recipients found for the selected audience" });
    }

    const totalCostCredits = status === "draft"
      ? 0
      : primaryChannel === "sms"
        ? computeSmsBroadcastCredits({ content, recipientCount, smsCostCredits })
        : 0;

    let wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });

    let deductionResult = null;
    let deductionKey = null;
    if (status !== "draft" && totalCostCredits > 0) {
      // Check total available (included + wallet) before attempting deduction.
      const available = await getAvailableCredits({ churchId: req.activeChurch._id });
      if (available.totalAvailable < totalCostCredits) {
        return res.status(400).json({
          message: `Insufficient credits. Needed ${totalCostCredits}, available ${available.totalAvailable} (subscription ${available.includedCredits} + top-up ${available.walletCredits}). Please fund your wallet.`
        });
      }

      try {
        // Use a stable deduction key for idempotency across retries / scheduled sends.
        deductionKey = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        deductionResult = await deductCreditsForMessage({
          churchId: req.activeChurch._id,
          wallet,
          totalCostCredits,
          status,
          channels,
          recipientCount,
          userId: req.user?._id,
          deductionKey,
          description: `Message ${status}`,
          segmentsPerMessage
        });
        wallet = deductionResult.wallet;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    const initialDeliveredCount = status === "draft"
      ? 0
      : primaryChannel === "sms"
        ? 0
        : recipientCount;

    const createdMessage = await AnnouncementMessage.create({
      church: req.activeChurch._id,
      createdBy: req.user?._id || null,
      title,
      content,
      channels,
      smsSenderId,
      sender_id_used: primaryChannel === "sms" && status !== "draft" ? (smsSenderId || resolvedSenderId) : null,
      status,
      scheduledAt,
      audience,
      recipientCount,
      deliveredCount: initialDeliveredCount,
      failedCount: 0,
      costPerRecipientCredits,
      totalCostCredits,
      segmentsPerMessage,
      deductionKey,
      fromIncludedCredits: deductionResult?.fromIncluded || 0,
      fromWalletCredits: deductionResult?.fromWallet || 0
    });

    let sendSummary = null;

    if (status !== "draft" && recipients.length) {
      const deliveries = recipients.map((m) => ({
        church: req.activeChurch._id,
        message: createdMessage._id,
        member: m._id,
        memberName: String(m?.fullName || `${m?.firstName || ""} ${m?.lastName || ""}` || "").trim(),
        phone: String(m?.phoneNumber || "").trim(),
        channel: primaryChannel,
        status: primaryChannel === "sms" ? "pending" : "delivered",
        provider: primaryChannel === "sms" ? "africastalking" : null
      }));

      if (deliveries.length) {
        const inserted = await AnnouncementMessageDelivery.insertMany(deliveries);

        if (status === "sent" && primaryChannel === "sms") {
          try {
            sendSummary = await sendSmsAndUpdateDeliveries({
              churchId: req.activeChurch._id,
              church: req.activeChurch,
              messageDoc: createdMessage,
              deliveries: inserted
            });

            // Refund credits for deliveries rejected by the provider BEFORE acceptance.
            // Once the provider accepts (Sent/Submitted/Queued/Success), credits stay deducted.
            if (sendSummary?.rejectedDeliveryIds?.length > 0) {
              const perRecipientCost = Number(createdMessage.costPerRecipientCredits || 0);
              const refundCount = sendSummary.rejectedDeliveryIds.length;
              const refundTotal = perRecipientCost * refundCount;

              if (refundTotal > 0) {
                // Proportional refund using the original deduction split.
                const totalDeducted = Number(createdMessage.totalCostCredits || 0);
                const fromIncludedTotal = Number(createdMessage.fromIncludedCredits || 0);
                const fromWalletTotal = Number(createdMessage.fromWalletCredits || 0);
                const ratio = totalDeducted > 0 ? refundTotal / totalDeducted : 0;
                const refundIncluded = Math.round(fromIncludedTotal * ratio);
                const refundWallet = Math.round(fromWalletTotal * ratio);

                try {
                  const refundResult = await refundCreditsForMessage({
                    churchId: req.activeChurch._id,
                    totalCostCredits: refundTotal,
                    fromIncluded: refundIncluded,
                    fromWallet: refundWallet,
                    userId: req.user?._id,
                    deductionKey: createdMessage.deductionKey,
                    description: `Refund: ${refundCount} recipient(s) rejected by provider`
                  });
                  wallet = refundResult.wallet;
                } catch (refundErr) {
                  console.error("[announcements] refund for rejected deliveries failed", refundErr);
                }
              }
            }
          } catch (err) {
            console.error("[announcements] Africa's Talking send failed", err);
            sendSummary = {
              attempted: inserted.length,
              delivered: 0,
              sent: 0,
              failed: inserted.length,
              invalid: 0,
              rejectedBeforeAcceptance: 0,
              rejectedDeliveryIds: [],
              error: String(err?.message || "SMS send failed")
            };
          }

          const deliveredCount = Number(sendSummary?.delivered || 0);
          const sentCount = Number(sendSummary?.sent || 0);
          const failedCount = Number(sendSummary?.failed || 0);
          const pendingCount = Math.max(0, (inserted?.length || 0) - deliveredCount - sentCount - failedCount);

          await AnnouncementMessage.updateOne(
            { _id: createdMessage._id, church: req.activeChurch._id },
            {
              $set: {
                deliveredCount,
                sentCount,
                pendingCount,
                failedCount
              }
            }
          );

          createdMessage.deliveredCount = deliveredCount;
          createdMessage.sentCount = sentCount;
          createdMessage.pendingCount = pendingCount;
          createdMessage.failedCount = failedCount;
        }
      }
    }

    return res.status(201).json({ message: "Message created", data: createdMessage, wallet, sendSummary });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const status = String(req.query?.status || "").trim();

    const query = { church: req.activeChurch._id };
    if (status) {
      // Support comma-separated statuses (e.g. "scheduled,processing,cancelled,failed")
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        query.status = statuses[0];
      } else if (statuses.length > 1) {
        query.status = { $in: statuses };
      }
    }

    const messages = await AnnouncementMessage.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json({ messages });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMessageDeliveryReport = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const id = String(req.params?.id || "").trim();
    if (!id) {
      return res.status(400).json({ message: "Message id is required" });
    }

    const deliveries = await AnnouncementMessageDelivery.find({
      church: req.activeChurch._id,
      message: id
    })
      .sort({ attemptNumber: 1, createdAt: 1 })
      .lean();

    // Group deliveries by recipient (member ID or phone) to compute unique stats
    // based on the LATEST attempt per recipient.
    const byRecipient = new Map();
    for (const d of deliveries) {
      const key = d.member ? String(d.member) : String(d.phone || "");
      const existing = byRecipient.get(key);
      if (!existing || (d.attemptNumber || 1) > (existing.attemptNumber || 1)) {
        byRecipient.set(key, d);
      }
    }

    const latestPerRecipient = Array.from(byRecipient.values());
    const stats = {
      total: latestPerRecipient.length,
      sent: latestPerRecipient.filter((d) => ["sent", "delivered", "failed"].includes(String(d?.status))).length,
      delivered: latestPerRecipient.filter((d) => String(d?.status) === "delivered").length,
      pending: latestPerRecipient.filter((d) => String(d?.status) === "pending").length,
      failed: latestPerRecipient.filter((d) => String(d?.status) === "failed").length
    };

    return res.status(200).json({ deliveries, stats });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const estimateMessageCost = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const audience = req.body?.audience || { type: "all" };
    const channels = Array.isArray(req.body?.channels) ? req.body.channels.map((c) => String(c)) : [];
    const content = String(req.body?.content || "");

    if (!channels.length) {
      return res.status(400).json({ message: "Please select at least one channel" });
    }

    const recipientCount = await countUniqueMembersForAudience({ churchId: req.activeChurch._id, audience });
    const systemSettings = await getSystemSettingsSnapshot();
    const smsCostCredits = Number(systemSettings?.smsCostCredits ?? 5);

    const primaryChannel = channels?.[0] || "sms";
    const segmentsPerMessage = primaryChannel === "sms" ? countSmsSegments(content) : 0;
    const costPerRecipientCredits = primaryChannel === "sms"
      ? segmentsPerMessage * smsCostCredits
      : 0;
    const totalCostCredits = primaryChannel === "sms"
      ? computeSmsBroadcastCredits({ content, recipientCount, smsCostCredits })
      : 0;

    // Include available credits so the frontend can show included vs wallet split.
    const available = await getAvailableCredits({ churchId: req.activeChurch._id });

    return res.status(200).json({
      recipientCount,
      segmentsPerMessage,
      costPerRecipientCredits,
      totalCostCredits,
      availableCredits: available.totalAvailable,
      includedCredits: available.includedCredits,
      walletCredits: available.walletCredits
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateScheduledMessage = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const id = String(req.params?.id || "").trim();
    if (!id) return res.status(400).json({ message: "Message id is required" });

    const message = await AnnouncementMessage.findOne({ _id: id, church: req.activeChurch._id });
    if (!message) return res.status(404).json({ message: "Message not found" });

    const currentStatus = String(message.status || "");
    if (!["scheduled", "draft"].includes(currentStatus)) {
      return res.status(400).json({ message: "Only scheduled or draft messages can be edited" });
    }

    const title = req.body?.title !== undefined ? String(req.body.title || "").trim() : undefined;
    const content = req.body?.content !== undefined ? String(req.body.content || "").trim() : undefined;
    const smsSenderId = req.body?.smsSenderId !== undefined ? String(req.body.smsSenderId || "").trim() : undefined;

    if (title !== undefined && !title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (content !== undefined && !content) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const primaryChannel = Array.isArray(message.channels) && message.channels.length ? String(message.channels[0]) : "sms";

    if (smsSenderId !== undefined) {
      if (primaryChannel !== "sms") {
        message.smsSenderId = null;
      } else {
        message.smsSenderId = smsSenderId || null;
      }
    }

    const scheduleProvided = req.body?.scheduledDate !== undefined || req.body?.scheduledTime !== undefined;
    let scheduledAt = message.scheduledAt;

    if (currentStatus === "scheduled" && scheduleProvided) {
      const current = toScheduleParts(message.scheduledAt);
      const scheduledDate = req.body?.scheduledDate !== undefined ? req.body.scheduledDate : current.scheduledDate;
      const scheduledTime = req.body?.scheduledTime !== undefined ? req.body.scheduledTime : current.scheduledTime;
      scheduledAt = parseSchedule({ scheduledDate, scheduledTime });
      if (!scheduledAt) {
        return res.status(400).json({ message: "Scheduled date and time are required" });
      }
    }

    if (title !== undefined) message.title = title;
    if (content !== undefined) message.content = content;
    if (currentStatus === "scheduled") {
      message.scheduledAt = scheduledAt;
    }

    const updated = await message.save();
    return res.status(200).json({ message: "Message updated", data: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteScheduledMessage = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const id = String(req.params?.id || "").trim();
    if (!id) return res.status(400).json({ message: "Message id is required" });

    const message = await AnnouncementMessage.findOne({ _id: id, church: req.activeChurch._id });
    if (!message) return res.status(404).json({ message: "Message not found" });

    const status = String(message.status || "");
    if (status === "sent") {
      return res.status(400).json({ message: "Sent messages cannot be deleted" });
    }

    let wallet = null;
    const totalCostCredits = Number(message.totalCostCredits || 0);
    const fromIncluded = Number(message.fromIncludedCredits || 0);
    const fromWallet = Number(message.fromWalletCredits || 0);

    if (status === "scheduled" && totalCostCredits > 0) {
      const result = await refundCreditsForMessage({
        churchId: req.activeChurch._id,
        totalCostCredits,
        fromIncluded,
        fromWallet,
        userId: req.user?._id,
        deductionKey: message.deductionKey || null,
        description: "Scheduled message deleted (refund)"
      });
      wallet = result.wallet;
    } else {
      wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });
    }

    await AnnouncementMessageDelivery.deleteMany({
      church: req.activeChurch._id,
      message: message._id
    });

    await AnnouncementMessage.deleteOne({ _id: message._id, church: req.activeChurch._id });

    return res.status(200).json({ message: "Message deleted", wallet });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Cancel a scheduled message. Marks it as "cancelled" (keeps the record for history)
 * and refunds the deducted credits. Only works on messages still in "scheduled" status.
 */
export const cancelScheduledMessage = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const id = String(req.params?.id || "").trim();
    if (!id) return res.status(400).json({ message: "Message id is required" });

    const message = await AnnouncementMessage.findOne({ _id: id, church: req.activeChurch._id });
    if (!message) return res.status(404).json({ message: "Message not found" });

    const status = String(message.status || "");
    if (status !== "scheduled") {
      return res.status(400).json({ message: "Only scheduled messages can be cancelled" });
    }

    const totalCostCredits = Number(message.totalCostCredits || 0);
    const fromIncluded = Number(message.fromIncludedCredits || 0);
    const fromWallet = Number(message.fromWalletCredits || 0);

    let wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });

    if (totalCostCredits > 0) {
      const result = await refundCreditsForMessage({
        churchId: req.activeChurch._id,
        totalCostCredits,
        fromIncluded,
        fromWallet,
        userId: req.user?._id,
        deductionKey: message.deductionKey || null,
        description: "Scheduled message cancelled (refund)"
      });
      wallet = result.wallet;
    }

    // Mark as cancelled — keep the record + deliveries for history
    message.status = "cancelled";
    await message.save();

    return res.status(200).json({ message: "Scheduled message cancelled", wallet });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Resend a single failed SMS delivery.
 * Creates a NEW delivery record (preserving the original failed one for history),
 * deducts credits for the new attempt, and sends via Africa's Talking.
 */
export const resendFailedDelivery = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const deliveryId = String(req.params?.id || "").trim();
    if (!deliveryId) return res.status(400).json({ message: "Delivery id is required" });

    // Find the original failed delivery, scoped to the active church
    const original = await AnnouncementMessageDelivery.findOne({
      _id: deliveryId,
      church: req.activeChurch._id
    }).lean();

    if (!original) return res.status(404).json({ message: "Delivery record not found" });

    if (String(original.status || "") !== "failed") {
      return res.status(400).json({ message: "Only failed deliveries can be resent" });
    }

    // Get the parent message for content + sender ID + pricing
    const message = await AnnouncementMessage.findOne({
      _id: original.message,
      church: req.activeChurch._id
    }).lean();

    if (!message) return res.status(404).json({ message: "Parent message not found" });

    const phone = String(original.phone || "").trim();
    if (!phone) return res.status(400).json({ message: "Original delivery has no phone number" });

    // Compute cost for this single recipient
    const systemSettings = await getSystemSettingsSnapshot();
    const smsCostCredits = Number(systemSettings?.smsCostCredits ?? 5);
    const segmentsPerMessage = countSmsSegments(String(message.content || ""));
    const costPerRecipient = segmentsPerMessage * smsCostCredits;
    const totalCostCredits = costPerRecipient;

    // Check available credits
    const available = await getAvailableCredits({ churchId: req.activeChurch._id });
    if (available.totalAvailable < totalCostCredits) {
      return res.status(400).json({
        message: `Insufficient credits. Needed ${totalCostCredits}, available ${available.totalAvailable} (subscription ${available.includedCredits} + top-up ${available.walletCredits}).`
      });
    }

    // Deduct credits for the resend
    let wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });
    const deductionKey = `resend-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const deductionResult = await deductCreditsForMessage({
      churchId: req.activeChurch._id,
      wallet,
      totalCostCredits,
      status: "sent",
      channels: ["sms"],
      recipientCount: 1,
      userId: req.user?._id,
      deductionKey,
      description: `Resend failed delivery to ${phone}`,
      segmentsPerMessage
    });
    wallet = deductionResult.wallet;

    // Compute the next attempt number for this recipient
    // Group by member ID (or phone if no member) to find all prior attempts
    const recipientFilter = original.member
      ? { message: message._id, member: original.member }
      : { message: message._id, phone };
    const priorAttempts = await AnnouncementMessageDelivery.find(recipientFilter)
      .sort({ attemptNumber: -1 })
      .limit(1)
      .lean();
    const nextAttemptNumber = (priorAttempts[0]?.attemptNumber || 1) + 1;

    // Find the root original delivery (the first attempt) for linking
    const rootDeliveryId = priorAttempts.find((a) => !a.resendOf)?._id || original._id;

    // Create a NEW delivery record — do NOT overwrite the original
    const newDelivery = await AnnouncementMessageDelivery.create({
      church: req.activeChurch._id,
      message: message._id,
      member: original.member || null,
      memberName: original.memberName || "",
      phone,
      channel: "sms",
      status: "pending",
      provider: "africastalking",
      attemptNumber: nextAttemptNumber,
      resendOf: rootDeliveryId
    });

    // Send the SMS
    let sendSummary = null;
    try {
      sendSummary = await sendSmsAndUpdateDeliveries({
        churchId: req.activeChurch._id,
        church: req.activeChurch,
        messageDoc: { ...message, smsSenderId: message.smsSenderId || null },
        deliveries: [newDelivery]
      });

      // Refund if rejected before acceptance
      if (sendSummary?.rejectedDeliveryIds?.length > 0 && totalCostCredits > 0) {
        const fromIncludedTotal = Number(deductionResult.fromIncluded || 0);
        const fromWalletTotal = Number(deductionResult.fromWallet || 0);
        try {
          await refundCreditsForMessage({
            churchId: req.activeChurch._id,
            totalCostCredits,
            fromIncluded: fromIncludedTotal,
            fromWallet: fromWalletTotal,
            userId: req.user?._id,
            deductionKey,
            description: `Resend rejected by provider (refund)`
          });
        } catch (refundErr) {
          console.error("[announcements] resend refund failed", refundErr);
        }
      }
    } catch (sendErr) {
      // Provider threw — mark the new delivery as failed
      await AnnouncementMessageDelivery.updateOne(
        { _id: newDelivery._id },
        { $set: { status: "failed", errorMessage: friendlySmsError(sendErr?.message || "SMS send failed") } }
      );
      return res.status(500).json({ message: sendErr?.message || "SMS send failed" });
    }

    // Update parent message counts based on latest attempt per unique recipient
    const allDeliveries = await AnnouncementMessageDelivery.find({
      church: req.activeChurch._id,
      message: message._id,
      channel: "sms"
    }).lean();

    const byRecipient = new Map();
    for (const d of allDeliveries) {
      const key = d.member ? String(d.member) : String(d.phone || "");
      const existing = byRecipient.get(key);
      if (!existing || (d.attemptNumber || 1) > (existing.attemptNumber || 1)) {
        byRecipient.set(key, d);
      }
    }
    const latest = Array.from(byRecipient.values());
    const deliveredCount = latest.filter((d) => String(d.status) === "delivered").length;
    const sentCount = latest.filter((d) => String(d.status) === "sent").length;
    const failedCount = latest.filter((d) => String(d.status) === "failed").length;
    const pendingLeft = latest.filter((d) => String(d.status) === "pending").length;

    await AnnouncementMessage.updateOne(
      { _id: message._id },
      {
        $set: {
          deliveredCount: Number(deliveredCount || 0),
          sentCount: Number(sentCount || 0),
          pendingCount: Number(pendingLeft || 0),
          failedCount: Number(failedCount || 0)
        }
      }
    );

    return res.status(200).json({
      message: "SMS resent",
      wallet,
      delivery: {
        _id: newDelivery._id,
        status: newDelivery.status
      }
    });
  } catch (error) {
    console.error("[announcements] resend failed delivery error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const releaseDueScheduledAnnouncementMessages = async () => {
  const now = new Date();

  const due = await AnnouncementMessage.find({
    status: "scheduled",
    scheduledAt: { $lte: now }
  }).lean();

  if (!due.length) return { released: 0 };

  let released = 0;

  for (const msg of due) {
    const churchId = msg.church;
    const messageId = msg._id;
    const primaryChannel = Array.isArray(msg.channels) && msg.channels.length ? String(msg.channels[0]) : "sms";

    // Mark as processing while we attempt the send
    await AnnouncementMessage.updateOne(
      { _id: messageId, status: "scheduled" },
      { $set: { status: "processing" } }
    );

    if (primaryChannel !== "sms") {
      await AnnouncementMessage.updateOne(
        { _id: messageId, status: "scheduled" },
        { $set: { status: "sent", scheduledAt: null, deliveredCount: Number(msg.recipientCount || 0), failedCount: 0 } }
      );
      released += 1;
      continue;
    }

    const [pending, church] = await Promise.all([
      AnnouncementMessageDelivery.find({
        church: churchId,
        message: messageId,
        channel: "sms",
        status: "pending"
      }).select("_id phone").lean(),
      Church.findById(churchId).lean()
    ]);

    try {
      const sendResult = await sendSmsAndUpdateDeliveries({
        churchId,
        church,
        messageDoc: msg,
        deliveries: pending,
        markProviderErrorsFailed: false
      });

      // Refund credits for deliveries rejected by the provider BEFORE acceptance.
      if (sendResult?.rejectedDeliveryIds?.length > 0) {
        const perRecipientCost = Number(msg.costPerRecipientCredits || 0);
        const refundCount = sendResult.rejectedDeliveryIds.length;
        const refundTotal = perRecipientCost * refundCount;

        if (refundTotal > 0) {
          const totalDeducted = Number(msg.totalCostCredits || 0);
          const fromIncludedTotal = Number(msg.fromIncludedCredits || 0);
          const fromWalletTotal = Number(msg.fromWalletCredits || 0);
          const ratio = totalDeducted > 0 ? refundTotal / totalDeducted : 0;
          const refundIncluded = Math.round(fromIncludedTotal * ratio);
          const refundWallet = Math.round(fromWalletTotal * ratio);

          try {
            await refundCreditsForMessage({
              churchId,
              totalCostCredits: refundTotal,
              fromIncluded: refundIncluded,
              fromWallet: refundWallet,
              deductionKey: msg.deductionKey,
              description: `Scheduled refund: ${refundCount} recipient(s) rejected by provider`
            });
          } catch (refundErr) {
            console.error("[announcements] scheduled refund for rejected deliveries failed", refundErr);
          }
        }
      }

      const [deliveredCount, sentCount, failedCount, pendingLeft] = await Promise.all([
        AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "delivered" }),
        AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "sent" }),
        AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "failed" }),
        AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "pending" })
      ]);

      if (pendingLeft <= 0) {
        await AnnouncementMessage.updateOne(
          { _id: messageId },
          {
            $set: {
              status: "sent",
              scheduledAt: null,
              deliveredCount: Number(deliveredCount || 0),
              sentCount: Number(sentCount || 0),
              pendingCount: 0,
              failedCount: Number(failedCount || 0)
            }
          }
        );
        released += 1;
      } else {
        await AnnouncementMessage.updateOne(
          { _id: messageId },
          {
            $set: {
              deliveredCount: Number(deliveredCount || 0),
              sentCount: Number(sentCount || 0),
              pendingCount: Number(pendingLeft || 0),
              failedCount: Number(failedCount || 0)
            }
          }
        );
      }
    } catch (err) {
      console.error("[announcements] scheduled SMS send failed", err);
      // Mark as failed so the user can see the provider couldn't submit it
      await AnnouncementMessage.updateOne(
        { _id: messageId, status: "processing" },
        { $set: { status: "failed" } }
      );
    }
  }

  return { released };
};

/**
 * Africa's Talking delivery report webhook.
 * Called by AT when a final delivery status is available for a previously
 * submitted SMS. Updates the matching AnnouncementMessageDelivery record.
 *
 * No auth — this is a provider callback. The route is public but protected by:
 * - Rate limiting (200 req/min)
 * - Payload validation (required fields, length limits, status whitelist)
 * - Idempotency (skips duplicate callbacks with the same status)
 *
 * AT sends POST with: id (messageId), phoneNumber, status, networkErrorCode, failureReason
 */
const AT_VALID_CALLBACK_STATUSES = new Set([
  "success", "delivered", "sent", "submitted", "queued", "buffered", "accepted",
  "failed", "expired", "undeliverable", "dropped", "rejected", "invalid"
]);

const AT_MAX_FIELD_LENGTH = 500;

export const africasTalkingDeliveryReport = async (req, res) => {
  try {
    const body = req.body || {};

    // --- Payload validation ---
    const providerMessageId = String(body?.id || "").trim().slice(0, AT_MAX_FIELD_LENGTH);
    const phoneNumber = String(body?.phoneNumber || "").trim().slice(0, AT_MAX_FIELD_LENGTH);
    const rawStatus = String(body?.status || "").trim().slice(0, AT_MAX_FIELD_LENGTH);
    const failureReason = String(body?.failureReason || body?.networkErrorCode || "").trim().slice(0, AT_MAX_FIELD_LENGTH);

    // Must have at least one identifier
    if (!providerMessageId && !phoneNumber) {
      return res.status(400).json({ message: "Missing id or phoneNumber" });
    }

    // Must have a valid status
    if (!rawStatus) {
      return res.status(400).json({ message: "Missing status" });
    }

    const normalizedStatus = rawStatus.toLowerCase();
    if (!AT_VALID_CALLBACK_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ message: `Unknown status: ${rawStatus}` });
    }

    const mappedStatus = mapAfricasTalkingRecipientToStatus(rawStatus);

    // --- Find the delivery record ---
    const query = {};
    if (providerMessageId) query.providerMessageId = providerMessageId;
    if (phoneNumber && !providerMessageId) {
      query.phone = phoneNumber;
    }

    const delivery = await AnnouncementMessageDelivery.findOne(query);

    if (!delivery) {
      // Not found — acknowledge with 200 so AT doesn't keep retrying
      return res.status(200).json({ message: "Delivery record not found" });
    }

    // --- Idempotency: skip if this exact callback status was already processed ---
    const currentStatus = String(delivery.status || "pending");
    if (delivery.lastCallbackStatus === mappedStatus && delivery.lastCallbackAt) {
      // Duplicate callback with the same resulting status — already processed
      return res.status(200).json({ message: "Callback already processed" });
    }

    // Don't overwrite a terminal status with a non-terminal one
    const isTerminal = currentStatus === "delivered" || currentStatus === "failed";
    if (isTerminal && mappedStatus === "sent") {
      return res.status(200).json({ message: "Already terminal — ignored" });
    }

    // --- Atomic update with idempotency guard ---
    const updated = await AnnouncementMessageDelivery.updateOne(
      {
        _id: delivery._id,
        // Only update if the status hasn't been changed by a concurrent callback
        $or: [
          { lastCallbackStatus: { $ne: mappedStatus } },
          { lastCallbackStatus: null }
        ]
      },
      {
        $set: {
          status: mappedStatus,
          provider: "africastalking",
          errorMessage: mappedStatus === "failed" ? friendlySmsError(failureReason || rawStatus || "Failed") : null,
          lastCallbackStatus: mappedStatus,
          lastCallbackAt: new Date()
        }
      }
    );

    // If no document was modified, a concurrent callback already processed it
    if (updated.modifiedCount === 0 && updated.matchedCount > 0) {
      return res.status(200).json({ message: "Callback already processed by concurrent request" });
    }

    // --- Update the parent message counts ---
    const messageId = delivery.message;
    const churchId = delivery.church;

    const [deliveredCount, sentCount, failedCount, pendingLeft] = await Promise.all([
      AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "delivered" }),
      AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "sent" }),
      AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "failed" }),
      AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "pending" })
    ]);

    const update = {
      deliveredCount: Number(deliveredCount || 0),
      sentCount: Number(sentCount || 0),
      pendingCount: Number(pendingLeft || 0),
      failedCount: Number(failedCount || 0)
    };

    if (pendingLeft <= 0) {
      update.status = "sent";
      update.scheduledAt = null;
      await AnnouncementMessage.updateOne(
        { _id: messageId, status: "scheduled" },
        { $set: update }
      );
    } else {
      await AnnouncementMessage.updateOne(
        { _id: messageId },
        { $set: update }
      );
    }

    return res.status(200).json({ message: "Delivery report processed" });
  } catch (error) {
    console.error("[announcements] AT delivery report error:", error);
    return res.status(500).json({ message: error.message });
  }
};
