import mongoose from "mongoose";

const ADJUSTMENT_STATUSES = ["APPLIED", "PENDING_APPROVAL", "REJECTED"];
const IMPACT_LEVELS = ["MINOR", "HIGH"];

const financialAdjustmentSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true, index: true },
    module: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    originalId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    originalSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    correctedFields: { type: mongoose.Schema.Types.Mixed, required: true },
    difference: { type: mongoose.Schema.Types.Mixed, default: null },

    reason: { type: String, trim: true, required: true },

    impactLevel: { type: String, enum: IMPACT_LEVELS, required: true },
    status: { type: String, enum: ADJUSTMENT_STATUSES, default: "PENDING_APPROVAL", index: true },

    approvalRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "ApprovalRequest", default: null },
    appliedAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const AdjustmentStatuses = Object.freeze({
  APPLIED: "APPLIED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  REJECTED: "REJECTED"
});

export const ImpactLevels = Object.freeze({
  MINOR: "MINOR",
  HIGH: "HIGH"
});

export default mongoose.model("FinancialAdjustment", financialAdjustmentSchema);
