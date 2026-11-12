import mongoose from "mongoose";
import Notification from "../models/notificationModel.js";
import Role from "../models/roleModel.js";
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

const resolveTargetUserQuery = async ({ target }) => {
  const type = String(target?.type || "all").trim();

  // Role sets must include DB-backed custom roles — a system-scoped role
  // the super admin created should be excluded from church announcements
  // just like the built-ins, and church-scoped custom roles included.
  const churchRoles = new Set([...(CHURCH_ROLES || [])]);
  const systemRoles = new Set([...(SYSTEM_ROLES || [])]);
  try {
    const dbRoles = await Role.find({ isActive: true }).select("key scope").lean();
    for (const r of dbRoles || []) {
      const key = normalizeRole(r?.key);
      if (!key) continue;
      if (r.scope === "system") systemRoles.add(key);
      else churchRoles.add(key);
    }
  } catch {
    void 0;
  }

  const base = {
    isActive: true,
    role: {
      $nin: Array.from(systemRoles)
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

export {
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
};
