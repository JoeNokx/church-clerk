import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    serviceType: {
      type: String,
      required: true,
     enum: [
      'Sunday Service',
      '1st Service',
      '2nd Service',
      '3rd Service',
      'Children Service',
      'Midweek Service',
      'Prayer Meeting'
    ]
    },

    serviceDate: {
      type: Date,
      default: null,
    },

    invitedBy: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["visitor", "converted"],
      default: "visitor"
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Visitor", visitorSchema);

