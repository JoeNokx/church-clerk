import mongoose from "mongoose";

const churchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  type: {
    type: String,
    enum: ["Independent", "Headquarters", "Branch"],
    required: true
  },

  parentChurch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Church",
    default: null // only for branches
  },

  pastor: {
    type: String,
    required: true,
    trim: true
  },
  memberCount: { type: Number, default: 0 },
  memberSerial: { type: Number, default: 0 },

  foundedDate: { type: Date },

  streetAddress: String,
  city: String,
  region: String,
  country: { type: String, default: "Ghana" },

  currency: {
    type: String,
    trim: true,
    uppercase: true,
    default: "GHS"
  },

  phoneNumber: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },

  referralCodeInput: {
  type: String,
  trim: true,
  default: null,
  select: false // optional, not expose by default
},

  titheRecordingMode: {
    type: String,
    enum: ["individual", "aggregate"],
    default: null
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, { timestamps: true });

export default mongoose.model("Church", churchSchema);
