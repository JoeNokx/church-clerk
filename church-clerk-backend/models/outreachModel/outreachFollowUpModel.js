import mongoose from "mongoose";

const outreachFollowUpSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },

    // ── Subject — exactly one of prospect / visitor / member ───────
    // A follow-up belongs to whoever the person is: someone met at an
    // outreach (prospect), a service visitor, or a member. outreachEvent
    // is only required when the subject is a prospect.
    prospect: { type: mongoose.Schema.Types.ObjectId, ref: "OutreachProspect", default: null },
    visitor: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor", default: null },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
    outreachEvent: { type: mongoose.Schema.Types.ObjectId, ref: "OutreachEvent", default: null },

    // ── Scheduling ──────────────────────────────────────────────────
    scheduledDate: { type: Date },
    followUpDate: { type: Date },

    // ── Assignment — several members can share a follow-up ─────────
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
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

outreachFollowUpSchema.pre("validate", function () {
  const subjects = [this.prospect, this.visitor, this.member].filter(Boolean).length;
  if (subjects !== 1) {
    this.invalidate("prospect", "A follow-up must target exactly one prospect, visitor, or member");
  }
  if (this.prospect && !this.outreachEvent) {
    this.invalidate("outreachEvent", "An outreach event is required for prospect follow-ups");
  }
});

outreachFollowUpSchema.index({ church: 1, outreachEvent: 1 });
outreachFollowUpSchema.index({ church: 1, prospect: 1 });
outreachFollowUpSchema.index({ church: 1, visitor: 1 });
outreachFollowUpSchema.index({ church: 1, member: 1 });
outreachFollowUpSchema.index({ church: 1, status: 1 });
outreachFollowUpSchema.index({ church: 1, scheduledDate: 1, status: 1 });
outreachFollowUpSchema.index({ church: 1, nextFollowUpDate: 1, status: 1 });
outreachFollowUpSchema.index({ church: 1, assignedTo: 1, status: 1 });

export default mongoose.model("OutreachFollowUp", outreachFollowUpSchema);
