import mongoose from "mongoose";
import { generateReferenceId } from "../utils/generateReferenceId.js";

const visitorLogSchema = new mongoose.Schema(
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

    serviceType: {
      type: String,
      required: true,
      trim: true,
    },

    serviceDate: {
      type: Date,
      required: true,
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },

    referenceId: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

visitorLogSchema.index({ church: 1, serviceDate: -1 });

visitorLogSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    this.referenceId = await generateReferenceId("VLG");
  }
});

export default mongoose.model("VisitorLog", visitorLogSchema);
