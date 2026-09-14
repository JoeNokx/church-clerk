import mongoose from "mongoose";

const cellMemberSchema = new mongoose.Schema(
  {
    cell: { type: mongoose.Schema.Types.ObjectId, ref: "Cell", required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    role: { type: String, default: "member" },
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

cellMemberSchema.index({ cell: 1, member: 1, church: 1 }, { unique: true });

export default mongoose.model("CellMember", cellMemberSchema);
