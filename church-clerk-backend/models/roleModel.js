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
    // Owning church for custom roles created inside the church app — null
    // for built-in and system-admin-managed (global) roles.
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      default: null
    },
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // The account that created the role through a portal — null for seeded
    // built-ins and legacy rows. Lets the admin UI show who made a role.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

roleSchema.index({ key: 1, scope: 1, church: 1 }, { unique: true });

const Role = mongoose.model("Role", roleSchema);

export default Role;
