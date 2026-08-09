import mongoose from "mongoose";
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const businessIncomeSchema = new mongoose.Schema({
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessVentures: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessVentures", required: true },
    recievedFrom: { type: String, required: true },
    date: { type: Date, required: true },
    note: { type: String, trim: true },
    amount: { type: Number, required: true },
    referenceId: { type: String, unique: true, sparse: true, index: true }

}, { timestamps: true });

businessIncomeSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("BZI");
  }
});

export default mongoose.model("BusinessIncome", businessIncomeSchema);