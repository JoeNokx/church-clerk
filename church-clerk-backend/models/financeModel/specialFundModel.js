import mongoose from 'mongoose';
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const specialFundSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  category: {
    type: String,
    required: true,
    trim: true
  },
  giverName: { type: String, trim: true },
  
  totalAmount: { type: Number, required: true },
  description: { type: String, trim: true },

  givingDate: { type: Date, required: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: String, unique: true, sparse: true, index: true },
}, { timestamps: true });

specialFundSchema.index({ church: 1, givingDate: 1 });

specialFundSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("SPF");
  }
});

export default mongoose.model('SpecialFund', specialFundSchema);