import mongoose from "mongoose";

import SystemInAppAnnouncement from "../models/systemInAppAnnouncementModel.js";
import SystemInAppAnnouncementReceipt from "../models/systemInAppAnnouncementReceiptModel.js";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import { CHURCH_ROLES, SYSTEM_ROLES } from "../config/roles.js";

const DISPLAY_TYPES = new Set(["modal", "banner", "notification"]);
const PRIORITIES = new Set(["critical", "informational"]);
const TARGET_TYPES = new Set(["all", "churches", "roles"]);
const STATUSES = new Set(["draft", "sent", "scheduled", "archived"]);
const KINDS = new Set(["message", "template"]);

const toObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

const toObjectIdList = (ids) => {
  const arr = Array.isArray(ids) ? ids : [];
  return arr
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .map((v) => toObjectId(v))
    .filter(Boolean);
};

const normalizeRole = (r) => String(r || "").trim().toLowerCase();

const resolveTargetUserQuery = ({ target }) => {
  const type = String(target?.type || "all").trim();

  const churchRoles = new Set([...(CHURCH_ROLES || []), "associateadmin"]);

  const base = {
    isActive: true,
    role: {
      $nin: Array.from(new Set([...(SYSTEM_ROLES || []), "superadmin", "supportadmin"]))
    }
  };

  if (type === "all") {
    return {
      ...base,
      role: { $in: Array.from(churchRoles) }
    };
  }

  if (type === "churches") {
    const churchIds = toObjectIdList(target?.churchIds);
    if (!churchIds.length) return null;
    return {
      ...base,
      role: { $in: Array.from(churchRoles) },
      church: { $in: churchIds }
    };
  }

  if (type === "roles") {
    const roles = (Array.isArray(target?.roles) ? target.roles : [])
      .map(normalizeRole)
      .filter(Boolean);

    if (!roles.length) return null;

    return {
      ...base,
      role: { $in: roles }
    };
  }

  return null;
};

const createNotificationOnce = async ({ userId, announcement }) => {
  try {
    const title = String(announcement?.title || "System Announcement");
    const message = String(announcement?.message || "");

    await Notification.create({
      userId,
      type: "system_announcement",
      title,
      message,
      dedupeKey: `sysann:${String(announcement?._id)}:${String(userId)}`
    });
  } catch {
    void 0;
  }
};

export const listSystemInAppAnnouncements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "",
      kind = "",
      search = "",
      sort = "newest"
    } = req.query;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const query = {};

    const statusFilter = String(status || "").trim();
    if (statusFilter) {
      if (!STATUSES.has(statusFilter)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      query.status = statusFilter;
    }

    const kindFilter = String(kind || "").trim();
    if (kindFilter) {
      if (!KINDS.has(kindFilter)) {
        return res.status(400).json({ message: "Invalid kind" });
      }
      query.kind = kindFilter;
    }

    const q = String(search || "").trim();
    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [{ title: regex }, { message: regex }];
    }

    const sortSpec = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const total = await SystemInAppAnnouncement.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const rows = await SystemInAppAnnouncement.find(query)
      .sort(sortSpec)
      .skip(skip)
      .limit(safeLimit)
      .lean();

    return res.status(200).json({
      message: "System in-app announcements fetched",
      data: rows,
      pagination: {
        total,
        totalPages,
        currentPage: safePage,
        limit: safeLimit,
        nextPage: safePage < totalPages ? safePage + 1 : null,
        prevPage: safePage > 1 ? safePage - 1 : null
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getSystemInAppAnnouncementById = async (req, res) => {
  try {
    const id = toObjectId(req.params?.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const row = await SystemInAppAnnouncement.findById(id).lean();
    if (!row) return res.status(404).json({ message: "Announcement not found" });

    return res.status(200).json({ message: "Announcement fetched", data: row });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createSystemInAppAnnouncement = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();
    const kind = String(req.body?.kind || "message").trim();
    const priority = String(req.body?.priority || "informational").trim();
    const displayTypes = Array.isArray(req.body?.displayTypes)
      ? req.body.displayTypes.map((v) => String(v).trim())
      : [];
    const bannerDurationMinutesRaw = req.body?.bannerDurationMinutes;
    const target = req.body?.target || { type: "all" };
    const sendMode = String(req.body?.sendMode || "draft").trim();

    if (!title) return res.status(400).json({ message: "Title is required" });
    if (!message) return res.status(400).json({ message: "Message is required" });

    if (!KINDS.has(kind)) {
      return res.status(400).json({ message: "Invalid kind" });
    }

    if (!PRIORITIES.has(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    if (!displayTypes.length || !displayTypes.every((v) => DISPLAY_TYPES.has(v))) {
      return res.status(400).json({ message: "Invalid displayTypes" });
    }

    const targetType = String(target?.type || "all").trim();
    if (!TARGET_TYPES.has(targetType)) {
      return res.status(400).json({ message: "Invalid target type" });
    }

    const bannerDurationMinutes = bannerDurationMinutesRaw === undefined || bannerDurationMinutesRaw === null
      ? 5
      : Number(bannerDurationMinutesRaw);

    if (!Number.isFinite(bannerDurationMinutes) || bannerDurationMinutes < 0) {
      return res.status(400).json({ message: "bannerDurationMinutes must be a number >= 0" });
    }

    let status = "draft";
    let scheduledAt = null;
    let sentAt = null;

    if (kind === "message") {
      if (sendMode === "now") {
        status = "sent";
        sentAt = new Date();
      } else if (sendMode === "schedule") {
        const dt = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null;
        if (!dt || Number.isNaN(dt.getTime())) {
          return res.status(400).json({ message: "scheduledAt is required" });
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
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
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

    return res.status(201).json({ message: "Announcement created", data: created });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateSystemInAppAnnouncement = async (req, res) => {
  try {
    const id = toObjectId(req.params?.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const existing = await SystemInAppAnnouncement.findById(id);
    if (!existing) return res.status(404).json({ message: "Announcement not found" });

    const patch = {};

    if (req.body?.title !== undefined) {
      const t = String(req.body.title || "").trim();
      if (!t) return res.status(400).json({ message: "Title is required" });
      patch.title = t;
    }

    if (req.body?.message !== undefined) {
      const m = String(req.body.message || "").trim();
      if (!m) return res.status(400).json({ message: "Message is required" });
      patch.message = m;
    }

    if (req.body?.kind !== undefined) {
      const k = String(req.body.kind || "").trim();
      if (!KINDS.has(k)) return res.status(400).json({ message: "Invalid kind" });
      patch.kind = k;
    }

    if (req.body?.priority !== undefined) {
      const p = String(req.body.priority || "").trim();
      if (!PRIORITIES.has(p)) return res.status(400).json({ message: "Invalid priority" });
      patch.priority = p;
    }

    if (req.body?.displayTypes !== undefined) {
      const types = Array.isArray(req.body.displayTypes) ? req.body.displayTypes.map((v) => String(v).trim()) : [];
      if (!types.length || !types.every((v) => DISPLAY_TYPES.has(v))) {
        return res.status(400).json({ message: "Invalid displayTypes" });
      }
      patch.displayTypes = types;
    }

    if (req.body?.bannerDurationMinutes !== undefined) {
      const n = Number(req.body.bannerDurationMinutes);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: "bannerDurationMinutes must be a number >= 0" });
      }
      patch.bannerDurationMinutes = n;
    }

    if (req.body?.target !== undefined) {
      const target = req.body.target || {};
      const type = String(target?.type || "all").trim();
      if (!TARGET_TYPES.has(type)) {
        return res.status(400).json({ message: "Invalid target type" });
      }

      patch.target = {
        type,
        churchIds: toObjectIdList(target?.churchIds),
        roles: Array.isArray(target?.roles) ? target.roles.map(normalizeRole).filter(Boolean) : []
      };
    }

    if (req.body?.status !== undefined) {
      const s = String(req.body.status || "").trim();
      if (!STATUSES.has(s)) return res.status(400).json({ message: "Invalid status" });
      patch.status = s;
      if (s === "archived") patch.archivedAt = new Date();
    }

    if (req.body?.scheduledAt !== undefined) {
      const dt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
      if (dt && Number.isNaN(dt.getTime())) {
        return res.status(400).json({ message: "Invalid scheduledAt" });
      }
      patch.scheduledAt = dt;
    }

    if (req.body?.sendMode !== undefined && String(patch.kind || existing.kind || "message") === "message") {
      const sendMode = String(req.body.sendMode || "").trim();
      if (sendMode === "now") {
        patch.status = "sent";
        patch.sentAt = new Date();
        patch.scheduledAt = null;
      } else if (sendMode === "schedule") {
        const dt = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null;
        if (!dt || Number.isNaN(dt.getTime())) {
          return res.status(400).json({ message: "scheduledAt is required" });
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

    patch.updatedBy = req.user?._id || null;

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

    return res.status(200).json({ message: "Announcement updated", data: existing.toObject() });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteSystemInAppAnnouncement = async (req, res) => {
  try {
    const id = toObjectId(req.params?.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const deleted = await SystemInAppAnnouncement.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Announcement not found" });

    await SystemInAppAnnouncementReceipt.deleteMany({ announcement: id });

    return res.status(200).json({ message: "Announcement deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const matchesTarget = ({ announcement, user }) => {
  const type = String(announcement?.target?.type || "all").trim();

  if (type === "all") return true;

  if (type === "churches") {
    const ids = Array.isArray(announcement?.target?.churchIds) ? announcement.target.churchIds : [];
    const userChurch = user?.church;
    if (!userChurch) return false;
    return ids.some((id) => String(id) === String(userChurch));
  }

  if (type === "roles") {
    const roles = Array.isArray(announcement?.target?.roles) ? announcement.target.roles : [];
    const r = normalizeRole(user?.role);
    return roles.map(normalizeRole).includes(r);
  }

  return false;
};

export const listActiveInAppAnnouncementsForUser = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    // Opportunistic sweep: release any scheduled announcements that are due.
    // This also creates notification-center entries when needed.
    await releaseDueScheduledSystemInAppAnnouncements();

    const announcements = await SystemInAppAnnouncement.find({
      status: "sent"
    })
      .sort({ sentAt: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const filtered = (Array.isArray(announcements) ? announcements : []).filter((a) => matchesTarget({ announcement: a, user: req.user }));

    const ids = filtered.map((a) => a._id);

    const receipts = await SystemInAppAnnouncementReceipt.find({
      user: userId,
      announcement: { $in: ids }
    }).lean();

    const receiptById = new Map(receipts.map((r) => [String(r.announcement), r]));

    const payload = filtered.map((a) => {
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
    }).filter((a) => (Array.isArray(a?.activeDisplayTypes) ? a.activeDisplayTypes : []).some((dt) => dt === "modal" || dt === "banner"));

    return res.status(200).json({ message: "Active announcements fetched", data: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markInAppAnnouncementSeen = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const announcementId = toObjectId(req.params?.id);
    if (!announcementId) return res.status(400).json({ message: "Invalid id" });

    const announcement = await SystemInAppAnnouncement.findById(announcementId).select("_id status").lean();
    if (!announcement || announcement.status !== "sent") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const now = new Date();

    const receipt = await SystemInAppAnnouncementReceipt.findOneAndUpdate(
      { announcement: announcementId, user: userId },
      {
        $setOnInsert: {
          church: req.user?.church || null,
          firstSeenAt: now
        },
        $set: {
          lastSeenAt: now
        }
      },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({ message: "Seen recorded", data: receipt });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const acknowledgeInAppAnnouncement = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const announcementId = toObjectId(req.params?.id);
    if (!announcementId) return res.status(400).json({ message: "Invalid id" });

    const announcement = await SystemInAppAnnouncement.findById(announcementId)
      .select("_id status priority displayTypes")
      .lean();

    if (!announcement || announcement.status !== "sent") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const now = new Date();

    const displayType = String(req.body?.displayType || "modal").trim();
    if (!DISPLAY_TYPES.has(displayType)) {
      return res.status(400).json({ message: "Invalid displayType" });
    }

    if (!Array.isArray(announcement?.displayTypes) || !announcement.displayTypes.includes(displayType)) {
      return res.status(400).json({ message: "Announcement does not include this displayType" });
    }

    const set = {
      lastSeenAt: now
    };

    if (displayType === "modal") set.modalAcknowledgedAt = now;
    if (displayType === "banner") set.bannerAcknowledgedAt = now;

    const receipt = await SystemInAppAnnouncementReceipt.findOneAndUpdate(
      { announcement: announcementId, user: userId },
      {
        $setOnInsert: {
          church: req.user?.church || null,
          firstSeenAt: now
        },
        $set: {
          ...set
        }
      },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({ message: "Acknowledged", data: receipt });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const dismissInAppAnnouncement = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const announcementId = toObjectId(req.params?.id);
    if (!announcementId) return res.status(400).json({ message: "Invalid id" });

    const announcement = await SystemInAppAnnouncement.findById(announcementId)
      .select("_id status priority displayTypes")
      .lean();

    if (!announcement || announcement.status !== "sent") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const displayType = String(req.body?.displayType || "modal").trim();
    if (!DISPLAY_TYPES.has(displayType)) {
      return res.status(400).json({ message: "Invalid displayType" });
    }

    if (!Array.isArray(announcement?.displayTypes) || !announcement.displayTypes.includes(displayType)) {
      return res.status(400).json({ message: "Announcement does not include this displayType" });
    }

    if (String(announcement.priority) === "critical") {
      return res.status(400).json({ message: "Critical announcements cannot be dismissed" });
    }

    const now = new Date();

    const set = {
      lastSeenAt: now
    };

    if (displayType === "modal") set.modalDismissedAt = now;
    if (displayType === "banner") set.bannerDismissedAt = now;

    const receipt = await SystemInAppAnnouncementReceipt.findOneAndUpdate(
      { announcement: announcementId, user: userId },
      {
        $setOnInsert: {
          church: req.user?.church || null,
          firstSeenAt: now
        },
        $set: {
          ...set
        }
      },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({ message: "Dismissed", data: receipt });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const releaseDueScheduledSystemInAppAnnouncements = async () => {
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
