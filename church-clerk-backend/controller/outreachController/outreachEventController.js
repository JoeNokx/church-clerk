import OutreachEvent from "../../models/outreachModel/outreachEventModel.js";
import OutreachProspect from "../../models/outreachModel/outreachProspectModel.js";
import OutreachFollowUp from "../../models/outreachModel/outreachFollowUpModel.js";

export const getAllOutreachEvents = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const { search, status, type, dateFrom, dateTo } = req.query;

    const filter = { church: churchId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { referenceId: { $regex: search, $options: "i" } },
      ];
    }
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo + "T23:59:59.999Z");
    }

    const [events, total] = await Promise.all([
      OutreachEvent.find(filter)
        .populate("teamLeader", "firstName lastName photoUrl")
        .populate("teamMembers", "firstName lastName photoUrl")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OutreachEvent.countDocuments(filter),
    ]);

    const eventIds = events.map((e) => e._id);
    const prospectAgg = await OutreachProspect.aggregate([
      { $match: { outreachEvent: { $in: eventIds }, church: churchId } },
      {
        $group: {
          _id: "$outreachEvent",
          count: { $sum: 1 },
          decisions: { $sum: { $cond: [{ $ne: ["$decision", "none"] }, 1, 0] } },
        },
      },
    ]);
    const countMap = Object.fromEntries(
      prospectAgg.map((c) => [String(c._id), { count: c.count, decisions: c.decisions }])
    );

    const data = events.map((e) => ({
      ...e,
      prospectCount: countMap[String(e._id)]?.count || 0,
      decisionCount: countMap[String(e._id)]?.decisions || 0,
    }));

    return res.status(200).json({
      message: "Events fetched",
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOutreachEventById = async (req, res) => {
  try {
    const event = await OutreachEvent.findOne({ _id: req.params.id, church: req.activeChurch._id })
      .populate("coordinator", "firstName lastName photoUrl")
      .populate("teamLeader", "firstName lastName photoUrl")
      .populate("teamMembers", "firstName lastName photoUrl")
      .populate({ path: "teams", populate: { path: "members.member", select: "firstName lastName phoneNumber address community photoUrl" } })
      .populate("createdBy", "firstName lastName");

    if (!event) return res.status(404).json({ message: "Event not found" });

    const [prospectCount, decisionCount] = await Promise.all([
      OutreachProspect.countDocuments({ outreachEvent: event._id, church: req.activeChurch._id }),
      OutreachProspect.countDocuments({ outreachEvent: event._id, church: req.activeChurch._id, decision: { $ne: "none" } }),
    ]);

    return res.status(200).json({ message: "Event fetched", data: { ...event.toObject(), prospectCount, decisionCount } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const EVENT_ALLOWED = [
  "title", "date", "endDate", "startTime", "endTime", "location", "area",
  "type", "description", "objective", "targetCount", "notes",
  "coordinator", "teams", "teamLeader", "teamMembers", "teamRoles", "status",
];

export const createOutreachEvent = async (req, res) => {
  try {
    if (!req.body.title || !req.body.date) return res.status(400).json({ message: "title and date are required" });
    const payload = { church: req.activeChurch._id, createdBy: req.user._id };
    EVENT_ALLOWED.forEach((k) => { if (req.body[k] !== undefined) payload[k] = req.body[k]; });
    if (!payload.status) payload.status = "planned";
    if (payload.coordinator && !Array.isArray(payload.coordinator)) payload.coordinator = [payload.coordinator].filter(Boolean);
    if (payload.teams && !Array.isArray(payload.teams)) payload.teams = [payload.teams].filter(Boolean);
    if (payload.teamMembers && !Array.isArray(payload.teamMembers)) payload.teamMembers = [];
    const event = await OutreachEvent.create(payload);
    return res.status(201).json({ message: "Outreach event created", data: event });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateOutreachEvent = async (req, res) => {
  try {
    const update = {};
    EVENT_ALLOWED.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    if (update.coordinator && !Array.isArray(update.coordinator)) update.coordinator = [update.coordinator].filter(Boolean);
    if (update.teams && !Array.isArray(update.teams)) update.teams = [update.teams].filter(Boolean);
    const event = await OutreachEvent.findOneAndUpdate(
      { _id: req.params.id, church: req.activeChurch._id },
      { $set: update },
      { new: true, runValidators: true }
    ).populate("coordinator", "firstName lastName").populate("teams", "name");
    if (!event) return res.status(404).json({ message: "Event not found" });
    return res.status(200).json({ message: "Event updated", data: event });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteOutreachEvent = async (req, res) => {
  try {
    const event = await OutreachEvent.findOneAndDelete({ _id: req.params.id, church: req.activeChurch._id });
    if (!event) return res.status(404).json({ message: "Event not found" });
    await OutreachFollowUp.deleteMany({ outreachEvent: event._id });
    await OutreachProspect.deleteMany({ outreachEvent: event._id });
    return res.status(200).json({ message: "Event deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOutreachKPI = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const pctChange = (current, previous) => {
      const c = Number(current || 0);
      const p = Number(previous || 0);
      if (!p) return c ? 100 : 0;
      return ((c - p) / p) * 100;
    };

    const [
      totalEvents,
      eventsThisMonth,
      eventsLastMonth,
      totalProspects,
      prospectsThisMonth,
      prospectsLastMonth,
      totalDecisions,
      decisionsThisMonth,
      decisionsLastMonth,
      followUpsDue,
      followUpsDueLastMonth,
    ] = await Promise.all([
      OutreachEvent.countDocuments({ church: churchId }),
      OutreachEvent.countDocuments({ church: churchId, date: { $gte: startOfMonth, $lte: endOfMonth } }),
      OutreachEvent.countDocuments({ church: churchId, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      OutreachProspect.countDocuments({ church: churchId }),
      OutreachProspect.countDocuments({ church: churchId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      OutreachProspect.countDocuments({ church: churchId, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      OutreachProspect.countDocuments({ church: churchId, decision: { $ne: "none" } }),
      OutreachProspect.countDocuments({ church: churchId, decision: { $ne: "none" }, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      OutreachProspect.countDocuments({ church: churchId, decision: { $ne: "none" }, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      OutreachFollowUp.countDocuments({
        church: churchId,
        nextFollowUpDate: { $lte: now },
        outcome: { $in: ["not-reached", "interested"] },
      }),
      OutreachFollowUp.countDocuments({
        church: churchId,
        nextFollowUpDate: { $lte: endOfLastMonth },
        outcome: { $in: ["not-reached", "interested"] },
      }),
    ]);

    return res.status(200).json({
      message: "KPI fetched",
      data: {
        totalEvents, eventsThisMonth,
        totalProspects, prospectsThisMonth,
        totalDecisions,
        followUpsDue,
        change: {
          totalEvents: pctChange(eventsThisMonth, eventsLastMonth),
          totalProspects: pctChange(prospectsThisMonth, prospectsLastMonth),
          totalDecisions: pctChange(decisionsThisMonth, decisionsLastMonth),
        },
        diff: {
          totalEvents: eventsThisMonth - eventsLastMonth,
          totalProspects: prospectsThisMonth - prospectsLastMonth,
          totalDecisions: decisionsThisMonth - decisionsLastMonth,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
