import mongoose from 'mongoose';
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const churchProjectSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  name: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  description: { type: String },

  startDate: { type: Date, required: true, default: Date.now },

  status: { 
    type: String, 
    enum: ['Active', 'Completed'], 
    default: 'Active' 
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: String, unique: true, sparse: true, index: true }
}, { timestamps: true });

churchProjectSchema.index({ church: 1, startDate: 1 });

churchProjectSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("PRJ");
  }
});

export default mongoose.model('ChurchProject', churchProjectSchema);