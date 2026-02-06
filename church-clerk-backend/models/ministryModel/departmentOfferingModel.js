import mongoose from "mongoose";

const departmentOfferingSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    note: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("departmentTotalOffering", departmentOfferingSchema);
