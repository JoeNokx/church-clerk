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
        reason
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

// immutableGuard blocks direct changes; controllers should be altered later to call createAdjustment instead of performing updates
export function immutableGuard() {
  return async (_req, res) => {
    return res.status(405).json({ message: "Direct edits are not allowed. Use adjustment entries.", status: "REJECTED" });
  };
}

// Conditional wrapper: only blocks when enforceImmutability flag is ON
export function conditionalImmutableGuard() {
  return async (req, res, next) => {
    try {
      const flags = await getSystemSettingsSnapshot();
      if (!flags.enforceImmutability) return next();
      return res.status(405).json({ message: "Direct edits are not allowed. Use adjustment entries.", status: "REJECTED" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
}
