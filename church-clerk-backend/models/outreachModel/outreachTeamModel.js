import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
  role: {
    type: String,
    enum: ["team-leader", "evangelist", "counselor", "prayer-team", "follow-up-team", "transport", "registration", "media", "volunteer"],
    default: "volunteer",
  },
}, { _id: false });

const outreachTeamSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    dateCreated: { type: Date },
    members: [teamMemberSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

outreachTeamSchema.index({ church: 1 });

export default mongoose.model("OutreachTeam", outreachTeamSchema);
