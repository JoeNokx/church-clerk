import SystemInAppAnnouncement from "../models/systemInAppAnnouncementModel.js";
import SystemInAppAnnouncementReceipt from "../models/systemInAppAnnouncementReceiptModel.js";
import User from "../models/userModel.js";
import {
  DISPLAY_TYPES,
  PRIORITIES,
  TARGET_TYPES,
  STATUSES,
  KINDS,
  toObjectId,
  toObjectIdList,
  normalizeRole,
  resolveTargetUserQuery,
  createNotificationOnce,
  matchesTarget
} from "../utils/systemInAppAnnouncementUtils.js";

const paginateList = async ({ query = {}, page = 1, limit = 20, sort = "newest" }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const sortSpec = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  const total = await SystemInAppAnnouncement.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const rows = await SystemInAppAnnouncement.find(query)
    .sort(sortSpec)
    .skip(skip)
    .limit(safeLimit)
    .lean();

  return {
    rows,
    pagination: {
      total,
      totalPages,
      currentPage: safePage,
      limit: safeLimit,
      nextPage: safePage < totalPages ? safePage + 1 : null,
      prevPage: safePage > 1 ? safePage - 1 : null
    }
  };
};

const buildListQuery = ({ status, kind, search }) => {
  const query = {};
  const statusFilter = String(status || "").trim();
  if (statusFilter) {
    if (!STATUSES.has(statusFilter)) throw new Error("Invalid status");
    query.status = statusFilter;
  }

  const kindFilter = String(kind || "").trim();
  if (kindFilter) {
    if (!KINDS.has(kindFilter)) throw new Error("Invalid kind");
    query.kind = kindFilter;
  }

  const q = String(search || "").trim();
  if (q) {
    const regex = new RegExp(q, "i");
    query.$or = [{ title: regex }, { message: regex }];
  }

  return query;
};

const getAnnouncementById = async (id) => {
  const row = await SystemInAppAnnouncement.findById(id).lean();
  return row;
};

const createAnnouncement = async ({ body, userId }) => {
  const title = String(body?.title || "").trim();
  const message = String(body?.message || "").trim();
  const kind = String(body?.kind || "message").trim();
  const priority = String(body?.priority || "informational").trim();
  const displayTypes = Array.isArray(body?.displayTypes) ? body.displayTypes.map((v) => String(v).trim()) : [];
  const bannerDurationMinutesRaw = body?.bannerDurationMinutes;
  const target = body?.target || { type: "all" };
  const sendMode = String(body?.sendMode || "draft").trim();

  if (!title) throw new Error("Title is required");
  if (!message) throw new Error("Message is required");
  if (!KINDS.has(kind)) throw new Error("Invalid kind");
  if (!PRIORITIES.has(priority)) throw new Error("Invalid priority");
  if (!displayTypes.length || !displayTypes.every((v) => DISPLAY_TYPES.has(v))) {
    throw new Error("Invalid displayTypes");
  }

  const targetType = String(target?.type || "all").trim();
  if (!TARGET_TYPES.has(targetType)) throw new Error("Invalid target type");

  const bannerDurationMinutes = bannerDurationMinutesRaw === undefined || bannerDurationMinutesRaw === null
    ? 5
    : Number(bannerDurationMinutesRaw);

  if (!Number.isFinite(bannerDurationMinutes) || bannerDurationMinutes < 0) {
    throw new Error("bannerDurationMinutes must be a number >= 0");
  }

  let status = "draft";
  let scheduledAt = null;
  let sentAt = null;

  if (kind === "message") {
    if (sendMode === "now") {
      status = "sent";
      sentAt = new Date();
    } else if (sendMode === "schedule") {
      const dt = body?.scheduledAt ? new Date(body.scheduledAt) : null;
      if (!dt || Number.isNaN(dt.getTime())) {
        throw new Error("scheduledAt is required");
      }
      status = "scheduled";
      scheduledAt = dt;
    }
  }

  const created = await SystemInAppAnnouncement.create({
    title,
    message,
    kind,
    priority,
    displayTypes,
    bannerDurationMinutes,
    target: {
      type: targetType,
      churchIds: toObjectIdList(target?.churchIds),
      roles: Array.isArray(target?.roles) ? target.roles.map(normalizeRole).filter(Boolean) : []
    },
    status,
    scheduledAt,
    sentAt,
    createdBy: userId || null,
    updatedBy: userId || null
  });

  if (created.kind === "message" && status === "sent" && created.displayTypes.includes("notification")) {
    const userQuery = resolveTargetUserQuery({ target: created.target });
    if (userQuery) {
      const users = await User.find(userQuery).select("_id").lean();
      for (const u of users) {
        await createNotificationOnce({ userId: u._id, announcement: created });
      }
    }
  }

  return created;
};

const updateAnnouncement = async ({ id, body, userId }) => {
  const existing = await SystemInAppAnnouncement.findById(id);
  if (!existing) throw new Error("Announcement not found");

  const patch = {};

  if (body?.title !== undefined) {
    const t = String(body.title || "").trim();
    if (!t) throw new Error("Title is required");
    patch.title = t;
  }

  if (body?.message !== undefined) {
    const m = String(body.message || "").trim();
    if (!m) throw new Error("Message is required");
    patch.message = m;
  }

  if (body?.kind !== undefined) {
    const k = String(body.kind || "").trim();
    if (!KINDS.has(k)) throw new Error("Invalid kind");
    patch.kind = k;
  }

  if (body?.priority !== undefined) {
    const p = String(body.priority || "").trim();
    if (!PRIORITIES.has(p)) throw new Error("Invalid priority");
    patch.priority = p;
  }

  if (body?.displayTypes !== undefined) {
    const types = Array.isArray(body.displayTypes) ? body.displayTypes.map((v) => String(v).trim()) : [];
    if (!types.length || !types.every((v) => DISPLAY_TYPES.has(v))) {
      throw new Error("Invalid displayTypes");
    }
    patch.displayTypes = types;
  }

  if (body?.bannerDurationMinutes !== undefined) {
    const n = Number(body.bannerDurationMinutes);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error("bannerDurationMinutes must be a number >= 0");
    }
    patch.bannerDurationMinutes = n;
  }

  if (body?.target !== undefined) {
    const target = body.target || {};
    const type = String(target?.type || "all").trim();
    if (!TARGET_TYPES.has(type)) {
      throw new Error("Invalid target type");
    }

    patch.target = {
      type,
      churchIds: toObjectIdList(target?.churchIds),
      roles: Array.isArray(target?.roles) ? target.roles.map(normalizeRole).filter(Boolean) : []
    };
  }

  if (body?.status !== undefined) {
    const s = String(body.status || "").trim();
    if (!STATUSES.has(s)) throw new Error("Invalid status");
    patch.status = s;
    if (s === "archived") patch.archivedAt = new Date();
  }

  if (body?.scheduledAt !== undefined) {
    const dt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (dt && Number.isNaN(dt.getTime())) {
      throw new Error("Invalid scheduledAt");
    }
    patch.scheduledAt = dt;
  }

  if (body?.sendMode !== undefined && String(patch.kind || existing.kind || "message") === "message") {
    const sendMode = String(body.sendMode || "").trim();
    if (sendMode === "now") {
      patch.status = "sent";
      patch.sentAt = new Date();
      patch.scheduledAt = null;
    } else if (sendMode === "schedule") {
      const dt = body?.scheduledAt ? new Date(body.scheduledAt) : null;
      if (!dt || Number.isNaN(dt.getTime())) {
        throw new Error("scheduledAt is required");
      }
      patch.status = "scheduled";
      patch.scheduledAt = dt;
      patch.sentAt = null;
    } else if (sendMode === "draft") {
      patch.status = "draft";
      patch.scheduledAt = null;
      patch.sentAt = null;
    }
  }

  patch.updatedBy = userId || null;

  existing.set(patch);
  await existing.save();

  if (existing.kind === "message" && existing.status === "sent" && existing.displayTypes.includes("notification")) {
    const userQuery = resolveTargetUserQuery({ target: existing.target });
    if (userQuery) {
      const users = await User.find(userQuery).select("_id").lean();
      for (const u of users) {
        await createNotificationOnce({ userId: u._id, announcement: existing });
      }
    }
  }

  return existing.toObject();
};

const deleteAnnouncement = async (id) => {
  const deleted = await SystemInAppAnnouncement.findByIdAndDelete(id).lean();
  if (!deleted) throw new Error("Announcement not found");
  await SystemInAppAnnouncementReceipt.deleteMany({ announcement: id });
};

const listActiveForUser = async (user) => {
  const userId = user?._id;
  if (!userId) throw new Error("Not authorized");

  await releaseDueScheduledSystemInAppAnnouncements();

  const announcements = await SystemInAppAnnouncement.find({ status: "sent" })
    .sort({ sentAt: -1, createdAt: -1 })
    .limit(50)
    .lean();

  const filtered = (Array.isArray(announcements) ? announcements : []).filter((a) => matchesTarget({ announcement: a, user }));
  const ids = filtered.map((a) => a._id);

  const receipts = await SystemInAppAnnouncementReceipt.find({
    user: userId,
    announcement: { $in: ids }
  }).lean();

  const receiptById = new Map(receipts.map((r) => [String(r.announcement), r]));

  const payload = filtered
    .map((a) => {
      const receipt = receiptById.get(String(a._id)) || null;
      const priority = String(a?.priority || "informational");

      const activeDisplayTypes = (Array.isArray(a?.displayTypes) ? a.displayTypes : [])
        .filter((dt) => {
          if (dt === "modal") {
            if (priority === "critical") return !receipt?.modalAcknowledgedAt;
            return !receipt?.modalDismissedAt;
          }
          if (dt === "banner") {
            if (priority === "critical") return !receipt?.bannerAcknowledgedAt;
            return !receipt?.bannerDismissedAt;
          }
          if (dt === "notification") return true;
          return false;
        });

      return {
        ...a,
        receipt: receipt
          ? {
              firstSeenAt: receipt.firstSeenAt,
              lastSeenAt: receipt.lastSeenAt,
              modalAcknowledgedAt: receipt.modalAcknowledgedAt,
              modalDismissedAt: receipt.modalDismissedAt,
              bannerAcknowledgedAt: receipt.bannerAcknowledgedAt,
              bannerDismissedAt: receipt.bannerDismissedAt
            }
          : null,
        activeDisplayTypes
      };
    })
    .filter((a) => (Array.isArray(a?.activeDisplayTypes) ? a.activeDisplayTypes : []).some((dt) => dt === "modal" || dt === "banner"));

  return payload;
};

const markSeen = async ({ announcementId, user }) => {
  const id = toObjectId(announcementId);
  if (!id) throw new Error("Invalid id");

  const announcement = await SystemInAppAnnouncement.findById(id).select("_id status").lean();
  if (!announcement || announcement.status !== "sent") {
    throw new Error("Announcement not found");
  }

  const now = new Date();

  const receipt = await SystemInAppAnnouncementReceipt.findOneAndUpdate(
    { announcement: id, user: user._id },
    {
      $setOnInsert: {
        church: user?.church || null,
        firstSeenAt: now
      },
      $set: {
        lastSeenAt: now
      }
    },
    { new: true, upsert: true }
  ).lean();

  return receipt;
};

const acknowledge = async ({ announcementId, user, displayType = "modal" }) => {
  const id = toObjectId(announcementId);
  if (!id) throw new Error("Invalid id");

  const announcement = await SystemInAppAnnouncement.findById(id).select("_id status priority displayTypes").lean();
  if (!announcement || announcement.status !== "sent") {
    throw new Error("Announcement not found");
  }

  if (!DISPLAY_TYPES.has(displayType)) throw new Error("Invalid displayType");
  if (!Array.isArray(announcement?.displayTypes) || !announcement.displayTypes.includes(displayType)) {
    throw new Error("Announcement does not include this displayType");
  }

  const now = new Date();
  const set = { lastSeenAt: now };
  if (displayType === "modal") set.modalAcknowledgedAt = now;
  if (displayType === "banner") set.bannerAcknowledgedAt = now;

  const receipt = await SystemInAppAnnouncementReceipt.findOneAndUpdate(
    { announcement: id, user: user._id },
    {
      $setOnInsert: {
        church: user?.church || null,
        firstSeenAt: now
      },
      $set: {
        ...set
      }
    },
    { new: true, upsert: true }
  ).lean();

  return receipt;
};

const dismiss = async ({ announcementId, user, displayType = "modal" }) => {
  const id = toObjectId(announcementId);
  if (!id) throw new Error("Invalid id");

  const announcement = await SystemInAppAnnouncement.findById(id).select("_id status priority displayTypes").lean();
  if (!announcement || announcement.status !== "sent") {
    throw new Error("Announcement not found");
  }

  if (!DISPLAY_TYPES.has(displayType)) throw new Error("Invalid displayType");
  if (!Array.isArray(announcement?.displayTypes) || !announcement.displayTypes.includes(displayType)) {
    throw new Error("Announcement does not include this displayType");
  }

  if (String(announcement.priority) === "critical") {
    throw new Error("Critical announcements cannot be dismissed");
  }

  const now = new Date();
  const set = { lastSeenAt: now };
  if (displayType === "modal") set.modalDismissedAt = now;
  if (displayType === "banner") set.bannerDismissedAt = now;

  const receipt = await SystemInAppAnnouncementReceipt.findOneAndUpdate(
    { announcement: id, user: user._id },
    {
      $setOnInsert: {
        church: user?.church || null,
        firstSeenAt: now
      },
      $set: {
        ...set
      }
    },
    { new: true, upsert: true }
  ).lean();

  return receipt;
};

const releaseDueScheduledSystemInAppAnnouncements = async () => {
  const now = new Date();

  const due = await SystemInAppAnnouncement.find({
    status: "scheduled",
    scheduledAt: { $lte: now }
  }).lean();

  if (!due.length) return { released: 0 };

  const ids = due.map((d) => d._id);

  await SystemInAppAnnouncement.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "sent", sentAt: now, scheduledAt: null } }
  );

  for (const ann of due) {
    const willNotify = Array.isArray(ann?.displayTypes) && ann.displayTypes.includes("notification");
    if (!willNotify) continue;

    const userQuery = resolveTargetUserQuery({ target: ann.target });
    if (!userQuery) continue;

    const users = await User.find(userQuery).select("_id").lean();
    for (const u of users) {
      await createNotificationOnce({ userId: u._id, announcement: ann });
    }
  }

  return { released: due.length };
};

export {
  paginateList,
  buildListQuery,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listActiveForUser,
  markSeen,
  acknowledge,
  dismiss,
  releaseDueScheduledSystemInAppAnnouncements
};
