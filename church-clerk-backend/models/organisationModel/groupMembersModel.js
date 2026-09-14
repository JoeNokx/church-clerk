import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
  role: { type: String, default: "member" },
  church: { type: mongoose.Schema.Types.ObjectId, ref: "Church" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const GroupMember = mongoose.model("GroupMember", groupMemberSchema);

export default GroupMember;
