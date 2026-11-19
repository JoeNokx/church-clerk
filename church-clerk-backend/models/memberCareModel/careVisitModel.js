import mongoose from "mongoose";

const careVisitSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    // Optional — casual visits (no formal case) are logged without one.
    careCase: { type: mongoose.Schema.Types.ObjectId, ref: "CareCase", default: null },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },

    visitType: {
      type: String,
      enum: ["home-visit", "hospital-visit", "phone-call", "counseling-session", "prayer", "other"],
      default: "home-visit"
    },
    visitDate: { type: Date, required: true },
    conductedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],

    notes: { type: String, trim: true },
    outcome: {
      type: String,
      enum: ["improving", "stable", "needs-attention", "escalated", "resolved", "no-contact"],
      default: "stable"
    },
    nextFollowUpDate: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

careVisitSchema.index({ church: 1, careCase: 1 });
careVisitSchema.index({ church: 1, member: 1 });
careVisitSchema.index({ church: 1, visitDate: 1 });
careVisitSchema.index({ church: 1, visitType: 1 });

export default mongoose.model("CareVisit", careVisitSchema);
