import mongoose from "mongoose";

const cellIndividualAttendanceSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cell: { type: mongoose.Schema.Types.ObjectId, ref: "Cell", required: true },
    date: { type: Date, required: true },
    presentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    totalMembersSnapshot: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("cellIndividualAttendance", cellIndividualAttendanceSchema);
