import mongoose from 'mongoose';
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const welfareDisbursementSchema = new mongoose.Schema({

  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
  
  beneficiaryName: {
    type: String,
    required: true,
    trim: true
  },

  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  category: {
    type: String,
    required: true,
    trim: true
  },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },

  description: { type: String, trim: true },
  receipt: {
    url: { type: String },
    publicId: { type: String },
    resourceType: { type: String },
    originalName: { type: String }
  },
  paymentMethod: { 
    type: String,
    enum: ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque'],
    default: 'Cash'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: String, unique: true, sparse: true, index: true },
}, { timestamps: true });

welfareDisbursementSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("WLF");
  }
});

export default mongoose.model('WelfareDisbursements', welfareDisbursementSchema);