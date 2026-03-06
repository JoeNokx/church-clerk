import mongoose from "mongoose";

const lookupValueSchema = new mongoose.Schema(
  {
    churchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      index: true
    },
    kind: {
      type: String,
      required: true,
      index: true
    },
    value: {
      type: String,
      required: true
    },
    normalizedValue: {
      type: String,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

lookupValueSchema.index(
  { churchId: 1, kind: 1, normalizedValue: 1 },
  { unique: true, name: "uniq_lookup_value" }
);

export default mongoose.model("LookupValue", lookupValueSchema);
