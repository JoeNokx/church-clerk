import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const programOfferingSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Program", required: true },

    offeringType: {
      type: String,
      required: true,
      trim: true
    },

    offeringDate: { type: Date, required: true },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    note: { type: String, trim: true },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

programOfferingSchema.index({ church: 1, event: 1, offeringDate: 1 });

programOfferingSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("EVT");
  }
});

export default mongoose.model("ProgramOffering", programOfferingSchema, "eventofferings");
