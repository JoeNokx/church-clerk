import mongoose from "mongoose";

const financialAuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, trim: true },

    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true, index: true },
    module: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: false, default: null },

    meta: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("FinancialAuditLog", financialAuditLogSchema);
