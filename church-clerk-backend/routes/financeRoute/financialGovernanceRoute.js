import express from "express";
import { protectAdmin } from "../../middleware/authMiddleware.js";
import requireSystemRole from "../../middleware/requireSystemRole.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import ApprovalRequest from "../../models/financeModel/governance/approvalRequestModel.js";
import { approveRequest, rejectRequest } from "../../services/finance/governanceService.js";

const router = express.Router();

// Approval queue
router.get(
  "/governance/approvals",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemSupport", "read"),
  async (req, res) => {
    try {
      const { status = "PENDING_APPROVAL", page = 1, limit = 20 } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const skip = (pageNum - 1) * limitNum;

      const query = {};
      if (status) query.status = status;

      const [rows, total] = await Promise.all([
        ApprovalRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        ApprovalRequest.countDocuments(query)
      ]);

      return res.json({
        message: "Approval requests fetched",
        status: "OK",
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

router.post(
  "/governance/approvals/:id/approve",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemSupport", "update"),
  async (req, res) => {
    try {
      const result = await approveRequest({ requestId: req.params.id, approverId: req.user._id });
      return res.json({ message: "Request approved", ...result });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/governance/approvals/:id/reject",
  protectAdmin,
  attachPermissions,
  requireSystemRole,
  requirePermission("systemSupport", "update"),
  async (req, res) => {
    try {
      const result = await rejectRequest({ requestId: req.params.id, approverId: req.user._id, reason: req.body?.reason });
      return res.json({ message: "Request rejected", ...result });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

export default router;
