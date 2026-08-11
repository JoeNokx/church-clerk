import mongoose from "mongoose";

const outreachFollowUpSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    prospect: { type: mongoose.Schema.Types.ObjectId, ref: "OutreachProspect", required: true },
    outreachEvent: { type: mongoose.Schema.Types.ObjectId, ref: "OutreachEvent", required: true },

    // ── Scheduling ──────────────────────────────────────────────────
    scheduledDate: { type: Date },
    followUpDate: { type: Date },

    // ── Assignment ──────────────────────────────────────────────────
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },

    // ── Method & status ─────────────────────────────────────────────
    type: {
      type: String,
      enum: ["call", "whatsapp", "sms", "visit", "email", "in-person", "church-visit", "personal-meeting"],
      default: "call",
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "no-response", "rescheduled", "completed", "not-interested", "connected-to-church"],
      default: "pending",
    },
    outcome: {
      type: String,
      enum: ["not-reached", "not-interested", "interested", "attended-service", "joined-church"],
      default: "not-reached",
    },

    // ── Content ──────────────────────────────────────────────────────
    notes: { type: String, trim: true },
    nextFollowUpDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

outreachFollowUpSchema.index({ church: 1, outreachEvent: 1 });
outreachFollowUpSchema.index({ church: 1, prospect: 1 });
outreachFollowUpSchema.index({ church: 1, status: 1 });
outreachFollowUpSchema.index({ church: 1, scheduledDate: 1, status: 1 });
outreachFollowUpSchema.index({ church: 1, nextFollowUpDate: 1, status: 1 });
outreachFollowUpSchema.index({ church: 1, assignedTo: 1, status: 1 });

export default mongoose.model("OutreachFollowUp", outreachFollowUpSchema);
