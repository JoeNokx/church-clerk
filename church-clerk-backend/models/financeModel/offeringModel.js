import mongoose from "mongoose";

const offeringSchema = new mongoose.Schema({
  church: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Church",
    required: true
  },
  serviceType: {
    type: String,
    enum: [
      'Sunday Service',
      'First Sunday Service',
      'Second Sunday Service',
      'Third Sunday Service',
      'Worship Service',
      'Bible Study',
      'Special Program',
      'Children Service',
      'Midweek Service',
      'Prayer Meeting',
      'cells Meeting',
      'groups Meeting',
      'department Meeting'

    ],
    required: true
    },

  offeringType: {
    type: String,
    enum: ["first offering", "second offering", "third offering" , "fourth offering", "fifth offering"], default: "first offering",
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

export default mongoose.model("Offering", offeringSchema);
