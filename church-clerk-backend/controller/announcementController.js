import Announcement from "../models/announcementModel.js";

const createAnnouncement = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { title, message, targetAudience, sendMethod } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "title and message are required" });
    }

    const announcement = await Announcement.create({
      church: req.activeChurch._id,
      title,
      message,
      targetAudience: Array.isArray(targetAudience) ? targetAudience : [],
      sendMethod: sendMethod || undefined,
      postedBy: req.user?._id
    });

    return res.status(201).json({ message: "Announcement created successfully", announcement });
  } catch (error) {
    return res.status(400).json({ message: "Announcement could not be created", error: error.message });
  }
};

const getAllAnnouncements = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { page = 1, limit = 10, search = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { church: req.activeChurch._id };

    const s = String(search || "").trim();
    if (s) {
      const regex = { $regex: s, $options: "i" };
      query.$or = [{ title: regex }, { message: regex }];
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("postedBy", "fullName firstName lastName email")
        .lean(),
      Announcement.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      message: "Announcements fetched successfully",
      pagination: {
        totalResult: total,
        totalPages,
        currentPage: pageNum,
        hasPrev: pageNum > 1,
        hasNext: pageNum < totalPages,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
        nextPage: pageNum < totalPages ? pageNum + 1 : null
      },
      count: announcements.length,
      announcements
    });
  } catch (error) {
    return res.status(400).json({ message: "Announcements could not be fetched", error: error.message });
  }
};

const getSingleAnnouncement = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { id } = req.params;
    const announcement = await Announcement.findOne({ _id: id, church: req.activeChurch._id })
      .populate("postedBy", "fullName firstName lastName email")
      .lean();

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res.status(200).json({ message: "Announcement fetched successfully", announcement });
  } catch (error) {
    return res.status(400).json({ message: "Announcement could not be fetched", error: error.message });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.church;
    delete updates.postedBy;

    const announcement = await Announcement.findOneAndUpdate(
      { _id: id, church: req.activeChurch._id },
      updates,
      { new: true, runValidators: true }
    ).lean();

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res.status(200).json({ message: "Announcement updated successfully", announcement });
  } catch (error) {
    return res.status(400).json({ message: "Announcement could not be updated", error: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { id } = req.params;
    const announcement = await Announcement.findOneAndDelete({ _id: id, church: req.activeChurch._id }).lean();

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: "Announcement could not be deleted", error: error.message });
  }
};

export { createAnnouncement, getAllAnnouncements, getSingleAnnouncement, updateAnnouncement, deleteAnnouncement };
