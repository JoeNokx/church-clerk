import mongoose from 'mongoose';
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const titheAggregateSchema = new mongoose.Schema({
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },

  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String, trim: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: String, unique: true, sparse: true, index: true },
}, { timestamps: true });

titheAggregateSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("TTA");
  }
});

export default mongoose.model('TitheAggregate', titheAggregateSchema);