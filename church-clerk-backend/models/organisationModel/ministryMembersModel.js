import mongoose from "mongoose";

const ministryMemberSchema = new mongoose.Schema(
  {
    ministry: { type: mongoose.Schema.Types.ObjectId, ref: "Ministry", required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    role: { type: String, default: "member" },
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

ministryMemberSchema.index({ ministry: 1, member: 1, church: 1 }, { unique: true });

export default mongoose.model("MinistryMember", ministryMemberSchema);
