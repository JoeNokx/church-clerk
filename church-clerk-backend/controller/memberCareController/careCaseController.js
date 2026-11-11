import CareCase from "../../models/memberCareModel/careCaseModel.js";
import Member from "../../models/memberModel.js";
import { annotateDeletable } from "../../services/recordDependencyService.js";
import { canSeeConfidential } from "./memberCareAccess.js";

const CASE_ALLOWED = [
  "title",
  "category",
  "priority",
  "status",
  "source",
  "confidential",
  "description",
  "assignedTo",
  "dateOpened",
  "nextFollowUpDate",
  "resolutionNotes"
];

const setAllowed = (src, target) => {
  CASE_ALLOWED.forEach((k) => {
    if (src[k] === undefined) return;
    if (k === "assignedTo") {
      if (src[k] === "") return;
      target[k] = Array.isArray(src[k]) ? src[k] : [src[k]];
      return;
    }
    target[k] = src[k];
  });
};

const populateCase = (query) =>
  query
    .populate("member", "firstName lastName phoneNumber email photoUrl status")
    .populate("assignedTo", "firstName lastName photoUrl")
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

export const searchMembersForCare = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    if (!search) {
      return res.status(200).json({ message: "No search term provided", members: [] });
    }

    const regex = { $regex: search, $options: "i" };
    const members = await Member.find({
      church: req.activeChurch._id,
      $or: [
        { firstName: regex },
        { lastName: regex },
        { phoneNumber: regex },
        { email: regex },
        { city: regex },
        { memberId: regex }
      ]
    })
      .select("firstName lastName phoneNumber email city photoUrl")
      .limit(20)
      .lean();

    return res.status(200).json({ message: "Members fetched successfully", members });
  } catch (error) {
    return res.status(400).json({ message: "Members could not be fetched", error: error.message });
  }
};

export const getAllCareCases = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const { status, category, priority, assignedTo, search, dateFrom, dateTo } = req.query;

    const query = { church: churchId };
    if (!canSeeConfidential(req)) query.confidential = { $ne: true };
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

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
        { title: rx },
        { referenceId: rx },
        { member: { $in: memberIds.map((m) => m._id) } }
      ];
    }

    if (dateFrom || dateTo) {
      query.dateOpened = {};
      if (dateFrom) query.dateOpened.$gte = new Date(dateFrom);
      if (dateTo) query.dateOpened.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const [cases, total] = await Promise.all([
      populateCase(CareCase.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()),
      CareCase.countDocuments(query)
    ]);

    return res.status(200).json({
      message: "Care cases fetched successfully",
      pagination: pagination(total, pageNum, limitNum),
      count: cases.length,
      careCases: await annotateDeletable("careCase", cases, churchId)
    });
  } catch (error) {
    return res.status(400).json({ message: "Care cases could not be fetched", error: error.message });
  }
};

export const getCareCaseById = async (req, res) => {
  try {
    const query = { _id: req.params.caseId, church: req.activeChurch._id };
    if (!canSeeConfidential(req)) query.confidential = { $ne: true };

    const careCase = await populateCase(CareCase.findOne(query).lean());
    if (!careCase) return res.status(404).json({ message: "Care case not found" });

    const [row] = await annotateDeletable("careCase", [careCase], req.activeChurch._id);
    return res.status(200).json({ message: "Care case fetched successfully", careCase: row });
  } catch (error) {
    return res.status(400).json({ message: "Care case could not be fetched", error: error.message });
  }
};

export const createCareCase = async (req, res) => {
  try {
    const memberId = req.body.memberId || req.body.member;
    const member = await Member.findOne({ _id: memberId, church: req.activeChurch._id }).select("_id");
    if (!member) return res.status(404).json({ message: "Member not found" });

    const payload = {
      church: req.activeChurch._id,
      member: member._id,
      createdBy: req.user._id
    };
    setAllowed(req.body, payload);

    const careCase = await CareCase.create(payload);
    const populated = await populateCase(CareCase.findById(careCase._id).lean());
    return res.status(201).json({ message: "Care case created successfully", careCase: populated });
  } catch (error) {
    return res.status(400).json({ message: "Care case could not be created", error: error.message });
  }
};

export const updateCareCase = async (req, res) => {
  try {
    const query = { _id: req.params.caseId, church: req.activeChurch._id };
    if (!canSeeConfidential(req)) query.confidential = { $ne: true };

    const update = {};
    setAllowed(req.body, update);

    if (update.status === "resolved" || update.status === "closed") {
      update.dateClosed = new Date();
    } else if (update.status === "open" || update.status === "in-progress") {
      update.dateClosed = null;
    }

    const careCase = await CareCase.findOneAndUpdate(query, { $set: update }, { new: true, runValidators: true });
    if (!careCase) return res.status(404).json({ message: "Care case not found" });

    const populated = await populateCase(CareCase.findById(careCase._id).lean());
    return res.status(200).json({ message: "Care case updated successfully", careCase: populated });
  } catch (error) {
    return res.status(400).json({ message: "Care case could not be updated", error: error.message });
  }
};

export const deleteCareCase = async (req, res) => {
  try {
    const query = { _id: req.params.caseId, church: req.activeChurch._id };
    if (!canSeeConfidential(req)) query.confidential = { $ne: true };

    const careCase = await CareCase.findOneAndDelete(query);
    if (!careCase) return res.status(404).json({ message: "Care case not found" });

    return res.status(200).json({ message: "Care case deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: "Care case could not be deleted", error: error.message });
  }
};
