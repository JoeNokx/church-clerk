import mongoose from "mongoose";

const cellOfferingSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cell: { type: mongoose.Schema.Types.ObjectId, ref: "Cell", required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    note: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("cellTotalOffering", cellOfferingSchema);
