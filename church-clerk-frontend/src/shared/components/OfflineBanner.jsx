import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    let restoreTimer = null;

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
      clearTimeout(restoreTimer);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      restoreTimer = setTimeout(() => setShowRestored(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearTimeout(restoreTimer);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-center gap-2 bg-red-600 py-2 px-4 text-center text-sm font-medium text-white">
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M3 3l18 18" />
        </svg>
        You are offline. Changes you make may not be saved.
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-center gap-2 bg-green-600 py-2 px-4 text-center text-sm font-medium text-white">
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Connection restored.
    </div>
  );
}
