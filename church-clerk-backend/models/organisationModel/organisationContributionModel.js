import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const organisationContributionSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    entityType: { type: String, enum: ["cell", "department", "ministry", "group"], required: true },
    entity: { type: mongoose.Schema.Types.ObjectId, required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Mobile Money", "Bank Transfer", "Cheque"],
      default: "Cash"
    },
    note: { type: String, trim: true },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

organisationContributionSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("OGC");
  }
});

export default mongoose.model("organisationContribution", organisationContributionSchema);
