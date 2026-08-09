import mongoose from "mongoose";
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const businessExpensesSchema = new mongoose.Schema({
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessVentures: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessVentures", required: true },
    spentBy: { type: String, required: true },
    category: { type: String, trim: true },
    date: { type: Date, required: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true },
    referenceId: { type: String, unique: true, sparse: true, index: true }

}, { timestamps: true });

businessExpensesSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("BZE");
  }
});

export default mongoose.models.BusinessExpenses || mongoose.model("BusinessExpenses", businessExpensesSchema);