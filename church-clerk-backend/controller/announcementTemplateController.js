import AnnouncementTemplate from "../models/announcementTemplateModel.js";

export const getTemplates = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const templates = await AnnouncementTemplate.find({ church: req.activeChurch._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ templates });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const name = String(req.body?.name || "").trim();
    const channel = String(req.body?.channel || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Template name is required" });
    }
    if (!["sms", "whatsapp"].includes(channel)) {
      return res.status(400).json({ message: "channel must be sms or whatsapp" });
    }
    if (!message) {
      return res.status(400).json({ message: "Template message is required" });
    }

    const created = await AnnouncementTemplate.create({
      church: req.activeChurch._id,
      createdBy: req.user?._id || null,
      name,
      channel,
      message
    });

    return res.status(201).json({ template: created });
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("duplicate key")) {
      return res.status(400).json({ message: "A template with that name already exists" });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const id = String(req.params?.id || "").trim();
    if (!id) {
      return res.status(400).json({ message: "Template id is required" });
    }

    const updates = {};
    if (req.body?.name !== undefined) updates.name = String(req.body?.name || "").trim();
    if (req.body?.channel !== undefined) updates.channel = String(req.body?.channel || "").trim();
    if (req.body?.message !== undefined) updates.message = String(req.body?.message || "").trim();

    if (updates.channel && !["sms", "whatsapp"].includes(updates.channel)) {
      return res.status(400).json({ message: "channel must be sms or whatsapp" });
    }

    const template = await AnnouncementTemplate.findOneAndUpdate(
      { _id: id, church: req.activeChurch._id },
      updates,
      { new: true, runValidators: true }
    ).lean();

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.status(200).json({ template });
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("duplicate key")) {
      return res.status(400).json({ message: "A template with that name already exists" });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const id = String(req.params?.id || "").trim();
    if (!id) {
      return res.status(400).json({ message: "Template id is required" });
    }

    const deleted = await AnnouncementTemplate.findOneAndDelete({ _id: id, church: req.activeChurch._id }).lean();

    if (!deleted) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.status(200).json({ message: "Template deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
