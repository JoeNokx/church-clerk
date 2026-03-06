import mongoose from "mongoose";

const departmentIndividualAttendanceSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    date: { type: Date, required: true },
    presentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    totalMembersSnapshot: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("departmentIndividualAttendance", departmentIndividualAttendanceSchema);
