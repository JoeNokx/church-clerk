import mongoose from 'mongoose';
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const projectContributionSchema = new mongoose.Schema({
  churchProject: { type: mongoose.Schema.Types.ObjectId, ref: 'ChurchProject', required: true },
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  contributorName: { type: String },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },

  notes: { type: String },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: String, unique: true, sparse: true, index: true },
}, { timestamps: true });

projectContributionSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("PRC");
  }
});

export default mongoose.model('ProjectContribution', projectContributionSchema);