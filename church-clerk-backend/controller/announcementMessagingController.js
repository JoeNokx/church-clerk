import AnnouncementMessage from "../models/announcementMessageModel.js";
import AnnouncementMessageDelivery from "../models/announcementMessageDeliveryModel.js";
import AnnouncementWallet from "../models/announcementWalletModel.js";
import AnnouncementWalletTransaction from "../models/announcementWalletTransactionModel.js";
import Member from "../models/memberModel.js";
import Church from "../models/churchModel.js";
import mongoose from "mongoose";
import GroupMember from "../models/ministryModel/groupMembersModel.js";
import CellMember from "../models/ministryModel/cellMembersModel.js";
import DepartmentMember from "../models/ministryModel/departmentMembersModel.js";
import { getSystemSettingsSnapshot } from "./systemSettingsController.js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { getDefaultSmsSenderId, sendBulkSms } from "../services/africasTalkingSmsService.js";
import { resolveSenderId } from "../utils/resolveSenderId.js";

const computeCostPerRecipientCredits = ({ channels, smsCostCredits, whatsappCostCredits }) => {
  const arr = Array.isArray(channels) ? channels : [];
  const costs = {
    sms: Number.isFinite(Number(smsCostCredits)) ? Number(smsCostCredits) : 5,
    whatsapp: Number.isFinite(Number(whatsappCostCredits)) ? Number(whatsappCostCredits) : 20
  };
  return arr.reduce((sum, c) => sum + (costs[String(c)] || 0), 0);
};

const parseSchedule = ({ scheduledDate, scheduledTime }) => {
  const d = String(scheduledDate || "").trim();
  const t = String(scheduledTime || "").trim();
  if (!d || !t) return null;
  const dt = new Date(`${d}T${t}:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

const toScheduleParts = (dateValue) => {
  if (!dateValue) return { scheduledDate: "", scheduledTime: "" };
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return { scheduledDate: "", scheduledTime: "" };
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { scheduledDate: `${yyyy}-${mm}-${dd}`, scheduledTime: `${hh}:${mi}` };
};

const toObjectIdList = (ids) => {
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
};

const distinctMemberIdsForMinistries = async ({ churchId, groupIds, cellIds, departmentIds }) => {
  const [g, c, d] = await Promise.all([
    groupIds.length
      ? GroupMember.find({ church: churchId, group: { $in: groupIds } }).distinct("member")
      : Promise.resolve([]),
    cellIds.length
      ? CellMember.find({ church: churchId, cell: { $in: cellIds } }).distinct("member")
      : Promise.resolve([]),
    departmentIds.length
      ? DepartmentMember.find({ church: churchId, department: { $in: departmentIds } }).distinct("member")
      : Promise.resolve([])
  ]);

  const set = new Set([
    ...(Array.isArray(g) ? g : []),
    ...(Array.isArray(c) ? c : []),
    ...(Array.isArray(d) ? d : [])
  ].map((id) => String(id || "")).filter(Boolean));

  return Array.from(set)
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

const countUniqueMembersForAudience = async ({ churchId, audience }) => {
  const type = String(audience?.type || "all").trim();

  if (type === "members") {
    const memberIds = toObjectIdList(audience?.memberIds);
    if (!memberIds.length) return 0;
    return await Member.countDocuments({ church: churchId, _id: { $in: memberIds } });
  }

  if (type === "groups") {
    const groupIds = toObjectIdList(audience?.groupIds);
    const cellIds = toObjectIdList(audience?.cellIds);
    const departmentIds = toObjectIdList(audience?.departmentIds);

    if (!groupIds.length && !cellIds.length && !departmentIds.length) return 0;

    const memberIds = await distinctMemberIdsForMinistries({ churchId, groupIds, cellIds, departmentIds });
    return memberIds.length;
  }

  return await Member.countDocuments({ church: churchId });
};

const resolveAudienceMembers = async ({ churchId, audience }) => {
  const type = String(audience?.type || "all").trim();

  if (type === "members") {
    const memberIds = toObjectIdList(audience?.memberIds);
    if (!memberIds.length) return [];
    return await Member.find({ church: churchId, _id: { $in: memberIds } }).lean();
  }

  if (type === "groups") {
    const groupIds = toObjectIdList(audience?.groupIds);
    const cellIds = toObjectIdList(audience?.cellIds);
    const departmentIds = toObjectIdList(audience?.departmentIds);

    if (!groupIds.length && !cellIds.length && !departmentIds.length) return [];

    const memberIds = await distinctMemberIdsForMinistries({ churchId, groupIds, cellIds, departmentIds });
    if (!memberIds.length) return [];
    return await Member.find({ church: churchId, _id: { $in: memberIds } }).lean();
  }

  return await Member.find({ church: churchId }).lean();
};

const getOrCreateWallet = async ({ churchId }) => {
  const wallet = await AnnouncementWallet.findOneAndUpdate(
    { church: churchId },
    { $setOnInsert: { balanceCredits: 0 } },
    { new: true, upsert: true }
  );
  return wallet;
};

const normalizeSmsPhoneE164 = (rawPhone) => {
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
};

const resolveSmsSenderIdOrThrow = ({ church, requestedSenderId }) => {
  const primary = String(requestedSenderId || "").trim();
  const resolved = primary || resolveSenderId(church) || getDefaultSmsSenderId();
  if (!resolved) {
    throw new Error("SMS sender ID is required. Set AT_DEFAULT_SENDER_ID in .env or provide an approved church sender ID.");
  }
  return resolved;
};

const mapAfricasTalkingRecipientToStatus = (statusRaw) => {
  const s = String(statusRaw || "").trim().toLowerCase();
  if (s === "success") return "delivered";
  if (s) return "failed";
  return "failed";
};

const sendSmsAndUpdateDeliveries = async ({ churchId, church, messageDoc, deliveries, markProviderErrorsFailed = true }) => {
  const senderId = resolveSmsSenderIdOrThrow({ church, requestedSenderId: messageDoc?.smsSenderId });

  if (messageDoc?._id) {
    await AnnouncementMessage.updateOne(
      { _id: messageDoc._id, church: churchId },
      { $set: { sender_id_used: senderId } }
    );
  }

  const valid = [];
  const invalid = [];

  for (const d of deliveries) {
    const normalized = normalizeSmsPhoneE164(d.phone);
    if (!normalized) {
      invalid.push(d);
      continue;
    }
    valid.push({ delivery: d, phoneE164: normalized });
  }

  if (invalid.length) {
    const ops = invalid.map((d) => ({
      updateOne: {
        filter: { _id: d._id, church: churchId },
        update: {
          $set: {
            status: "failed",
            provider: "africastalking",
            errorMessage: "Invalid phone number"
          }
        }
      }
    }));
    await AnnouncementMessageDelivery.bulkWrite(ops);
  }

  if (!valid.length) {
    return {
      attempted: 0,
      delivered: 0,
      failed: invalid.length,
      invalid: invalid.length
    };
  }

  let response;
  try {
    response = await sendBulkSms({
      to: valid.map((v) => v.phoneE164),
      message: messageDoc.content,
      from: senderId
    });
  } catch (err) {
    const ops = valid.map((v) => ({
      updateOne: {
        filter: { _id: v.delivery._id, church: churchId },
        update: {
          $set: {
            status: markProviderErrorsFailed ? "failed" : "pending",
            provider: "africastalking",
            errorMessage: String(err?.message || "SMS send failed")
          }
        }
      }
    }));
    if (ops.length) {
      await AnnouncementMessageDelivery.bulkWrite(ops);
    }
    throw err;
  }

  const recipients = response?.SMSMessageData?.Recipients;
  const list = Array.isArray(recipients) ? recipients : [];
  const byPhone = new Map(list.map((r) => [String(r?.number || "").trim(), r]));

  let delivered = 0;
  let failed = 0;

  const ops = valid.map((v) => {
    const r = byPhone.get(v.phoneE164);
    const status = mapAfricasTalkingRecipientToStatus(r?.status);
    if (status === "delivered") delivered += 1;
    else failed += 1;

    return {
      updateOne: {
        filter: { _id: v.delivery._id, church: churchId },
        update: {
          $set: {
            status,
            provider: "africastalking",
            providerMessageId: r?.messageId ? String(r.messageId) : null,
            errorMessage: status === "failed" ? String(r?.status || "Failed") : null,
            phone: v.phoneE164
          }
        }
      }
    };
  });

  if (ops.length) {
    await AnnouncementMessageDelivery.bulkWrite(ops);
  }

  return {
    attempted: valid.length,
    delivered,
    failed: failed + invalid.length,
    invalid: invalid.length
  };
};

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
      const updatedWallet = await AnnouncementWallet.findOneAndUpdate(
        { _id: wallet._id, balanceCredits: { $gte: totalCostCredits } },
        { $inc: { balanceCredits: -totalCostCredits } },
        { new: true }
      );

      if (!updatedWallet) {
        return res.status(400).json({ message: "Insufficient credits. Please fund your wallet." });
      }

      wallet = updatedWallet;

      await AnnouncementWalletTransaction.create({
        church: req.activeChurch._id,
        wallet: wallet._id,
        type: "deduct",
        status: "success",
        amountCredits: -totalCostCredits,
        balanceAfterCredits: wallet.balanceCredits,
        description: `Message ${status}`,
        createdBy: req.user?._id || null,
        metadata: {
          channels,
          recipientCount
        }
      });
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
