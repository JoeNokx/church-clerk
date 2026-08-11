import mongoose from "mongoose";

const assignedWorkerSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
  assignedAt: { type: Date, default: Date.now },
}, { _id: false });

const outreachProspectSchema = new mongoose.Schema(
  {
    // ── Core identity ──────────────────────────────────────────────
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    outreachEvent: { type: mongoose.Schema.Types.ObjectId, ref: "OutreachEvent" },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },
    alternativePhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    ageGroup: { type: String, enum: ["child", "teenager", "youth", "adult", "elderly"] },
    occupation: { type: String, trim: true },

    // ── Location ───────────────────────────────────────────────────
    address: { type: String, trim: true },
    community: { type: String, trim: true },

    // ── Contact preferences ────────────────────────────────────────
    preferredContact: {
      type: String,
      enum: ["call", "whatsapp", "sms", "visit", "email"],
      default: "call",
    },
    howReached: {
      type: String,
      enum: ["street", "house-visit", "referral", "online", "phone", "event", "other"],
      default: "street",
    },
    existingChurchStatus: {
      type: String,
      enum: ["none", "another-church", "lapsed", "unknown"],
      default: "none",
    },

    // ── Spiritual status ───────────────────────────────────────────
    heardGospel: { type: Boolean, default: false },
    acceptedChrist: { type: Boolean, default: false },
    rededication: { type: Boolean, default: false },
    wantsPrayer: { type: Boolean, default: false },
    wantsToVisitChurch: { type: Boolean, default: false },
    alreadyChristian: { type: Boolean, default: false },
    notInterested: { type: Boolean, default: false },

    // ── Legacy decision field (kept for backward compat) ──────────
    decision: {
      type: String,
      enum: ["none", "firstTimeSalvation", "rededication", "baptismInterest", "churchVisit"],
      default: "none",
    },
    interestLevel: { type: String, enum: ["low", "medium", "high"], default: "medium" },

    // ── Journey / pipeline ─────────────────────────────────────────
    stage: {
      type: String,
      enum: ["reached", "contacted", "interested", "visited-church", "connected", "new-believer", "member"],
      default: "reached",
    },
    dateReached: { type: Date },

    // ── Follow-up assignment ───────────────────────────────────────
    assignedFollowUpWorkers: [assignedWorkerSchema],
    nextFollowUpDate: { type: Date },

    // ── Integration links ──────────────────────────────────────────
    linkedMember: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
    linkedVisitor: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor", default: null },
    convertedToMember: { type: Boolean, default: false },
    markedAsVisitor: { type: Boolean, default: false },
    convertedAt: { type: Date },
    markedAsVisitorAt: { type: Date },

    // ── Notes & metadata ──────────────────────────────────────────
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

outreachProspectSchema.index({ church: 1, outreachEvent: 1 });
outreachProspectSchema.index({ church: 1, stage: 1 });
outreachProspectSchema.index({ church: 1, phone: 1 });
outreachProspectSchema.index({ church: 1, nextFollowUpDate: 1 });
outreachProspectSchema.index({ church: 1, convertedToMember: 1 });

export default mongoose.model("OutreachProspect", outreachProspectSchema);
