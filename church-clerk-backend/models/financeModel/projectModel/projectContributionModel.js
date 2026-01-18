import mongoose from 'mongoose';

const projectContributionSchema = new mongoose.Schema({
  churchProject: { type: mongoose.Schema.Types.ObjectId, ref: 'ChurchProject', required: true },
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  contributorName: { type: String },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },

  notes: { type: String },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('ProjectContribution', projectContributionSchema);