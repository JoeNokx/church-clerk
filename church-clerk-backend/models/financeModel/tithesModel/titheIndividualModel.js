import mongoose from 'mongoose';
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const titheIndividualSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  payerName: { type: String }, // If not a member

  amount: { type: Number, required: true },
  date: { type: Date, required: true },

  paymentMethod: { 
    type: String,
    enum: ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque', 'Card'],
    required: 'true'
  },
  referenceId: { type: String, unique: true, sparse: true, index: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

titheIndividualSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("TTH");
  }
});

export default mongoose.model('TitheIndividual', titheIndividualSchema);