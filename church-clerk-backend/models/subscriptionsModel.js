import mongoose from "mongoose";

const subscriptionsSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
    },
    planName: {
      type: String,
      enum: ["Free", "Basic", "Standard", "Premium"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    duration: {
      type: String,
      enum: ["Monthly", "Quarterly", "Annual"],
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    paymentReference: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Subscriptions", subscriptionsSchema);