import OutreachProspect from "../../models/outreachModel/outreachProspectModel.js";
import OutreachFollowUp from "../../models/outreachModel/outreachFollowUpModel.js";
import Member from "../../models/memberModel.js";
import Visitor from "../../models/visitorsModel.js";

const PROSPECT_ALLOWED_FIELDS = [
  "firstName", "lastName", "phone", "alternativePhone", "email",
  "gender", "ageGroup", "occupation", "address", "community",
  "preferredContact", "howReached", "existingChurchStatus",
  "heardGospel", "acceptedChrist", "rededication", "wantsPrayer",
  "wantsToVisitChurch", "alreadyChristian", "notInterested",
  "decision", "interestLevel", "stage", "dateReached",
  "nextFollowUpDate", "notes", "recordedBy",
];

const populateProspect = (query) =>
  query
    .populate("recordedBy", "firstName lastName photoUrl")
    .populate("outreachEvent", "title date type")
    .populate("assignedFollowUpWorkers.member", "firstName lastName photoUrl phoneNumber")
    .populate("linkedMember", "firstName lastName memberId")
    .populate("linkedVisitor", "fullName phoneNumber");

// ── All prospects (cross-event) ───────────────────────────────────
export const getAllProspects = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const skip = (page - 1) * limit;
    const { search, stage, eventId, decision, dateFrom, dateTo } = req.query;

    const filter = { church: churchId };
    if (stage) filter.stage = stage;
    if (eventId) filter.outreachEvent = eventId;
    if (decision) filter.decision = decision;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { community: { $regex: search, $options: "i" } },
      ];
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z");
    }

    const [prospects, total] = await Promise.all([
      populateProspect(OutreachProspect.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()),
      OutreachProspect.countDocuments(filter),
    ]);

    const prospectIds = prospects.map((p) => p._id);
    const followUpAgg = await OutreachFollowUp.aggregate([
      { $match: { prospect: { $in: prospectIds }, church: churchId } },
      { $group: { _id: "$prospect", count: { $sum: 1 }, latestStatus: { $last: "$status" } } },
    ]);
    const fuMap = Object.fromEntries(followUpAgg.map((f) => [String(f._id), f]));

    const data = prospects.map((p) => ({
      ...p,
      followUpCount: fuMap[String(p._id)]?.count || 0,
      latestFollowUpStatus: fuMap[String(p._id)]?.latestStatus || null,
    }));

    return res.status(200).json({
      message: "Prospects fetched",
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Prospects by event ────────────────────────────────────────────
export const getProspectsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, stage, decision } = req.query;
    const filter = { church: req.activeChurch._id, outreachEvent: eventId };

    if (stage) filter.stage = stage;
    if (decision) filter.decision = decision;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const prospects = await populateProspect(OutreachProspect.find(filter).sort({ createdAt: -1 }).lean());

    const prospectIds = prospects.map((p) => p._id);
    const followUpCounts = await OutreachFollowUp.aggregate([
      { $match: { prospect: { $in: prospectIds }, church: req.activeChurch._id } },
      { $group: { _id: "$prospect", count: { $sum: 1 } } },
    ]);
    const fuMap = Object.fromEntries(followUpCounts.map((f) => [String(f._id), f.count]));

    const data = prospects.map((p) => ({ ...p, followUpCount: fuMap[String(p._id)] || 0 }));
    return res.status(200).json({ message: "Prospects fetched", data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Single prospect ───────────────────────────────────────────────
export const getProspectById = async (req, res) => {
  try {
    const prospect = await populateProspect(
      OutreachProspect.findOne({ _id: req.params.prospectId, church: req.activeChurch._id })
    );
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });

    const followUps = await OutreachFollowUp.find({ prospect: prospect._id, church: req.activeChurch._id })
      .populate("assignedTo", "firstName lastName")
      .populate("conductedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ message: "Prospect fetched", data: { ...prospect.toObject ? prospect.toObject() : prospect, followUps } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Duplicate check ───────────────────────────────────────────────
export const checkDuplicate = async (req, res) => {
  try {
    const { phone, email, firstName, lastName } = req.query;
    const churchId = req.activeChurch._id;
    const orClauses = [];

    if (phone) orClauses.push({ phone: phone.trim() }, { alternativePhone: phone.trim() });
    if (email) orClauses.push({ email: email.trim().toLowerCase() });
    if (firstName && lastName) {
      orClauses.push({
        firstName: { $regex: `^${firstName.trim()}$`, $options: "i" },
        lastName: { $regex: `^${lastName.trim()}$`, $options: "i" },
      });
    }

    if (!orClauses.length) return res.status(200).json({ message: "No criteria", data: [] });

    const duplicates = await OutreachProspect.find({ church: churchId, $or: orClauses })
      .populate("outreachEvent", "title date")
      .select("firstName lastName phone email stage outreachEvent createdAt")
      .limit(5)
      .lean();

    return res.status(200).json({ message: "Duplicate check done", data: duplicates });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Create prospect (nested under event) ─────────────────────────
export const createProspect = async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!req.body.firstName) return res.status(400).json({ message: "firstName is required" });

    const payload = { church: req.activeChurch._id, outreachEvent: eventId, createdBy: req.user._id };
    PROSPECT_ALLOWED_FIELDS.forEach((k) => { if (req.body[k] !== undefined) payload[k] = req.body[k]; });
    if (!payload.dateReached) payload.dateReached = new Date();

    const prospect = await OutreachProspect.create(payload);
    return res.status(201).json({ message: "Person recorded", data: prospect });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Create prospect (direct, event optional) ──────────────────────
export const createProspectDirect = async (req, res) => {
  try {
    if (!req.body.firstName) return res.status(400).json({ message: "firstName is required" });
    const payload = { church: req.activeChurch._id, createdBy: req.user._id };
    if (req.body.outreachEvent) payload.outreachEvent = req.body.outreachEvent;
    PROSPECT_ALLOWED_FIELDS.forEach((k) => { if (req.body[k] !== undefined) payload[k] = req.body[k]; });
    if (!payload.dateReached) payload.dateReached = new Date();
    const prospect = await OutreachProspect.create(payload);
    return res.status(201).json({ message: "Person recorded", data: prospect });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Update prospect ───────────────────────────────────────────────
export const updateProspect = async (req, res) => {
  try {
    const update = {};
    PROSPECT_ALLOWED_FIELDS.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const prospect = await OutreachProspect.findOneAndUpdate(
      { _id: req.params.prospectId, church: req.activeChurch._id },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });
    return res.status(200).json({ message: "Prospect updated", data: prospect });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Assign follow-up worker ───────────────────────────────────────
export const assignFollowUpWorker = async (req, res) => {
  try {
    const { prospectId } = req.params;
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ message: "memberId is required" });

    const prospect = await OutreachProspect.findOne({ _id: prospectId, church: req.activeChurch._id });
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });

    const alreadyAssigned = prospect.assignedFollowUpWorkers.some((w) => String(w.member) === String(memberId));
    if (!alreadyAssigned) {
      prospect.assignedFollowUpWorkers.push({ member: memberId, assignedAt: new Date() });
      await prospect.save();
    }

    return res.status(200).json({ message: "Worker assigned", data: prospect });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Convert to Member ─────────────────────────────────────────────
export const convertToMember = async (req, res) => {
  try {
    const { prospectId } = req.params;
    const churchId = req.activeChurch._id;

    const prospect = await OutreachProspect.findOne({ _id: prospectId, church: churchId });
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });
    if (prospect.convertedToMember) return res.status(400).json({ message: "Already converted to member" });

    const { dateJoined, memberId: customMemberId } = req.body;

    const autoMemberId = customMemberId || `OTR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const newMember = await Member.create({
      church: churchId,
      memberId: autoMemberId,
      firstName: prospect.firstName,
      lastName: prospect.lastName || "—",
      phoneNumber: prospect.phone || "0000000000",
      email: prospect.email,
      gender: prospect.gender,
      ageGroup: prospect.ageGroup,
      occupation: prospect.occupation,
      streetAddress: prospect.address,
      city: prospect.community,
      dateJoined: dateJoined ? new Date(dateJoined) : new Date(),
      status: "active",
      note: `Converted from outreach. ${prospect.notes || ""}`.trim(),
      createdBy: req.user._id,
    });

    prospect.convertedToMember = true;
    prospect.linkedMember = newMember._id;
    prospect.convertedAt = new Date();
    prospect.stage = "member";
    await prospect.save();

    return res.status(200).json({ message: "Converted to member", data: { prospect, member: newMember } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Mark as Visitor ───────────────────────────────────────────────
export const markAsVisitor = async (req, res) => {
  try {
    const { prospectId } = req.params;
    const churchId = req.activeChurch._id;

    const prospect = await OutreachProspect.findOne({ _id: prospectId, church: churchId });
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });
    if (prospect.markedAsVisitor) return res.status(400).json({ message: "Already marked as visitor" });

    const { serviceDate, serviceType, invitedBy } = req.body;

    const newVisitor = await Visitor.create({
      church: churchId,
      fullName: `${prospect.firstName} ${prospect.lastName || ""}`.trim(),
      phoneNumber: prospect.phone || "0000000000",
      email: prospect.email || "",
      location: prospect.community || prospect.address || "Unknown",
      serviceType: serviceType || "Sunday Service",
      serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
      invitedBy: invitedBy || "",
      note: `From outreach. ${prospect.notes || ""}`.trim(),
      createdBy: req.user._id,
    });

    prospect.markedAsVisitor = true;
    prospect.linkedVisitor = newVisitor._id;
    prospect.markedAsVisitorAt = new Date();
    prospect.stage = "visited-church";
    await prospect.save();

    return res.status(200).json({ message: "Marked as visitor", data: { prospect, visitor: newVisitor } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Delete prospect ───────────────────────────────────────────────
export const deleteProspect = async (req, res) => {
  try {
    const prospect = await OutreachProspect.findOneAndDelete({ _id: req.params.prospectId, church: req.activeChurch._id });
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });
    await OutreachFollowUp.deleteMany({ prospect: prospect._id });
    return res.status(200).json({ message: "Person removed" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
