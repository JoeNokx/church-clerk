import mongoose from "mongoose";

const groupTotalOfferingSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  note: { type: String, trim: true },
}, { timestamps: true });

export default mongoose.model("groupTotalOffering", groupTotalOfferingSchema);
