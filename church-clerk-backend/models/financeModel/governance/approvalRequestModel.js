import mongoose from "mongoose";

const APPROVAL_STATUSES = ["PENDING_APPROVAL", "APPROVED", "REJECTED"];
const ACTION_TYPES = ["BACKDATE_CREATE", "ADJUSTMENT_HIGH_IMPACT"];

const approvalRequestSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true, index: true },
    module: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    actionType: { type: String, enum: ACTION_TYPES, required: true },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, trim: true, default: null },

    payload: { type: mongoose.Schema.Types.Mixed, default: null },

    status: { type: String, enum: APPROVAL_STATUSES, default: "PENDING_APPROVAL", index: true },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const ApprovalStatuses = Object.freeze({
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
});

export const ApprovalActionTypes = Object.freeze({
  BACKDATE_CREATE: "BACKDATE_CREATE",
  ADJUSTMENT_HIGH_IMPACT: "ADJUSTMENT_HIGH_IMPACT"
});

export default mongoose.model("ApprovalRequest", approvalRequestSchema);
