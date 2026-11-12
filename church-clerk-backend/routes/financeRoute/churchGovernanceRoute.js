import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import ApprovalRequest from "../../models/financeModel/governance/approvalRequestModel.js";
import Church from "../../models/churchModel.js";
import { getChurchGovernanceFlags } from "../../services/finance/governanceService.js";
import { approveRequest, rejectRequest } from "../../services/finance/governanceService.js";

const router = express.Router();

// GET /api/v1/church-governance — list approval requests for this church
router.get(
  "/",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financeGovernance", "read"),
  async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const skip = (pageNum - 1) * limitNum;

      const query = { church: req.activeChurch._id };
      if (status) query.status = status;

      const [rows, total] = await Promise.all([
        ApprovalRequest.find(query)
          .populate("requestedBy", "fullName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        ApprovalRequest.countDocuments(query)
      ]);

      return res.json({
        approvals: rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.max(1, Math.ceil(total / limitNum))
        }
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/v1/church-governance/flags — this church's governance rules
router.get(
  "/flags",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financeGovernance", "read"),
  async (req, res) => {
    try {
      return res.json(getChurchGovernanceFlags(req.activeChurch));
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

// PATCH /api/v1/church-governance/flags — per-church preference; both flags
// default ON for churches that never set them.
router.patch(
  "/flags",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financeGovernance", "update"),
  async (req, res) => {
    try {
      const { enforceBackdating, enforceImmutability } = req.body || {};
      const update = {};
      if (enforceBackdating !== undefined) update["governance.enforceBackdating"] = Boolean(enforceBackdating);
      if (enforceImmutability !== undefined) update["governance.enforceImmutability"] = Boolean(enforceImmutability);
      if (!Object.keys(update).length) return res.status(400).json({ message: "Nothing to update" });
      const church = await Church.findByIdAndUpdate(req.activeChurch._id, { $set: update }, { new: true }).select("governance").lean();
      return res.json(getChurchGovernanceFlags(church));
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/v1/church-governance/:id/approve
router.post(
  "/:id/approve",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financeGovernance", "approve"),
  async (req, res) => {
    try {
      const existing = await ApprovalRequest.findOne({ _id: req.params.id, church: req.activeChurch._id });
      if (!existing) return res.status(404).json({ message: "Approval request not found" });
      const result = await approveRequest({ requestId: req.params.id, approverId: req.user._id });
      return res.json({ message: "Request approved", ...result });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

// POST /api/v1/church-governance/:id/reject
router.post(
  "/:id/reject",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financeGovernance", "approve"),
  async (req, res) => {
    try {
      const existing = await ApprovalRequest.findOne({ _id: req.params.id, church: req.activeChurch._id });
      if (!existing) return res.status(404).json({ message: "Approval request not found" });
      const result = await rejectRequest({ requestId: req.params.id, approverId: req.user._id, reason: req.body?.reason });
      return res.json({ message: "Request rejected", ...result });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

// GET /api/v1/church-governance/stats — badge count of pending
router.get(
  "/stats",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchclerkadmin"),
  requirePermission("financeGovernance", "read"),
  async (req, res) => {
    try {
      const pending = await ApprovalRequest.countDocuments({ church: req.activeChurch._id, status: "PENDING_APPROVAL" });
      return res.json({ pending });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

export default router;
