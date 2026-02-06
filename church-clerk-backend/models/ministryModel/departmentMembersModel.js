import mongoose from "mongoose";

const departmentMemberSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    role: { type: String, default: "member" },
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

departmentMemberSchema.index({ department: 1, member: 1, church: 1 }, { unique: true });

export default mongoose.model("DepartmentMember", departmentMemberSchema);
