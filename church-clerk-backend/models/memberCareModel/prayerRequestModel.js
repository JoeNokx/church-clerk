import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const prayerRequestSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },

    // Requests may come from non-members — member is optional and
    // requesterName covers everyone else.
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
    requesterName: { type: String, trim: true },

    request: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["health", "family", "finances", "guidance", "thanksgiving", "bereavement", "other"],
      default: "other"
    },
    status: {
      type: String,
      enum: ["active", "answered", "archived"],
      default: "active"
    },

    // Private requests follow the same visibility rule as confidential
    // care cases — churchclerkadmin (and superadmin) only.
    isPrivate: { type: Boolean, default: false },

    answeredDate: { type: Date },
    answerNote: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

prayerRequestSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("MCP");
  }
});

prayerRequestSchema.index({ church: 1, status: 1 });
prayerRequestSchema.index({ church: 1, member: 1 });
prayerRequestSchema.index({ church: 1, isPrivate: 1 });

export default mongoose.model("PrayerRequest", prayerRequestSchema);
