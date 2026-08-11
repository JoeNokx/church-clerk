import OutreachFollowUp from "../../models/outreachModel/outreachFollowUpModel.js";
import OutreachProspect from "../../models/outreachModel/outreachProspectModel.js";

const FU_ALLOWED = ["scheduledDate", "followUpDate", "type", "status", "outcome", "notes", "nextFollowUpDate", "assignedTo", "conductedBy"];
const FU_OBJECTID_FIELDS = new Set(["assignedTo", "conductedBy"]);
const setAllowed = (src, target) => {
  FU_ALLOWED.forEach((k) => {
    if (src[k] === undefined) return;
    if (src[k] === "" && FU_OBJECTID_FIELDS.has(k)) return; // skip empty ObjectId
    target[k] = src[k];
  });
};

const populateFU = (query) =>
  query
    .populate("prospect", "firstName lastName phone stage")
    .populate("assignedTo", "firstName lastName photoUrl phoneNumber")
    .populate("conductedBy", "firstName lastName photoUrl")
    .populate("outreachEvent", "title date");

// ── All follow-ups (cross-event) ──────────────────────────────────
export const getAllFollowUps = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const skip = (page - 1) * limit;
    const { status, eventId, assignedTo, dateFrom, dateTo } = req.query;

    const filter = { church: churchId };
    if (status) filter.status = status;
    if (eventId) filter.outreachEvent = eventId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (dateFrom || dateTo) {
      filter.scheduledDate = {};
      if (dateFrom) filter.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) filter.scheduledDate.$lte = new Date(dateTo + "T23:59:59.999Z");
    }

    const [followUps, total] = await Promise.all([
      populateFU(OutreachFollowUp.find(filter).sort({ scheduledDate: 1, createdAt: -1 }).skip(skip).limit(limit).lean()),
      OutreachFollowUp.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Follow-ups fetched",
      data: followUps,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Follow-up stats (overdue / today / upcoming) ─────────────────
export const getFollowUpsStats = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);
    const in7Days = new Date(todayEnd.getTime() + 7 * 86400000);
    const activeStatuses = ["pending", "no-response", "rescheduled"];

    const [overdue, dueToday, upcoming, completedThisMonth] = await Promise.all([
      OutreachFollowUp.countDocuments({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $lt: todayStart } }),
      OutreachFollowUp.countDocuments({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $gte: todayStart, $lte: todayEnd } }),
      OutreachFollowUp.countDocuments({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $gt: todayEnd, $lte: in7Days } }),
      OutreachFollowUp.countDocuments({ church: churchId, status: "completed", updatedAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } }),
    ]);

    const overdueList = await populateFU(
      OutreachFollowUp.find({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $lt: todayStart } })
        .sort({ scheduledDate: 1 }).limit(10).lean()
    );
    const todayList = await populateFU(
      OutreachFollowUp.find({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $gte: todayStart, $lte: todayEnd } })
        .sort({ scheduledDate: 1 }).limit(10).lean()
    );
    const upcomingList = await populateFU(
      OutreachFollowUp.find({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $gt: todayEnd, $lte: in7Days } })
        .sort({ scheduledDate: 1 }).limit(10).lean()
    );

    return res.status(200).json({
      message: "Follow-up stats fetched",
      data: { overdue, dueToday, upcoming, completedThisMonth, overdueList, todayList, upcomingList },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Follow-ups by event ───────────────────────────────────────────
export const getFollowUpsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;
    const filter = { church: req.activeChurch._id, outreachEvent: eventId };
    if (status) filter.status = status;

    const followUps = await populateFU(OutreachFollowUp.find(filter).sort({ scheduledDate: 1, createdAt: -1 }).lean());
    return res.status(200).json({ message: "Follow-ups fetched", data: followUps });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Follow-ups by prospect ────────────────────────────────────────
export const getFollowUpsByProspect = async (req, res) => {
  try {
    const { prospectId } = req.params;
    const followUps = await populateFU(
      OutreachFollowUp.find({ church: req.activeChurch._id, prospect: prospectId }).sort({ createdAt: -1 }).lean()
    );
    return res.status(200).json({ message: "Follow-ups fetched", data: followUps });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Create follow-up ──────────────────────────────────────────────
export const createFollowUp = async (req, res) => {
  try {
    const { prospectId } = req.params;
    const { outreachEvent, scheduledDate, type } = req.body;
    if (!outreachEvent || !scheduledDate) {
      return res.status(400).json({ message: "outreachEvent and scheduledDate are required" });
    }

    const prospect = await OutreachProspect.findOne({ _id: prospectId, church: req.activeChurch._id });
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });

    const payload = { church: req.activeChurch._id, prospect: prospectId, outreachEvent, createdBy: req.user._id };
    setAllowed(req.body, payload);
    payload.status = payload.status || "pending";

    const followUp = await OutreachFollowUp.create(payload);

    if (req.body.nextFollowUpDate || scheduledDate) {
      prospect.nextFollowUpDate = req.body.nextFollowUpDate ? new Date(req.body.nextFollowUpDate) : new Date(scheduledDate);
      if (prospect.stage === "reached") prospect.stage = "contacted";
      await prospect.save();
    }

    return res.status(201).json({ message: "Follow-up scheduled", data: followUp });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Update follow-up ──────────────────────────────────────────────
export const updateFollowUp = async (req, res) => {
  try {
    const update = {};
    setAllowed(req.body, update);

    const followUp = await OutreachFollowUp.findOneAndUpdate(
      { _id: req.params.followUpId, church: req.activeChurch._id },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!followUp) return res.status(404).json({ message: "Follow-up not found" });

    if (update.nextFollowUpDate && followUp.prospect) {
      await OutreachProspect.findByIdAndUpdate(followUp.prospect, { nextFollowUpDate: new Date(update.nextFollowUpDate) });
    }

    return res.status(200).json({ message: "Follow-up updated", data: followUp });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Delete follow-up ──────────────────────────────────────────────
export const deleteFollowUp = async (req, res) => {
  try {
    const followUp = await OutreachFollowUp.findOneAndDelete({ _id: req.params.followUpId, church: req.activeChurch._id });
    if (!followUp) return res.status(404).json({ message: "Follow-up not found" });
    return res.status(200).json({ message: "Follow-up deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
