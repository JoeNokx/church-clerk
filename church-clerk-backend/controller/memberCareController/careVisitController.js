import CareCase from "../../models/memberCareModel/careCaseModel.js";
import CareVisit from "../../models/memberCareModel/careVisitModel.js";
import Member from "../../models/memberModel.js";
import { annotateDeletable } from "../../services/recordDependencyService.js";
import { canSeeConfidential, confidentialCaseIds } from "./memberCareAccess.js";

const VISIT_ALLOWED = ["visitType", "visitDate", "conductedBy", "notes", "outcome", "nextFollowUpDate"];

const setAllowed = (src, target) => {
  VISIT_ALLOWED.forEach((k) => {
    if (src[k] === undefined) return;
    if (k === "conductedBy") {
      if (src[k] === "") return;
      target[k] = Array.isArray(src[k]) ? src[k] : [src[k]];
      return;
    }
    target[k] = src[k];
  });
};

const populateVisit = (query) =>
  query
    .populate("careCase", "title category status confidential")
    .populate("member", "firstName lastName phoneNumber photoUrl")
    .populate("conductedBy", "firstName lastName photoUrl")
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

// Resolve a visible case or null (confidential cases read as "not found"
// for non-privileged users so their existence isn't revealed).
const findVisibleCase = async (req, caseId) => {
  const query = { _id: caseId, church: req.activeChurch._id };
  if (!canSeeConfidential(req)) query.confidential = { $ne: true };
  return CareCase.findOne(query);
};

export const getAllCareVisits = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const { visitType, outcome, member, careCase, search, dateFrom, dateTo } = req.query;

    const query = { church: churchId };

    if (!canSeeConfidential(req)) {
      const hidden = await confidentialCaseIds(churchId);
      if (hidden.length) query.careCase = { $nin: hidden };
    }

    if (visitType) query.visitType = visitType;
    if (outcome) query.outcome = outcome;
    if (member) query.member = member;
    if (careCase) query.careCase = careCase;

    if (search && String(search).trim()) {
      const term = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = { $regex: term, $options: "i" };
      const memberIds = await Member.find({
        church: churchId,
        $or: [{ firstName: rx }, { lastName: rx }, { phoneNumber: rx }]
      })
        .select("_id")
        .lean();
      query.member = { $in: memberIds.map((m) => m._id).concat([null]) };
    }

    if (dateFrom || dateTo) {
      query.visitDate = {};
      if (dateFrom) query.visitDate.$gte = new Date(dateFrom);
      if (dateTo) query.visitDate.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const [visits, total] = await Promise.all([
      populateVisit(CareVisit.find(query).sort({ visitDate: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean()),
      CareVisit.countDocuments(query)
    ]);

    return res.status(200).json({
      message: "Care visits fetched successfully",
      pagination: pagination(total, pageNum, limitNum),
      count: visits.length,
      careVisits: await annotateDeletable("careVisit", visits, churchId)
    });
  } catch (error) {
    return res.status(400).json({ message: "Care visits could not be fetched", error: error.message });
  }
};

export const getVisitsByCase = async (req, res) => {
  try {
    const careCase = await findVisibleCase(req, req.params.caseId);
    if (!careCase) return res.status(404).json({ message: "Care case not found" });

    const visits = await populateVisit(
      CareVisit.find({ church: req.activeChurch._id, careCase: careCase._id })
        .sort({ visitDate: -1, createdAt: -1 })
        .lean()
    );

    return res.status(200).json({
      message: "Care visits fetched successfully",
      count: visits.length,
      careVisits: await annotateDeletable("careVisit", visits, req.activeChurch._id)
    });
  } catch (error) {
    return res.status(400).json({ message: "Care visits could not be fetched", error: error.message });
  }
};

export const createCareVisit = async (req, res) => {
  try {
    const careCase = await findVisibleCase(req, req.params.caseId);
    if (!careCase) return res.status(404).json({ message: "Care case not found" });
    if (!req.body.visitDate) return res.status(400).json({ message: "visitDate is required" });

    const payload = {
      church: req.activeChurch._id,
      careCase: careCase._id,
      member: careCase.member,
      createdBy: req.user._id
    };
    setAllowed(req.body, payload);

    const visit = await CareVisit.create(payload);

    // A logged visit means the case is actively being worked.
    if (careCase.status === "open") careCase.status = "in-progress";
    if (payload.nextFollowUpDate) careCase.nextFollowUpDate = new Date(payload.nextFollowUpDate);
    if (careCase.isModified()) await careCase.save();

    const populated = await populateVisit(CareVisit.findById(visit._id).lean());
    return res.status(201).json({ message: "Care visit logged successfully", careVisit: populated });
  } catch (error) {
    return res.status(400).json({ message: "Care visit could not be created", error: error.message });
  }
};

export const updateCareVisit = async (req, res) => {
  try {
    const visit = await CareVisit.findOne({ _id: req.params.visitId, church: req.activeChurch._id });
    if (!visit) return res.status(404).json({ message: "Care visit not found" });

    if (!canSeeConfidential(req)) {
      const hidden = await confidentialCaseIds(req.activeChurch._id);
      if (hidden.map(String).includes(String(visit.careCase))) {
        return res.status(404).json({ message: "Care visit not found" });
      }
    }

    const update = {};
    setAllowed(req.body, update);

    const updated = await CareVisit.findOneAndUpdate(
      { _id: visit._id, church: req.activeChurch._id },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (update.nextFollowUpDate) {
      await CareCase.findByIdAndUpdate(visit.careCase, { nextFollowUpDate: new Date(update.nextFollowUpDate) });
    }

    const populated = await populateVisit(CareVisit.findById(updated._id).lean());
    return res.status(200).json({ message: "Care visit updated successfully", careVisit: populated });
  } catch (error) {
    return res.status(400).json({ message: "Care visit could not be updated", error: error.message });
  }
};

export const deleteCareVisit = async (req, res) => {
  try {
    const visit = await CareVisit.findOne({ _id: req.params.visitId, church: req.activeChurch._id });
    if (!visit) return res.status(404).json({ message: "Care visit not found" });

    if (!canSeeConfidential(req)) {
      const hidden = await confidentialCaseIds(req.activeChurch._id);
      if (hidden.map(String).includes(String(visit.careCase))) {
        return res.status(404).json({ message: "Care visit not found" });
      }
    }

    await CareVisit.findOneAndDelete({ _id: visit._id, church: req.activeChurch._id });
    return res.status(200).json({ message: "Care visit deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: "Care visit could not be deleted", error: error.message });
  }
};
