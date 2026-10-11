import mongoose from 'mongoose';
import { generateReferenceId } from "../../../utils/generateReferenceId.js";


const projectExpenseSchema = new mongoose.Schema({
  churchProject: { type: mongoose.Schema.Types.ObjectId, ref: 'ChurchProject', required: true },
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

 spentOn: { type: String, trim: true, required: true },
  category: { type: String, trim: true },
  amount: { type: Number, required: true },
  description: { type: String, trim: true },
  date: { type: Date, required: true },
  receipt: {
    url: { type: String },
    publicId: { type: String },
    resourceType: { type: String },
    originalName: { type: String }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: String, unique: true, sparse: true, index: true },
}, { timestamps: true });

projectExpenseSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("PRE");
  }
});

export default mongoose.model('ProjectExpense', projectExpenseSchema);