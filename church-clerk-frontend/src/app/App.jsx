import { BrowserRouter, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import NProgress from "nprogress";
import { startRouteProgress, stopRouteProgress } from "../shared/services/http.js";
import { submitAdjustment } from "../features/governance/services/governance.api.js";
import { isDelegateSession, clearDelegateSession } from "../shared/utils/delegateSession.js";
import AppRoutes from "./routes.jsx";
import ErrorBoundary from "../shared/components/ErrorBoundary.jsx";
import OfflineBanner from "../shared/components/OfflineBanner.jsx";
import { SubscriptionLockProvider } from "../shared/context/SubscriptionLockContext.jsx";
import AccountLockedModal from "../shared/components/AccountLockedModal.jsx";

function RouteProgress() {
  const location = useLocation();

  useEffect(() => {
    NProgress.configure({ showSpinner: false, trickleSpeed: 150 });
  }, []);
 
  useEffect(() => {
    stopRouteProgress();
    return () => {
      startRouteProgress();
    };
  }, [location.pathname, location.search]);

  return null;
}

function SubscriptionLockedModal() {
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setModal(e.detail?.message || "Your subscription is suspended. Please contact support.");
    };
    window.addEventListener("subscriptionLocked", handler);
    return () => window.removeEventListener("subscriptionLocked", handler);
  }, []);

  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl text-center md:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="font-semibold text-gray-900 mb-2 text-base">Subscription Suspended</div>
        <div className="text-gray-500 mb-6 text-sm">{modal}</div>
        <button
          type="button"
          onClick={() => setModal(null)}
          className="rounded-lg bg-blue-700 py-2 font-semibold text-white hover:bg-blue-800 text-sm px-4 md:px-6"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function AdjustmentRequestModal() {
  const [event, setEvent] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      setEvent(e.detail || {});
      setReason("");
      setDone(false);
    };
    window.addEventListener("adjustmentRequired", handler);
    return () => window.removeEventListener("adjustmentRequired", handler);
  }, []);

  if (!event) return null;

  const close = () => { setEvent(null); setReason(""); setDone(false); };

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await submitAdjustment(event.resourceUrl, event.patch || {}, reason.trim());
      setDone(true);
    } catch {
      // toast handled by http interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        {done ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center font-semibold text-gray-900 mb-2 text-base">Request Submitted</div>
            <div className="text-center text-gray-500 mb-6 text-sm">Your correction request has been sent for approval.</div>
            <button type="button" onClick={close} className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 text-sm">
              OK
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="font-semibold text-gray-900 mb-1 text-base">Correction Required</div>
            <div className="text-gray-500 mb-4 text-sm">{event.message || "Direct edits are locked. Submit a correction request with a reason for admin review."}</div>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-[80px]"
              placeholder="Reason for correction..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={close} className="flex-1 rounded-lg border border-gray-200 bg-white py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !reason.trim()}
                className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BackdateApprovalModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("backdatePendingApproval", handler);
    return () => window.removeEventListener("backdatePendingApproval", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
          <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="font-semibold text-gray-900 mb-2 text-base">Submitted for Approval</div>
        <div className="text-gray-500 mb-1 text-sm">
          This entry has a date <span className="font-semibold text-gray-700">older than 24 hours</span>, so it has been sent to your church admin for review.
        </div>
        <div className="text-gray-500 mb-6 text-sm">
          The entry will appear in your records <span className="font-semibold text-gray-700">once your church admin approves it</span>. You can track it under <span className="font-medium text-blue-600">Approvals</span>.
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function DelegateSessionBanner() {
  const [show, setShow] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    setShow(isDelegateSession());
  }, []);

  if (!show) return null;

  const performExit = () => {
    clearDelegateSession();
    // Try to close this tab (opened via window.open from the admin app).
    // If the browser blocks window.close(), fall back to redirecting
    // this tab back to the admin churches page.
    const adminUrl = import.meta.env.VITE_ADMIN_URL || "http://localhost:5174";
    const fallback = `${adminUrl}/admin/churches`;
    try {
      window.close();
    } catch {
      window.location.href = fallback;
      return;
    }
    // Some browsers silently ignore window.close(); redirect if still open.
    setTimeout(() => {
      if (!window.closed) {
        window.location.href = fallback;
      }
    }, 300);
  };

  return (
    <>
      <div className="sticky top-0 z-[9998] flex items-center justify-between gap-3 bg-amber-600 px-4 py-2 text-sm text-white">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="font-semibold">Delegated Session</span>
          <span className="hidden sm:inline">— You are viewing this church as a system admin. Actions you take here affect this church.</span>
          <span className="sm:hidden">Viewing as system admin.</span>
        </div>
        <button
          type="button"
          onClick={() => setConfirmExit(true)}
          className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
        >
          Exit Session
        </button>
      </div>

      {confirmExit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-200">
              <div className="text-base font-bold text-gray-900">Exit Delegated Session?</div>
              <button type="button" onClick={() => setConfirmExit(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="text-sm text-gray-600 leading-relaxed">
                This will end your delegated session and close this tab. You will return to the System Admin churches list. Any unsaved changes will be lost.
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmExit(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Stay
                </button>
                <button type="button"
                  onClick={performExit}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                  Exit Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <SubscriptionLockProvider>
          <DelegateSessionBanner />
          <OfflineBanner />
          <RouteProgress />
          <SubscriptionLockedModal />
          <AccountLockedModal />
          <AdjustmentRequestModal />
          <BackdateApprovalModal />
          <AppRoutes />
        </SubscriptionLockProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
