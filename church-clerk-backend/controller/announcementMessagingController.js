import AnnouncementMessage from "../models/announcementMessageModel.js";
import AnnouncementMessageDelivery from "../models/announcementMessageDeliveryModel.js";
import AnnouncementWallet from "../models/announcementWalletModel.js";
import AnnouncementWalletTransaction from "../models/announcementWalletTransactionModel.js";
import Member from "../models/memberModel.js";

const CHANNEL_COSTS = {
  sms: 5,
  whatsapp: 20
};

const computeCostPerRecipientCredits = (channels) => {
  const arr = Array.isArray(channels) ? channels : [];
  return arr.reduce((sum, c) => sum + (CHANNEL_COSTS[String(c)] || 0), 0);
};

const parseSchedule = ({ scheduledDate, scheduledTime }) => {
  const d = String(scheduledDate || "").trim();
  const t = String(scheduledTime || "").trim();
  if (!d || !t) return null;
  const dt = new Date(`${d}T${t}:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

const resolveAudienceMembers = async ({ churchId, audience }) => {
  const type = String(audience?.type || "all").trim();

  if (type === "members") {
    const memberIds = Array.isArray(audience?.memberIds) ? audience.memberIds.filter(Boolean) : [];
    if (!memberIds.length) return [];
    return await Member.find({ church: churchId, _id: { $in: memberIds } }).lean();
  }

  if (type === "groups") {
    const groupIds = Array.isArray(audience?.groupIds) ? audience.groupIds.filter(Boolean) : [];
    const cellIds = Array.isArray(audience?.cellIds) ? audience.cellIds.filter(Boolean) : [];
    const departmentIds = Array.isArray(audience?.departmentIds) ? audience.departmentIds.filter(Boolean) : [];

    if (!groupIds.length && !cellIds.length && !departmentIds.length) return [];

    return await Member.find({
      church: churchId,
      $or: [
        groupIds.length ? { group: { $in: groupIds } } : null,
        cellIds.length ? { cell: { $in: cellIds } } : null,
        departmentIds.length ? { department: { $in: departmentIds } } : null
      ].filter(Boolean)
    }).lean();
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

    const status = sendMode === "draft" ? "draft" : sendMode === "schedule" ? "scheduled" : "sent";
    const scheduledAt = status === "scheduled"
      ? parseSchedule({ scheduledDate: req.body?.scheduledDate, scheduledTime: req.body?.scheduledTime })
      : null;

    if (status === "scheduled" && !scheduledAt) {
      return res.status(400).json({ message: "Scheduled date and time are required" });
    }

    const audience = req.body?.audience || { type: "all" };
    const costPerRecipientCredits = computeCostPerRecipientCredits(channels);

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

    const createdMessage = await AnnouncementMessage.create({
      church: req.activeChurch._id,
      createdBy: req.user?._id || null,
      title,
      content,
      channels,
      status,
      scheduledAt,
      audience,
      recipientCount,
      deliveredCount: status === "draft" ? 0 : recipientCount,
      failedCount: 0,
      costPerRecipientCredits,
      totalCostCredits
    });

    if (status !== "draft" && recipients.length) {
      const primaryChannel = channels?.[0] || "sms";
      const deliveries = recipients.map((m) => ({
        church: req.activeChurch._id,
        message: createdMessage._id,
        member: m._id,
        memberName: String(m?.fullName || `${m?.firstName || ""} ${m?.lastName || ""}` || "").trim(),
        phone: String(m?.phoneNumber || "").trim(),
        channel: primaryChannel,
        status: "delivered",
        provider: null
      }));

      if (deliveries.length) {
        await AnnouncementMessageDelivery.insertMany(deliveries);
      }
    }

    return res.status(201).json({ message: "Message created", data: createdMessage, wallet });
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
