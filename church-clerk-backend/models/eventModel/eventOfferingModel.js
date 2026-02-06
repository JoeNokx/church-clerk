import mongoose from "mongoose";

const eventOfferingSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: "Church", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },

    offeringType: {
      type: String,
      enum: ["first offering", "second offering", "third offering", "fourth offering", "fifth offering"],
      default: "first offering",
      required: true,
      trim: true
    },

    offeringDate: { type: Date, required: true },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    note: { type: String, trim: true }
  },
  { timestamps: true }
);

eventOfferingSchema.index({ church: 1, event: 1, offeringDate: 1 });

export default mongoose.model("EventOffering", eventOfferingSchema);
