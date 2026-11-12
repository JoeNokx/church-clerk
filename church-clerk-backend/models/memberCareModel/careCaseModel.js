import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const careCaseSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },

    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        "illness",
        "hospitalization",
        "bereavement",
        "new-baby",
        "family-crisis",
        "financial-hardship",
        "spiritual-support",
        "counseling",
        "other"
      ],
      default: "other"
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open"
    },
    source: {
      type: String,
      enum: ["self-reported", "leader-referral", "family-referral", "pastoral-observation", "other"],
      default: "self-reported"
    },

    // Confidential cases are only visible to churchclerkadmin (and superadmin).
    confidential: { type: Boolean, default: false },

    description: { type: String, trim: true },

    // Caregivers assigned to the case — members, same convention as outreach.
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],

    dateOpened: { type: Date, default: Date.now },
    dateClosed: { type: Date },
    nextFollowUpDate: { type: Date },
    resolutionNotes: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

careCaseSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("MCC");
  }
});

careCaseSchema.index({ church: 1, member: 1 });
careCaseSchema.index({ church: 1, status: 1 });
careCaseSchema.index({ church: 1, category: 1 });
careCaseSchema.index({ church: 1, confidential: 1 });
careCaseSchema.index({ church: 1, assignedTo: 1, status: 1 });
careCaseSchema.index({ church: 1, nextFollowUpDate: 1, status: 1 });

export default mongoose.model("CareCase", careCaseSchema);
