import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getMySubscription } from "../../features/subscription/services/subscription.api.js";

const SubscriptionLockContext = createContext(null);

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function daysLeft(dateValue) {
  if (!dateValue) return null;
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return null;
  const diff = dt.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Determines the lock state from the subscription response.
 * Returns:
 *   - isLocked: true when writes are blocked (suspended, grace expired, trial expired)
 *   - lockReason: "suspended" | "grace_expired" | "trial_expired" | "past_due" | null
 *   - lockTitle: short headline for the modal
 *   - lockMessage: longer body text for the modal
 */
function deriveLockState(subscription, readOnly) {
  if (!subscription) {
    return { isLocked: false, lockReason: null, lockTitle: "", lockMessage: "" };
  }

  const status = normalizeStatus(subscription.status);
  const now = new Date();
  const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null;
  const graceEnd = subscription.gracePeriodEnd ? new Date(subscription.gracePeriodEnd) : null;

  // Suspended — everything blocked
  if (status === "suspended") {
    return {
      isLocked: true,
      lockReason: "suspended",
      lockTitle: "Account Suspended",
      lockMessage:
        "Your subscription has been suspended. You can still view your data, but all actions are blocked. Renew your subscription to restore full access."
    };
  }

  // Past due with grace period expired
  if (status === "past_due" && graceEnd && now > graceEnd) {
    return {
      isLocked: true,
      lockReason: "grace_expired",
      lockTitle: "Grace Period Ended",
      lockMessage:
        "Your subscription payment is overdue and the grace period has ended. You can still view your data, but all actions are blocked. Pay now to restore access."
    };
  }

  // Past due within grace — not fully locked yet, but warn
  if (status === "past_due" && graceEnd && now <= graceEnd) {
    const remaining = daysLeft(subscription.gracePeriodEnd);
    return {
      isLocked: false,
      lockReason: "past_due",
      lockTitle: "Payment Overdue",
      lockMessage:
        remaining !== null
          ? `Your subscription payment is overdue. You have ${remaining} day${remaining === 1 ? "" : "s"} left before actions are blocked.`
          : "Your subscription payment is overdue. Please pay to avoid losing access."
    };
  }

  // Trial expired (after grace) — released to Free Lite, readOnly flag is set by backend
  const isTrial = status === "free_trial" || status === "trialing";
  if (isTrial && trialEnd && now > trialEnd) {
    // Within grace period — not locked yet
    return {
      isLocked: false,
      lockReason: "trial_grace",
      lockTitle: "Trial Ended",
      lockMessage:
        "Your free trial has ended. You are now on the Free Lite plan. Upgrade to continue using premium features."
    };
  }

  // Backend readOnly flag covers any other locked state we missed
  if (readOnly) {
    return {
      isLocked: true,
      lockReason: "locked",
      lockTitle: "Actions Blocked",
      lockMessage:
        "Your account is currently in read-only mode. Renew your subscription to restore full access."
    };
  }

  return { isLocked: false, lockReason: null, lockTitle: "", lockMessage: "" };
}

export function SubscriptionLockProvider({ children }) {
  const [lockState, setLockState] = useState({
    isLocked: false,
    lockReason: null,
    lockTitle: "",
    lockMessage: ""
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);
  const fetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await getMySubscription();
      const sub = res?.data?.subscription || null;
      const readOnly = Boolean(res?.data?.readOnly);
      const derived = deriveLockState(sub, readOnly);
      setLockState(derived);
      if (typeof window !== "undefined") {
        localStorage.setItem("subscriptionReadOnly", derived.isLocked ? "1" : "0");
        localStorage.setItem("subscriptionLocked", derived.isLocked ? "1" : "0");
      }
    } catch {
      // If we can't fetch, fall back to localStorage
      if (typeof window !== "undefined") {
        const locked = localStorage.getItem("subscriptionLocked") === "1";
        setLockState({
          isLocked: locked,
          lockReason: locked ? "locked" : null,
          lockTitle: locked ? "Actions Blocked" : "",
          lockMessage: locked
            ? "Your account is currently in read-only mode. Renew your subscription to restore full access."
            : ""
        });
      }
    } finally {
      fetchedRef.current = true;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const showLockModal = useCallback(
    (customMessage) => {
      setModalMessage(customMessage || null);
      setModalOpen(true);
    },
    []
  );

  const closeLockModal = useCallback(() => {
    setModalOpen(false);
    setModalMessage(null);
  }, []);

  /**
   * Wraps an action callback. If the account is locked, shows the modal
   * instead of calling the action. Returns nothing — call as a fire-and-forget.
   */
  const guardAction = useCallback(
    (action) => {
      if (lockState.isLocked) {
        showLockModal();
        return false;
      }
      if (typeof action === "function") action();
      return true;
    },
    [lockState.isLocked, showLockModal]
  );

  const value = useMemo(
    () => ({
      ...lockState,
      modalOpen,
      modalMessage,
      showLockModal,
      closeLockModal,
      guardAction,
      refresh
    }),
    [lockState, modalOpen, modalMessage, showLockModal, closeLockModal, guardAction, refresh]
  );

  return (
    <SubscriptionLockContext.Provider value={value}>
      {children}
    </SubscriptionLockContext.Provider>
  );
}

export function useSubscriptionLock() {
  const ctx = useContext(SubscriptionLockContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider (shouldn't happen
    // in normal app flow, but keeps tests/standalone usage from crashing).
    return {
      isLocked: false,
      lockReason: null,
      lockTitle: "",
      lockMessage: "",
      modalOpen: false,
      modalMessage: null,
      showLockModal: () => {},
      closeLockModal: () => {},
      guardAction: (action) => {
        if (typeof action === "function") action();
        return true;
      },
      refresh: async () => {}
    };
  }
  return ctx;
}

/**
 * Convenience hook: returns a function that wraps any action with the lock guard.
 * Usage: const guarded = useGuardedAction();
 *        <button onClick={() => guarded(() => openForm())}>Add</button>
 */
export function useGuardedAction() {
  const { guardAction } = useSubscriptionLock();
  return guardAction;
}
