import mongoose from "mongoose";
import Notification from "../models/notificationModel.js";

const toObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

export const listMyNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const {
      page = 1,
      limit = 20,
      unreadOnly = "",
      type = ""
    } = req.query;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const query = { userId };

    const unread = String(unreadOnly || "").trim().toLowerCase();
    if (unread === "true" || unread === "1") query.readStatus = false;

    const typeFilter = String(type || "").trim();
    if (typeFilter) query.type = typeFilter;

    const total = await Notification.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const skip = (safePage - 1) * safeLimit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    return res.status(200).json({
      message: "Notifications fetched",
      notifications,
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

export const getMyUnreadCount = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const unreadCount = await Notification.countDocuments({
      userId,
      readStatus: false
    });

    return res.status(200).json({ unreadCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const id = toObjectId(req.params?.id);
    if (!id) return res.status(400).json({ message: "Invalid notification id" });

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { readStatus: true } },
      { new: true }
    ).lean();

    if (!notification) return res.status(404).json({ message: "Notification not found" });

    return res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    await Notification.updateMany({ userId, readStatus: false }, { $set: { readStatus: true } });

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
