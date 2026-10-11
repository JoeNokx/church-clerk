import OrganisationContribution from "../../models/organisationModel/organisationContributionModel.js";
import Cell from "../../models/organisationModel/cellModel.js";
import Department from "../../models/organisationModel/departmentModel.js";
import Ministry from "../../models/organisationModel/ministryModel.js";
import Group from "../../models/organisationModel/groupModel.js";
import Member from "../../models/memberModel.js";
import { escapeRegex } from "../../utils/csvParser.js";

const ENTITY_PARAMS = {
  cellId: { type: "cell", Model: Cell },
  departmentId: { type: "department", Model: Department },
  ministryId: { type: "ministry", Model: Ministry },
  groupId: { type: "group", Model: Group }
};

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"];

async function getScopedEntity(req, res) {
  const churchId = req.activeChurch?._id || req.user?.church;
  for (const [param, cfg] of Object.entries(ENTITY_PARAMS)) {
    const entityId = req.params?.[param];
    if (!entityId) continue;
    const entity = await cfg.Model.findOne({ _id: entityId, church: churchId }).lean();
    if (!entity) {
      res.status(404).json({ message: "Record not found" });
      return null;
    }
    return { entityType: cfg.type, entityId, churchId };
  }
  res.status(400).json({ message: "Organisation entity is required" });
  return null;
}

const createOrgContribution = async (req, res) => {
  try {
    const scope = await getScopedEntity(req, res);
    if (!scope) return;

    const { memberId, amount, date, paymentMethod, note } = req.body || {};

    if (!memberId) {
      return res.status(400).json({ message: "member is required" });
    }
    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "amount is required" });
    }

    const member = await Member.findOne({ _id: memberId, church: scope.churchId }).lean();
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const contribution = await OrganisationContribution.create({
      church: scope.churchId,
      createdBy: req.user._id,
      entityType: scope.entityType,
      entity: scope.entityId,
      member: member._id,
      amount: Number(amount),
      date,
      paymentMethod: PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : "Cash",
      note
    });

    return res.status(201).json({ message: "Contribution recorded successfully", contribution });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getOrgContributions = async (req, res) => {
  try {
    const scope = await getScopedEntity(req, res);
    if (!scope) return;

    const { page = 1, limit = 10, search, dateFrom, dateTo } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { church: scope.churchId, entityType: scope.entityType, entity: scope.entityId };

    if (search && String(search).trim()) {
      const pattern = escapeRegex(String(search).trim());
      const members = await Member.find(
        {
          church: scope.churchId,
          $or: [
            { firstName: { $regex: pattern, $options: "i" } },
            { lastName: { $regex: pattern, $options: "i" } },
            { phoneNumber: { $regex: pattern, $options: "i" } }
          ]
        },
        "_id"
      ).lean();
      query.member = { $in: members.map((m) => m._id) };
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const contributions = await OrganisationContribution.find(query)
      .select("member amount date paymentMethod note referenceId createdBy createdAt")
      .populate("member", "firstName lastName phoneNumber")
      .populate("createdBy", "fullName")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalResult = await OrganisationContribution.countDocuments(query);
    const totalPages = Math.ceil(totalResult / limitNum);

    return res.status(200).json({
      message: "All contributions",
      pagination: {
        totalResult,
        totalPages,
        currentPage: pageNum,
        hasPrev: pageNum > 1,
        hasNext: pageNum < totalPages,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
        nextPage: pageNum < totalPages ? pageNum + 1 : null
      },
      count: contributions.length,
      contributions
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateOrgContribution = async (req, res) => {
  try {
    const scope = await getScopedEntity(req, res);
    if (!scope) return;

    const { contributionId } = req.params;
    const updates = {};
    if (req.body?.amount !== undefined) updates.amount = Number(req.body.amount);
    if (req.body?.date !== undefined) updates.date = req.body.date;
    if (req.body?.note !== undefined) updates.note = req.body.note;
    if (req.body?.paymentMethod !== undefined && PAYMENT_METHODS.includes(req.body.paymentMethod)) {
      updates.paymentMethod = req.body.paymentMethod;
    }

    const contribution = await OrganisationContribution.findOneAndUpdate(
      { _id: contributionId, church: scope.churchId, entityType: scope.entityType, entity: scope.entityId },
      updates,
      { new: true, runValidators: true }
    );

    if (!contribution) {
      return res.status(404).json({ message: "Contribution not found" });
    }

    return res.status(200).json({ message: "Contribution updated successfully", contribution });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const deleteOrgContribution = async (req, res) => {
  try {
    const scope = await getScopedEntity(req, res);
    if (!scope) return;

    const { contributionId } = req.params;
    const contribution = await OrganisationContribution.findOneAndDelete({
      _id: contributionId,
      church: scope.churchId,
      entityType: scope.entityType,
      entity: scope.entityId
    });

    if (!contribution) {
      return res.status(404).json({ message: "Contribution not found" });
    }

    return res.status(200).json({ message: "Contribution deleted successfully", contribution });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export { createOrgContribution, getOrgContributions, updateOrgContribution, deleteOrgContribution };
