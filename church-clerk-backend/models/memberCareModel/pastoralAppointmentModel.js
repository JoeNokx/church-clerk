import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const pastoralAppointmentSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },

    // Counselees may be non-members — member is optional and
    // attendeeName covers everyone else.
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
    attendeeName: { type: String, trim: true },

    type: {
      type: String,
      enum: ["counseling-session", "pastoral-appointment"],
      required: true
    },
    category: {
      type: String,
      enum: ["premarital", "marriage", "grief", "spiritual-direction", "crisis", "dedication", "baptism-prep", "general", "other"],
      default: "general"
    },

    appointmentDate: { type: Date, required: true },
    startTime: { type: String, trim: true },
    durationMinutes: { type: Number, default: 60, min: 5, max: 1440 },

    location: {
      type: String,
      enum: ["church-office", "home", "hospital", "online", "phone", "other"],
      default: "church-office"
    },
    locationDetails: { type: String, trim: true },

    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],

    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled", "no-show", "rescheduled"],
      default: "scheduled"
    },

    // Confidential appointments follow the same visibility rule as
    // confidential care cases — churchclerkadmin (and superadmin) only.
    confidential: { type: Boolean, default: false },

    notes: { type: String, trim: true },
    outcomeNotes: { type: String, trim: true },
    completedAt: { type: Date },

    linkedCase: { type: mongoose.Schema.Types.ObjectId, ref: "CareCase", default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

pastoralAppointmentSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("MCA");
  }
});

pastoralAppointmentSchema.index({ church: 1, appointmentDate: 1 });
pastoralAppointmentSchema.index({ church: 1, status: 1 });
pastoralAppointmentSchema.index({ church: 1, member: 1 });
pastoralAppointmentSchema.index({ church: 1, confidential: 1 });
pastoralAppointmentSchema.index({ church: 1, assignedTo: 1 });

export default mongoose.model("PastoralAppointment", pastoralAppointmentSchema);
