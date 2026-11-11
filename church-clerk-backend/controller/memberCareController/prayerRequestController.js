import PrayerRequest from "../../models/memberCareModel/prayerRequestModel.js";
import Member from "../../models/memberModel.js";
import { annotateDeletable } from "../../services/recordDependencyService.js";
import { canSeeConfidential } from "./memberCareAccess.js";

const PR_ALLOWED = [
  "member",
  "requesterName",
  "request",
  "category",
  "status",
  "isPrivate",
  "answerNote"
];

const setAllowed = (src, target) => {
  PR_ALLOWED.forEach((k) => {
    if (src[k] === undefined) return;
    if (k === "member" && src[k] === "") {
      target[k] = null;
      return;
    }
    target[k] = src[k];
  });
};

const populateRequest = (query) =>
  query
    .populate("member", "firstName lastName phoneNumber photoUrl")
    .populate("createdBy", "fullName");

const pagination = (total, pageNum, limitNum) => {
  const totalPages = Math.ceil(total / limitNum) || 0;
  return {
    totalResult: total,
    totalPages,
    currentPage: pageNum,
    hasPrev: pageNum > 1,
    hasNext: pageNum < totalPages,
    prevPage: pageNum > 1 ? pageNum - 1 : null,
    nextPage: pageNum < totalPages ? pageNum + 1 : null
  };
};

export const getAllPrayerRequests = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const { status, category, search } = req.query;

    const query = { church: churchId };
    if (!canSeeConfidential(req)) query.isPrivate = { $ne: true };
    if (status) query.status = status;
    if (category) query.category = category;

    if (search && String(search).trim()) {
      const term = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = { $regex: term, $options: "i" };
      const memberIds = await Member.find({
        church: churchId,
        $or: [{ firstName: rx }, { lastName: rx }, { phoneNumber: rx }]
      })
        .select("_id")
        .lean();
      query.$or = [
        { request: rx },
        { requesterName: rx },
        { referenceId: rx },
        { member: { $in: memberIds.map((m) => m._id) } }
      ];
    }

    const [requests, total] = await Promise.all([
      populateRequest(PrayerRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()),
      PrayerRequest.countDocuments(query)
    ]);

    return res.status(200).json({
      message: "Prayer requests fetched successfully",
      pagination: pagination(total, pageNum, limitNum),
      count: requests.length,
      prayerRequests: await annotateDeletable("prayerRequest", requests, churchId)
    });
  } catch (error) {
    return res.status(400).json({ message: "Prayer requests could not be fetched", error: error.message });
  }
};

export const createPrayerRequest = async (req, res) => {
  try {
    const memberId = req.body.memberId || req.body.member || null;
    const requesterName = String(req.body.requesterName || "").trim();

    if (memberId) {
      const member = await Member.findOne({ _id: memberId, church: req.activeChurch._id }).select("_id");
      if (!member) return res.status(404).json({ message: "Member not found" });
    } else if (!requesterName) {
      return res.status(400).json({ message: "Select a member or provide a requester name" });
    }

    const payload = {
      church: req.activeChurch._id,
      createdBy: req.user._id
    };
    setAllowed(req.body, payload);
    payload.member = memberId || null;

    const prayerRequest = await PrayerRequest.create(payload);
    const populated = await populateRequest(PrayerRequest.findById(prayerRequest._id).lean());
    return res.status(201).json({ message: "Prayer request created successfully", prayerRequest: populated });
  } catch (error) {
    return res.status(400).json({ message: "Prayer request could not be created", error: error.message });
  }
};

export const updatePrayerRequest = async (req, res) => {
  try {
    const query = { _id: req.params.requestId, church: req.activeChurch._id };
    if (!canSeeConfidential(req)) query.isPrivate = { $ne: true };

    const update = {};
    setAllowed(req.body, update);

    if (update.status === "answered") {
      update.answeredDate = new Date();
    } else if (update.status === "active" || update.status === "archived") {
      update.answeredDate = null;
    }

    const prayerRequest = await PrayerRequest.findOneAndUpdate(query, { $set: update }, { new: true, runValidators: true });
    if (!prayerRequest) return res.status(404).json({ message: "Prayer request not found" });

    const populated = await populateRequest(PrayerRequest.findById(prayerRequest._id).lean());
    return res.status(200).json({ message: "Prayer request updated successfully", prayerRequest: populated });
  } catch (error) {
    return res.status(400).json({ message: "Prayer request could not be updated", error: error.message });
  }
};

export const deletePrayerRequest = async (req, res) => {
  try {
    const query = { _id: req.params.requestId, church: req.activeChurch._id };
    if (!canSeeConfidential(req)) query.isPrivate = { $ne: true };

    const prayerRequest = await PrayerRequest.findOneAndDelete(query);
    if (!prayerRequest) return res.status(404).json({ message: "Prayer request not found" });

    return res.status(200).json({ message: "Prayer request deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: "Prayer request could not be deleted", error: error.message });
  }
};
