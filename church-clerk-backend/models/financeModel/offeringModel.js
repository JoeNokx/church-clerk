import mongoose from "mongoose";

const offeringSchema = new mongoose.Schema({
  church: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Church",
    required: true
  },
  serviceType: {
    type: String,
    required: true,
    trim: true
  },

  offeringType: {
    type: String,
    required: true,
    trim: true
  },

  serviceDate: {
    type: Date,
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, { timestamps: true });

// KPI optimization index
offeringSchema.index({ church: 1, serviceDate: 1 });
offeringSchema.index({ church: 1, createdAt: -1 });

export default mongoose.model("Offering", offeringSchema);
