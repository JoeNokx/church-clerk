import OutreachFollowUp from "../../models/outreachModel/outreachFollowUpModel.js";
import OutreachProspect from "../../models/outreachModel/outreachProspectModel.js";
import Visitor from "../../models/visitorsModel.js";
import Member from "../../models/memberModel.js";

const FU_ALLOWED = ["scheduledDate", "followUpDate", "type", "status", "outcome", "notes", "nextFollowUpDate", "assignedTo", "conductedBy"];
const FU_OBJECTID_FIELDS = new Set(["conductedBy"]);
const setAllowed = (src, target) => {
  FU_ALLOWED.forEach((k) => {
    if (src[k] === undefined) return;
    if (k === "assignedTo") {
      if (src[k] === "") return; // skip empty ObjectId
      // Multi-assignee: accept a single id or an array; [] clears all assignees
      target[k] = Array.isArray(src[k]) ? src[k] : [src[k]];
      return;
    }
    if (src[k] === "" && FU_OBJECTID_FIELDS.has(k)) return; // skip empty ObjectId
    target[k] = src[k];
  });
};

// Mirror follow-up assignees onto the subject's worker list (additive —
// a worker stays assigned to the person even if later follow-ups differ).
const syncSubjectWorkers = async (followUp) => {
  const ids = (Array.isArray(followUp.assignedTo) ? followUp.assignedTo : followUp.assignedTo ? [followUp.assignedTo] : [])
    .map((m) => String(m?._id || m))
    .filter(Boolean);
  if (!ids.length) return;
  const Subject = followUp.visitor ? Visitor : followUp.prospect ? OutreachProspect : null;
  const subjectId = followUp.visitor || followUp.prospect;
  if (!Subject || !subjectId) return;
  const subject = await Subject.findById(subjectId);
  if (!subject) return;
  const existing = new Set((subject.assignedFollowUpWorkers || []).map((w) => String(w.member)));
  let changed = false;
  ids.forEach((id) => {
    if (!existing.has(id)) {
      subject.assignedFollowUpWorkers.push({ member: id, assignedAt: new Date() });
      changed = true;
    }
  });
  if (changed) await subject.save();
};

const populateFU = (query) =>
  query
    .populate("prospect", "firstName lastName phone stage")
    .populate("visitor", "fullName phoneNumber status")
    .populate("member", "firstName lastName phoneNumber")
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
    const { status, eventId, assignedTo, assigned, dateFrom, dateTo, subject } = req.query;

    const filter = { church: churchId };
    if (status) filter.status = status;
    if (eventId) filter.outreachEvent = eventId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (subject === "prospect") filter.prospect = { $ne: null };
    else if (subject === "visitor") filter.visitor = { $ne: null };
    else if (subject === "member") filter.member = { $ne: null };
    // assignedTo is an array — legacy docs hold a scalar; both are covered
    if (assigned === "assigned") filter.assignedTo = { $ne: null, $not: { $size: 0 } };
    else if (assigned === "unassigned") filter.$or = [{ assignedTo: null }, { assignedTo: { $size: 0 } }];
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const pctChange = (current, previous) => {
      const c = Number(current || 0);
      const p = Number(previous || 0);
      if (!p) return c ? 100 : 0;
      return ((c - p) / p) * 100;
    };

    const [
      overdue, dueToday, upcoming, completedThisMonth,
      overdueLastMonth, completedLastMonth,
    ] = await Promise.all([
      OutreachFollowUp.countDocuments({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $lt: todayStart } }),
      OutreachFollowUp.countDocuments({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $gte: todayStart, $lte: todayEnd } }),
      OutreachFollowUp.countDocuments({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $gt: todayEnd, $lte: in7Days } }),
      OutreachFollowUp.countDocuments({ church: churchId, status: "completed", updatedAt: { $gte: startOfMonth } }),
      OutreachFollowUp.countDocuments({ church: churchId, status: { $in: activeStatuses }, scheduledDate: { $lt: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()) } }),
      OutreachFollowUp.countDocuments({ church: churchId, status: "completed", updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
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
      data: {
        overdue, dueToday, upcoming, completedThisMonth,
        overdueList, todayList, upcomingList,
        change: {
          overdue: pctChange(overdue, overdueLastMonth),
          completedThisMonth: pctChange(completedThisMonth, completedLastMonth),
        },
        diff: {
          overdue: overdue - overdueLastMonth,
          completedThisMonth: completedThisMonth - completedLastMonth,
        },
      },
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
    const { outreachEvent, scheduledDate, type, assignedTo } = req.body;
    if (!outreachEvent || !scheduledDate) {
      return res.status(400).json({ message: "outreachEvent and scheduledDate are required" });
    }
    if (!Array.isArray(assignedTo) || !assignedTo.length) {
      return res.status(400).json({ message: "assignedTo is required — assign at least one member" });
    }

    const prospect = await OutreachProspect.findOne({ _id: prospectId, church: req.activeChurch._id });
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });

    const payload = { church: req.activeChurch._id, prospect: prospectId, outreachEvent, createdBy: req.user._id };
    setAllowed(req.body, payload);
    payload.status = payload.status || "pending";

    const followUp = await OutreachFollowUp.create(payload);
    await syncSubjectWorkers(followUp);

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

// ── Follow-ups by visitor ─────────────────────────────────────────
// Visitors aren't prospects, but they share the same follow-up engine —
// one collection, the subject just points at the visitor instead.
export const getFollowUpsByVisitor = async (req, res) => {
  try {
    const visitorId = req.params.visitorId || req.params.id;
    const visitor = await Visitor.findOne({ _id: visitorId, church: req.activeChurch._id }).select("linkedProspect").lean();
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });
    // One person, one history — follow-ups recorded while they were still
    // an outreach prospect belong in the same list.
    const subjectQuery = visitor.linkedProspect
      ? { $or: [{ visitor: visitorId }, { prospect: visitor.linkedProspect }] }
      : { visitor: visitorId };
    const followUps = await populateFU(
      OutreachFollowUp.find({ church: req.activeChurch._id, ...subjectQuery }).sort({ createdAt: -1 }).lean()
    );
    return res.status(200).json({ message: "Follow-ups fetched", data: followUps });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Create follow-up for a visitor ────────────────────────────────
export const createVisitorFollowUp = async (req, res) => {
  try {
    const visitorId = req.params.visitorId || req.params.id;
    const { scheduledDate, outreachEvent, assignedTo } = req.body;
    if (!scheduledDate) {
      return res.status(400).json({ message: "scheduledDate is required" });
    }
    if (!Array.isArray(assignedTo) || !assignedTo.length) {
      return res.status(400).json({ message: "assignedTo is required — assign at least one member" });
    }

    const visitor = await Visitor.findOne({ _id: visitorId, church: req.activeChurch._id });
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const payload = { church: req.activeChurch._id, visitor: visitorId, createdBy: req.user._id };
    if (outreachEvent) payload.outreachEvent = outreachEvent; // optional context
    setAllowed(req.body, payload);
    payload.status = payload.status || "pending";

    const followUp = await OutreachFollowUp.create(payload);
    await syncSubjectWorkers(followUp);

    visitor.nextFollowUpDate = req.body.nextFollowUpDate
      ? new Date(req.body.nextFollowUpDate)
      : new Date(scheduledDate);
    await visitor.save();

    return res.status(201).json({ message: "Follow-up scheduled", data: followUp });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Create follow-up for a member ─────────────────────────────────
// Members get followed up too (sick visits, absentee check-ins…) — same
// engine, subject = member, no outreach event needed.
export const createMemberFollowUp = async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const { scheduledDate, outreachEvent, assignedTo } = req.body;
    if (!scheduledDate) {
      return res.status(400).json({ message: "scheduledDate is required" });
    }
    if (!Array.isArray(assignedTo) || !assignedTo.length) {
      return res.status(400).json({ message: "assignedTo is required — assign at least one member" });
    }

    const member = await Member.findOne({ _id: memberId, church: req.activeChurch._id }).select("_id");
    if (!member) return res.status(404).json({ message: "Member not found" });

    const payload = { church: req.activeChurch._id, member: memberId, createdBy: req.user._id };
    if (outreachEvent) payload.outreachEvent = outreachEvent; // optional context
    setAllowed(req.body, payload);
    payload.status = payload.status || "pending";

    const followUp = await OutreachFollowUp.create(payload);
    await syncSubjectWorkers(followUp);

    return res.status(201).json({ message: "Follow-up scheduled", data: followUp });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Update follow-up ──────────────────────────────────────────────
export const updateFollowUp = async (req, res) => {
  try {
    // assignees are required — an explicit empty array would strip them
    if (req.body.assignedTo !== undefined && (!Array.isArray(req.body.assignedTo) || !req.body.assignedTo.length)) {
      return res.status(400).json({ message: "assignedTo is required — assign at least one member" });
    }
    const update = {};
    setAllowed(req.body, update);

    const followUp = await OutreachFollowUp.findOneAndUpdate(
      { _id: req.params.followUpId, church: req.activeChurch._id },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!followUp) return res.status(404).json({ message: "Follow-up not found" });

    if (update.assignedTo !== undefined) await syncSubjectWorkers(followUp);

    if (update.nextFollowUpDate) {
      const next = new Date(update.nextFollowUpDate);
      if (followUp.prospect) {
        await OutreachProspect.findByIdAndUpdate(followUp.prospect, { nextFollowUpDate: next });
      } else if (followUp.visitor) {
        await Visitor.findByIdAndUpdate(followUp.visitor, { nextFollowUpDate: next });
      }
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
