import mongoose from "mongoose";

/**
 * Tracks the monthly included SMS credits granted to a church by its subscription plan.
 *
 * - `planMonthlySmsCredits` snapshots the plan's configured allowance at the start of the
 *   billing period so that mid-period plan config changes do not retroactively alter
 *   the current period's grant.
 * - `periodStart` / `periodEnd` define the billing period window. The allowance resets
 *   (re-grants `planMonthlySmsCredits` and resets `usedCredits` to 0) when a new period
 *   begins, driven by the subscription billing cycle.
 * - `usedCredits` is incremented atomically during sends and is capped at the grant.
 * - Purchased top-up credits live on AnnouncementWallet and persist across periods.
 */
const smsAllowanceSchema = new mongoose.Schema(
  {
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
      unique: true,
      index: true
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null
    },
    // Total included credits granted for the current billing period.
    grantedCredits: {
      type: Number,
      default: 0,
      min: 0
    },
    // Included credits already consumed in the current billing period.
    usedCredits: {
      type: Number,
      default: 0,
      min: 0
    },
    // Snapshot of the plan's configured monthly allowance (for audit / display).
    planMonthlySmsCredits: {
      type: Number,
      default: 0,
      min: 0
    },
    periodStart: {
      type: Date,
      default: null
    },
    periodEnd: {
      type: Date,
      default: null
    },
    // Monotonic counter bumped on each reset to disambiguate periods.
    periodIndex: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model("SmsAllowance", smsAllowanceSchema);
