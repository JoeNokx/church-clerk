// models/MemberStatusHistory.js
// Append-only record of member status transitions.
// Used to reconstruct each member's status at a historical month-end
// boundary for the Members page KPI month-on-month comparisons.
import mongoose from "mongoose";

const MEMBER_STATUSES = ['active', 'dormant', 'transferred', 'left_church', 'deceased', 'temporarily_away', 'inactive', 'visitor', 'former'];

const memberStatusHistorySchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
  fromStatus: { type: String, enum: [...MEMBER_STATUSES, null], default: null },
  toStatus: { type: String, enum: MEMBER_STATUSES, required: true },
  changedAt: { type: Date, required: true },
  source: { type: String, enum: ["baseline", "create", "transition"], default: "transition" }
}, {
  timestamps: true
});

memberStatusHistorySchema.index({ church: 1, member: 1, changedAt: 1 });
// One baseline entry per member keeps lazy seeding idempotent under concurrency.
memberStatusHistorySchema.index(
  { church: 1, member: 1, source: 1 },
  { unique: true, partialFilterExpression: { source: "baseline" } }
);

export default mongoose.model("MemberStatusHistory", memberStatusHistorySchema);
