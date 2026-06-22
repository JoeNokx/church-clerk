import { enforceBackdating, createAdjustment } from "../services/finance/governanceService.js";
import { getSystemSettingsSnapshot } from "../controller/systemSettingsController.js";

// Not wired to routes yet. To be applied per module when frontend is ready.
// backdatingGuard expects req.body[dateField] and optionally req.body.reason
export function backdatingGuard({ dateField, module, entityType }) {
  return async (req, res, next) => {
    try {
      const date = req.body?.[dateField];
      const reason = req.body?.reason || req.body?.backdateReason;
      const result = await enforceBackdating({
        user: req.user,
        churchId: req.activeChurch?._id,
        module,
        entityType,
        date,
        reason,
        fullBody: req.body
      });

      if (result.status === "PENDING_APPROVAL") {
        return res.status(202).json({ message: "Backdated entry pending approval", status: result.status, requestId: result.requestId, error: result.error || null });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
}

const IMMUTABLE_MSG = "This record is locked. To make changes, please submit a correction request with a reason — your admin will review and apply it.";

// immutableGuard blocks direct changes unconditionally
export function immutableGuard() {
  return async (_req, res) => {
    return res.status(405).json({ message: IMMUTABLE_MSG, status: "REJECTED" });
  };
}

// Conditional wrapper: only blocks when enforceImmutability flag is ON.
// Superadmin and churchadmin are exempt — they can always edit directly.
export function conditionalImmutableGuard() {
  return async (req, res, next) => {
    try {
      const flags = await getSystemSettingsSnapshot();
      if (!flags.enforceImmutability) return next();
      const role = String(req.user?.role || "").toLowerCase();
      if (role === "superadmin" || role === "churchadmin") return next();
      return res.status(405).json({ message: IMMUTABLE_MSG, status: "REJECTED" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
}
