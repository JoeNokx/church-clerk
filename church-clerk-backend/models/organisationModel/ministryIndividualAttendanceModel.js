import mongoose from "mongoose";

const ministryIndividualAttendanceSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ministry: { type: mongoose.Schema.Types.ObjectId, ref: "Ministry", required: true },
    date: { type: Date, required: true },
    serviceType: { type: String, trim: true, default: "" },
    mainSpeaker: { type: String, default: "" },
    presentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    absentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    totalMembersSnapshot: { type: Number, default: 0 },
    expectedCount: { type: Number, default: 0, min: 0 },
    selfCheckInToken: { type: String, trim: true, unique: true, sparse: true },
    selfCheckInActive: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("ministryIndividualAttendance", ministryIndividualAttendanceSchema);
