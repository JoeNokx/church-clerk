import mongoose from "mongoose";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const teamRoleSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
  role: {
    type: String,
    enum: ["outreach-leader", "evangelist", "prayer-team", "follow-up-team", "counselor", "transport", "registration", "media", "volunteer"],
    default: "volunteer",
  },
}, { _id: false });

const outreachEventSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    endDate: { type: Date },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    location: { type: String, trim: true },
    area: { type: String, trim: true },
    type: {
      type: String,
      enum: [
        "street-evangelism", "house-to-house", "community-outreach", "school-outreach",
        "hospital-outreach", "prison-outreach", "market-outreach", "campus-outreach",
        "crusade", "personal-evangelism", "online", "special-campaign", "other",
      ],
      default: "street-evangelism",
    },
    description: { type: String, trim: true },
    objective: { type: String, trim: true },
    targetCount: { type: Number, min: 0 },
    coordinator: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "OutreachTeam" }],
    teamLeader: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    teamRoles: [teamRoleSchema],
    status: {
      type: String,
      enum: ["planned", "ongoing", "completed", "cancelled"],
      default: "planned",
    },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referenceId: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

outreachEventSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("OTR");
  }
});

outreachEventSchema.index({ church: 1, date: -1 });
outreachEventSchema.index({ church: 1, status: 1 });

export default mongoose.model("OutreachEvent", outreachEventSchema);
