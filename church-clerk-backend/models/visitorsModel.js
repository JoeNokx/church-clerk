import mongoose from "mongoose";
import { assignedWorkerSchema } from "./outreachModel/outreachProspectModel.js";

const visitorSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    visitorLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisitorLog",
      default: null,
    },

    attendance: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceIndividualAttendance",
      },
    ],

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    invitedBy: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["visitor", "converted"],
      default: "visitor"
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Follow-up / outreach link ──────────────────────────────────
    // Set when this visitor came from (or matched) an outreach prospect,
    // so one person isn't tracked twice in both registers.
    linkedProspect: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachProspect",
      default: null,
    },
    nextFollowUpDate: { type: Date },
    assignedFollowUpWorkers: [assignedWorkerSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Visitor", visitorSchema);

