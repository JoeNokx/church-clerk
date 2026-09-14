import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const cellOfferingSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cell: { type: mongoose.Schema.Types.ObjectId, ref: "Cell", required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    note: { type: String, trim: true },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

cellOfferingSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("CLO");
  }
});

export default mongoose.model("cellTotalOffering", cellOfferingSchema);
