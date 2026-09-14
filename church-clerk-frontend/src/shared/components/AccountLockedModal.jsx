import { useNavigate } from "react-router-dom";
import { useSubscriptionLock } from "../context/SubscriptionLockContext.jsx";

export default function AccountLockedModal() {
  const { modalOpen, modalMessage, lockTitle, lockMessage, closeLockModal } = useSubscriptionLock();
  const navigate = useNavigate();

  if (!modalOpen) return null;

  const title = lockTitle || "Actions Blocked";
  const message = modalMessage || lockMessage || "Your account is currently in read-only mode. Renew your subscription to restore full access.";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={closeLockModal}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="font-semibold text-gray-900 mb-2 text-base">{title}</div>
        <div className="text-gray-500 mb-6 text-sm whitespace-pre-wrap">{message}</div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              closeLockModal();
              navigate("/dashboard/billing");
            }}
            className="w-full rounded-lg bg-blue-700 py-2 font-semibold text-white hover:bg-blue-800 text-sm"
          >
            Pay now / Upgrade
          </button>
          <button
            type="button"
            onClick={closeLockModal}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
