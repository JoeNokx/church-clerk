import AnnouncementAutomation from "../models/announcementAutomationModel.js";
import { AUTOMATION_TYPES, computeNextRunAt } from "../services/announcement/automationService.js";

const VALID_AUDIENCE_TYPES = ["all", "visitors", "members", "groups", "segment", "programs", "outreach"];

function sanitizeAudience(value) {
  const input = value && typeof value === "object" ? value : { type: "all" };
  const type = String(input.type || "all").trim();
  if (!VALID_AUDIENCE_TYPES.includes(type)) return { type: "all" };
  const out = {
    type,
    groupIds: Array.isArray(input.groupIds) ? input.groupIds : [],
    cellIds: Array.isArray(input.cellIds) ? input.cellIds : [],
    departmentIds: Array.isArray(input.departmentIds) ? input.departmentIds : [],
    ministryIds: Array.isArray(input.ministryIds) ? input.ministryIds : [],
    memberIds: Array.isArray(input.memberIds) ? input.memberIds : [],
    programIds: Array.isArray(input.programIds) ? input.programIds : [],
    outreachIds: Array.isArray(input.outreachIds) ? input.outreachIds : [],
    statuses: Array.isArray(input.statuses) ? input.statuses : [],
    genders: Array.isArray(input.genders) ? input.genders : [],
    ageGroups: Array.isArray(input.ageGroups) ? input.ageGroups : [],
    maritalStatuses: Array.isArray(input.maritalStatuses) ? input.maritalStatuses : []
  };
  // Only carry visitorIds when provided — the audience resolver treats a
  // present-but-empty array as "no visitors selected" and a missing key as
  // "all visitors", which automations rely on.
  if (Object.prototype.hasOwnProperty.call(input, "visitorIds")) {
    out.visitorIds = Array.isArray(input.visitorIds) ? input.visitorIds : [];
  }
  return out;
}

function validatePayload(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (!partial || body?.name !== undefined) {
    const name = String(body?.name || "").trim();
    if (!name) errors.push("Name is required");
    else out.name = name;
  }

  if (!partial || body?.type !== undefined) {
    const type = String(body?.type || "").trim();
    if (!AUTOMATION_TYPES.includes(type)) errors.push("Invalid automation type");
    else out.type = type;
  }

  if (!partial || body?.title !== undefined) {
    const title = String(body?.title || "").trim();
    if (!title) errors.push("Message title is required");
    else out.title = title;
  }

  if (!partial || body?.content !== undefined) {
    const content = String(body?.content || "").trim();
    if (!content) errors.push("Message content is required");
    else out.content = content;
  }

  if (body?.sendTime !== undefined) {
    const sendTime = String(body?.sendTime || "").trim();
    if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(sendTime)) {
      errors.push("Send time must be a valid HH:mm time");
    } else {
      out.sendTime = sendTime;
    }
  } else if (!partial) {
    out.sendTime = "08:00";
  }

  if (body?.daysOfWeek !== undefined) {
    const days = (Array.isArray(body?.daysOfWeek) ? body.daysOfWeek : [])
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    out.daysOfWeek = Array.from(new Set(days));
  } else if (!partial) {
    out.daysOfWeek = [];
  }

  if (body?.runDate !== undefined) {
    const runDate = String(body.runDate || "").trim();
    if (runDate && !/^\d{4}-\d{2}-\d{2}$/.test(runDate)) {
      errors.push("Run date must be a valid YYYY-MM-DD date");
    } else {
      out.runDate = runDate || null;
    }
  } else if (!partial) {
    out.runDate = null;
  }

  if (body?.dayOfMonth !== undefined) {
    const dom = Number(body.dayOfMonth);
    if (body.dayOfMonth !== null && (!Number.isInteger(dom) || dom < 1 || dom > 31)) {
      errors.push("Day of month must be between 1 and 31");
    } else {
      out.dayOfMonth = body.dayOfMonth === null ? null : dom;
    }
  } else if (!partial) {
    out.dayOfMonth = null;
  }

  if (body?.audience !== undefined) {
    out.audience = sanitizeAudience(body.audience);
  } else if (!partial) {
    out.audience = { type: "all" };
  }

  if (body?.enabled !== undefined) {
    out.enabled = Boolean(body.enabled);
  }

  const type = out.type ?? body?.type;
  if (type === "weekly_reminder" && Array.isArray(out.daysOfWeek) && !out.daysOfWeek.length) {
    errors.push("Select at least one day for a weekly reminder");
  }
  // Require the date/day when it's missing — on create, when the type is
  // being switched to that schedule, or when the field was sent empty.
  if (type === "one_time" && !out.runDate && (!partial || body?.type === "one_time" || body?.runDate !== undefined)) {
    errors.push("Pick a date for a one-time message");
  }
  if (type === "monthly" && !out.dayOfMonth && (!partial || body?.type === "monthly" || body?.dayOfMonth !== undefined)) {
    errors.push("Pick a day of the month for a monthly message");
  }

  return { errors, out };
}

export const getAutomations = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }
    const automations = await AnnouncementAutomation.find({ church: req.activeChurch._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ automations });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createAutomation = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { errors, out } = validatePayload(req.body);
    if (errors.length) {
      return res.status(400).json({ message: errors[0] });
    }

    const nextRunAt = computeNextRunAt({
      type: out.type,
      sendTime: out.sendTime,
      daysOfWeek: out.daysOfWeek,
      runDate: out.runDate,
      dayOfMonth: out.dayOfMonth
    });
    if (!nextRunAt) {
      return res.status(400).json({ message: "The schedule has no upcoming run — pick a future date/time" });
    }

    const automation = await AnnouncementAutomation.create({
      church: req.activeChurch._id,
      createdBy: req.user?._id || null,
      ...out,
      enabled: out.enabled !== undefined ? out.enabled : true,
      nextRunAt
    });

    return res.status(201).json({ automation });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const updateAutomation = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const id = String(req.params?.id || "").trim();
    if (!id) return res.status(400).json({ message: "Automation id is required" });

    const existing = await AnnouncementAutomation.findOne({ _id: id, church: req.activeChurch._id });
    if (!existing) return res.status(404).json({ message: "Automation not found" });

    const { errors, out } = validatePayload(req.body, { partial: true });
    if (errors.length) {
      return res.status(400).json({ message: errors[0] });
    }

    const scheduleChanged =
      out.sendTime !== undefined || out.daysOfWeek !== undefined || out.type !== undefined
      || out.runDate !== undefined || out.dayOfMonth !== undefined;
    const merged = {
      type: out.type ?? existing.type,
      sendTime: out.sendTime ?? existing.sendTime,
      daysOfWeek: out.daysOfWeek ?? existing.daysOfWeek,
      runDate: out.runDate !== undefined ? out.runDate : existing.runDate,
      dayOfMonth: out.dayOfMonth !== undefined ? out.dayOfMonth : existing.dayOfMonth
    };

    const update = { ...out };
    // Recompute the next run when the schedule changes, or when re-enabling an
    // automation whose next run is missing or already in the past.
    if (scheduleChanged || (out.enabled === true && (!existing.nextRunAt || existing.nextRunAt <= new Date()))) {
      update.nextRunAt = computeNextRunAt(merged);
    }

    const automation = await AnnouncementAutomation.findOneAndUpdate(
      { _id: id, church: req.activeChurch._id },
      { $set: update },
      { new: true }
    ).lean();

    return res.status(200).json({ automation });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const deleteAutomation = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const id = String(req.params?.id || "").trim();
    if (!id) return res.status(400).json({ message: "Automation id is required" });

    const deleted = await AnnouncementAutomation.findOneAndDelete({ _id: id, church: req.activeChurch._id });
    if (!deleted) return res.status(404).json({ message: "Automation not found" });

    return res.status(200).json({ message: "Automation deleted" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
