import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    scope: {
      type: String,
      required: true,
      enum: ["system", "church"]
    },
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

roleSchema.index({ key: 1, scope: 1 }, { unique: true });

const Role = mongoose.model("Role", roleSchema);

export default Role;
