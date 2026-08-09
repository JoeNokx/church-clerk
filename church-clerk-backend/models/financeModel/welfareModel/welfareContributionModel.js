import mongoose from 'mongoose';
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const welfareContributionSchema = new mongoose.Schema({

  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
  
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },

  amount: { type: Number, required: true },
  date: { type: Date, required: true },

  paymentMethod: { 
    type: String,
    enum: ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque'],
    default: 'Cash'
  }, 

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: String, unique: true, sparse: true, index: true },
}, { timestamps: true });

welfareContributionSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("WLC");
  }
});

export default mongoose.model('WelfareContributions', welfareContributionSchema);