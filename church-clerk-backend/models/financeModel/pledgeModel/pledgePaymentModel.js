import mongoose from "mongoose";
import { generateReferenceId } from "../../../utils/generateReferenceId.js";

const pledgePaymentSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true
    },

    pledge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pledge",
      required: true,
      index: true
    },

    paymentDate: {
      type: Date,
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 1
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Mobile Money", "Bank Transfer", "Cheque"],
      required: true
    },

    note: {
      type: String,
      trim: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    referenceId: { type: String, unique: true, sparse: true, index: true }
  },
  {
    timestamps: true
  }
);

pledgePaymentSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("PPY");
  }
});

export default mongoose.model("PledgePayment", pledgePaymentSchema);
