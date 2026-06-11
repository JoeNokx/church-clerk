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
import {
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
  releaseDueScheduledSystemInAppAnnouncements as releaseDueScheduledSystemInAppAnnouncementsService
} from "../services/systemInAppAnnouncementService.js";

// helpers now provided by utils import

const mapErrorStatus = (message) => {
  const lower = String(message || "").toLowerCase();
  if (lower.includes("not authorized")) return 401;
  if (lower.includes("not found")) return 404;
  if (lower.includes("invalid") || lower.includes("required") || lower.includes("cannot be dismissed")) return 400;
  return 500;
};

export const listSystemInAppAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", kind = "", search = "", sort = "newest" } = req.query;
    const query = buildListQuery({ status, kind, search });
    const { rows, pagination } = await paginateList({ query, page, limit, sort });
    return res.status(200).json({ message: "System in-app announcements fetched", data: rows, pagination });
  } catch (error) {
    return res.status(mapErrorStatus(error.message)).json({ message: error.message });
  }
};

export const getSystemInAppAnnouncementById = async (req, res) => {
  try {
    const id = toObjectId(req.params?.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    const row = await getAnnouncementById(id);
    if (!row) return res.status(404).json({ message: "Announcement not found" });
    return res.status(200).json({ message: "Announcement fetched", data: row });
  } catch (error) {
    return res.status(mapErrorStatus(error.message)).json({ message: error.message });
  }
};

export const createSystemInAppAnnouncement = async (req, res) => {
  try {
    const created = await createAnnouncement({ body: req.body, userId: req.user?._id });
    return res.status(201).json({ message: "Announcement created", data: created });
  } catch (error) {
    return res.status(mapErrorStatus(error.message)).json({ message: error.message });
  }
};

export const updateSystemInAppAnnouncement = async (req, res) => {
  try {
    const id = toObjectId(req.params?.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    const updated = await updateAnnouncement({ id, body: req.body, userId: req.user?._id });
    return res.status(200).json({ message: "Announcement updated", data: updated });
  } catch (error) {
    return res.status(mapErrorStatus(error.message)).json({ message: error.message });
  }
};

export const deleteSystemInAppAnnouncement = async (req, res) => {
  try {
    const id = toObjectId(req.params?.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    await deleteAnnouncement(id);
    return res.status(200).json({ message: "Announcement deleted" });
  } catch (error) {
    return res.status(mapErrorStatus(error.message)).json({ message: error.message });
  }
};

export const listActiveInAppAnnouncementsForUser = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });
    const data = await listActiveForUser(req.user);
    return res.status(200).json({ message: "Active announcements fetched", data });
  } catch (error) {
    return res.status(mapErrorStatus(error.message)).json({ message: error.message });
  }
};

export const markInAppAnnouncementSeen = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const announcementId = toObjectId(req.params?.id);
    if (!announcementId) return res.status(400).json({ message: "Invalid id" });
    const receipt = await markSeen({ announcementId, user: req.user });
    return res.status(200).json({ message: "Seen recorded", data: receipt });
  } catch (error) {
    return res.status(mapErrorStatus(error.message)).json({ message: error.message });
  }
};

export const acknowledgeInAppAnnouncement = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const announcementId = toObjectId(req.params?.id);
    if (!announcementId) return res.status(400).json({ message: "Invalid id" });

    const displayType = String(req.body?.displayType || "modal").trim();
    if (!DISPLAY_TYPES.has(displayType)) {
      return res.status(400).json({ message: "Invalid displayType" });
    }
    const receipt = await acknowledge({ announcementId, user: req.user, displayType });
    return res.status(200).json({ message: "Acknowledged", data: receipt });
  } catch (error) {
    return res.status(mapErrorStatus(error.message)).json({ message: error.message });
  }
};

export const dismissInAppAnnouncement = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const announcementId = toObjectId(req.params?.id);
    if (!announcementId) return res.status(400).json({ message: "Invalid id" });

    const displayType = String(req.body?.displayType || "modal").trim();
    if (!DISPLAY_TYPES.has(displayType)) {
      return res.status(400).json({ message: "Invalid displayType" });
    }
    const receipt = await dismiss({ announcementId, user: req.user, displayType });
    return res.status(200).json({ message: "Dismissed", data: receipt });
  } catch (error) {
    return res.status(mapErrorStatus(error.message)).json({ message: error.message });
  }
};

export const releaseDueScheduledSystemInAppAnnouncements = async () => {
  return releaseDueScheduledSystemInAppAnnouncementsService();
};
