import AnnouncementMessage from "../models/announcementMessageModel.js";
import AnnouncementMessageDelivery from "../models/announcementMessageDeliveryModel.js";
import AnnouncementWallet from "../models/announcementWalletModel.js";
import AnnouncementWalletTransaction from "../models/announcementWalletTransactionModel.js";
import Church from "../models/churchModel.js";
import { getSystemSettingsSnapshot } from "./systemSettingsController.js";
import { resolveSenderId } from "../utils/resolveSenderId.js";
import {
  computeCostPerRecipientCredits,
  parseSchedule,
  toScheduleParts,
  toObjectIdList
} from "../utils/announcementHelpers.js";
import {
  countUniqueMembersForAudience,
  resolveAudienceMembers
} from "../services/announcement/audienceService.js";
import { sendSmsAndUpdateDeliveries } from "../services/announcement/smsService.js";
import { getOrCreateWallet, deductCreditsForMessage } from "../services/announcement/walletService.js";

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

    if (primaryChannel === "sms" && status !== "draft" && !(smsSenderId || resolvedSenderId)) {
      return res.status(400).json({
        message: "SMS sender ID is required. Set AT_DEFAULT_SENDER_ID in .env or request and approve a Sender ID."
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
    const costPerRecipientCredits = computeCostPerRecipientCredits({
      channels,
      smsCostCredits: systemSettings?.smsCostCredits,
      whatsappCostCredits: systemSettings?.whatsappCostCredits
    });

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

    const totalCostCredits = status === "draft" ? 0 : recipientCount * costPerRecipientCredits;

    let wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });

    if (status !== "draft" && totalCostCredits > 0) {
      try {
        wallet = await deductCreditsForMessage({
          churchId: req.activeChurch._id,
          wallet,
          totalCostCredits,
          status,
          channels,
          recipientCount,
          userId: req.user?._id
        });
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
      totalCostCredits
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
          } catch (err) {
            console.error("[announcements] Africa's Talking send failed", err);
            sendSummary = {
              attempted: inserted.length,
              delivered: 0,
              failed: inserted.length,
              invalid: 0,
              error: String(err?.message || "SMS send failed")
            };
          }

          await AnnouncementMessage.updateOne(
            { _id: createdMessage._id, church: req.activeChurch._id },
            {
              $set: {
                deliveredCount: Number(sendSummary?.delivered || 0),
                failedCount: Number(sendSummary?.failed || 0)
              }
            }
          );

          createdMessage.deliveredCount = Number(sendSummary?.delivered || 0);
          createdMessage.failedCount = Number(sendSummary?.failed || 0);
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
    if (status) query.status = status;

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
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      total: deliveries.length,
      sent: deliveries.filter((d) => ["sent", "delivered", "failed"].includes(String(d?.status))).length,
      delivered: deliveries.filter((d) => String(d?.status) === "delivered").length,
      failed: deliveries.filter((d) => String(d?.status) === "failed").length
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

    if (!channels.length) {
      return res.status(400).json({ message: "Please select at least one channel" });
    }

    const recipientCount = await countUniqueMembersForAudience({ churchId: req.activeChurch._id, audience });
    const systemSettings = await getSystemSettingsSnapshot();
    const costPerRecipientCredits = computeCostPerRecipientCredits({
      channels,
      smsCostCredits: systemSettings?.smsCostCredits,
      whatsappCostCredits: systemSettings?.whatsappCostCredits
    });
    const totalCostCredits = recipientCount * costPerRecipientCredits;

    return res.status(200).json({
      recipientCount,
      costPerRecipientCredits,
      totalCostCredits
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

    if (status === "scheduled" && totalCostCredits > 0) {
      wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });
      wallet.balanceCredits = Number(wallet.balanceCredits || 0) + totalCostCredits;
      await wallet.save();

      await AnnouncementWalletTransaction.create({
        church: req.activeChurch._id,
        wallet: wallet._id,
        type: "refund",
        status: "success",
        amountCredits: totalCostCredits,
        balanceAfterCredits: wallet.balanceCredits,
        description: "Scheduled message deleted (refund)",
        createdBy: req.user?._id || null,
        metadata: {
          messageId: message._id.toString()
        }
      });
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
      await sendSmsAndUpdateDeliveries({
        churchId,
        church,
        messageDoc: msg,
        deliveries: pending,
        markProviderErrorsFailed: false
      });

      const [deliveredCount, failedCount, pendingLeft] = await Promise.all([
        AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "delivered" }),
        AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "failed" }),
        AnnouncementMessageDelivery.countDocuments({ church: churchId, message: messageId, channel: "sms", status: "pending" })
      ]);

      if (pendingLeft <= 0) {
        await AnnouncementMessage.updateOne(
          { _id: messageId, status: "scheduled" },
          {
            $set: {
              status: "sent",
              scheduledAt: null,
              deliveredCount: Number(deliveredCount || 0),
              failedCount: Number(failedCount || 0)
            }
          }
        );
        released += 1;
      } else {
        await AnnouncementMessage.updateOne(
          { _id: messageId, status: "scheduled" },
          {
            $set: {
              deliveredCount: Number(deliveredCount || 0),
              failedCount: Number(failedCount || 0)
            }
          }
        );
      }
    } catch (err) {
      console.error("[announcements] scheduled SMS send failed", err);
      // keep scheduled + keep deliveries pending to allow retries (e.g. after fixing env keys)
    }
  }

  return { released };
};
