import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const groupTotalOfferingSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  note: { type: String, trim: true },
  referenceId: { type: String, unique: true, sparse: true, index: true },
}, { timestamps: true });

groupTotalOfferingSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("GRO");
  }
});

export default mongoose.model("groupTotalOffering", groupTotalOfferingSchema);
