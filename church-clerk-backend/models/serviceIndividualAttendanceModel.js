import mongoose from "mongoose";

const serviceIndividualAttendanceSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    serviceType: { type: String, required: true, trim: true },
    presentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    totalMembersSnapshot: { type: Number, default: 0 },
    selfCheckInToken: { type: String, trim: true, unique: true, sparse: true },
    selfCheckInActive: { type: Boolean, default: false }
  },
  { timestamps: true }
);

serviceIndividualAttendanceSchema.index({ church: 1, date: -1 });
serviceIndividualAttendanceSchema.index({ church: 1, serviceType: 1, date: -1 });

export default mongoose.model("ServiceIndividualAttendance", serviceIndividualAttendanceSchema);
