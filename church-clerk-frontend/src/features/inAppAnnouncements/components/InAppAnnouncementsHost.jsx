import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  acknowledgeInAppAnnouncement,
  dismissInAppAnnouncement,
  getActiveInAppAnnouncements,
  markInAppAnnouncementSeen
} from "../services/inAppAnnouncements.api.js";

function pickTop(rows, predicate) {
  const items = (Array.isArray(rows) ? rows : []).filter(predicate);
  items.sort((a, b) => {
    const pa = String(a?.priority || "informational");
    const pb = String(b?.priority || "informational");
    if (pa !== pb) return pa === "critical" ? -1 : 1;

    const ta = a?.sentAt ? new Date(a.sentAt).getTime() : a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.sentAt ? new Date(b.sentAt).getTime() : b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
  return items[0] || null;
}

function InAppAnnouncementsHost() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [hiddenDisplayTypesById, setHiddenDisplayTypesById] = useState(() => new Map());

  const seenIdsRef = useRef(new Set());
  const bannerTimerRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getActiveInAppAnnouncements();
      const data = Array.isArray(res?.data?.data) ? res.data.data : [];
      setRows(data);

      for (const a of data) {
        const id = String(a?._id || "");
        if (!id) continue;
        if (seenIdsRef.current.has(id)) continue;
        seenIdsRef.current.add(id);
        void markInAppAnnouncementSeen(id);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isHidden = useCallback(
    (id, displayType) => {
      const key = String(id || "");
      if (!key) return false;
      const set = hiddenDisplayTypesById.get(key);
      if (!set) return false;
      return set.has(displayType);
    },
    [hiddenDisplayTypesById]
  );

  const hideLocal = useCallback((id, displayType) => {
    const key = String(id || "");
    if (!key) return;
    setHiddenDisplayTypesById((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) || new Set();
      const s = new Set(existing);
      s.add(displayType);
      next.set(key, s);
      return next;
    });
  }, []);

  const canShowDisplayType = useCallback(
    (a, displayType) => {
      const types = Array.isArray(a?.activeDisplayTypes) ? a.activeDisplayTypes : Array.isArray(a?.displayTypes) ? a.displayTypes : [];
      return types.includes(displayType) && !isHidden(a?._id, displayType);
    },
    [isHidden]
  );

  const banner = useMemo(() => {
    return pickTop(rows, (a) => canShowDisplayType(a, "banner"));
  }, [canShowDisplayType, rows]);

  const modal = useMemo(() => {
    return pickTop(rows, (a) => canShowDisplayType(a, "modal"));
  }, [canShowDisplayType, rows]);

  const onDismiss = useCallback(async (id, displayType) => {
    const s = String(id || "");
    if (!s) return;
    try {
      await dismissInAppAnnouncement(s, { displayType });
    } catch {
      void 0;
    } finally {
      hideLocal(s, displayType);
    }
  }, [hideLocal]);

  const onAcknowledge = useCallback(async (id, displayType) => {
    const s = String(id || "");
    if (!s) return;
    try {
      await acknowledgeInAppAnnouncement(s, { displayType });
    } catch {
      void 0;
    } finally {
      hideLocal(s, displayType);
    }
  }, [hideLocal]);

  useEffect(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }

    if (!banner?._id) return;

    const isCritical = String(banner?.priority || "informational") === "critical";
    if (isCritical) return;

    const mins = Number(banner?.bannerDurationMinutes ?? 5);
    const ms = Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60_000) : 0;

    if (ms <= 0) return;

    bannerTimerRef.current = setTimeout(() => {
      void onDismiss(banner._id, "banner");
    }, ms);

    return () => {
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = null;
      }
    };
  }, [banner?._id, banner?.bannerDurationMinutes, banner?.priority, onDismiss]);

  if (loading && !rows.length) return null;

  return (
    <>
      {banner?._id ? (
        <div className={`mb-4 rounded-xl border px-4 py-3 ${String(banner?.priority) === "critical" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate text-sm">{banner?.title || "System Announcement"}</div>
              <div className="mt-1 text-gray-800 text-sm">{banner?.message || ""}</div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {String(banner?.priority) === "critical" ? (
                <button
                  type="button"
                  onClick={() => onAcknowledge(banner._id, "banner")}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 px-3 font-semibold text-white md:h-12 text-sm"
                >
                  Acknowledge
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onDismiss(banner._id, "banner")}
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 font-semibold text-gray-700 hover:bg-gray-50 md:h-12 text-sm"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {modal?._id ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4 md:py-5 lg:py-6 px-4 md:px-6">
              <div>
                <div className="font-semibold text-gray-900 text-lg">{modal?.title || "System Announcement"}</div>
                <div className="mt-1 text-gray-600 text-sm">{String(modal?.priority) === "critical" ? "Action required" : ""}</div>
              </div>

              {String(modal?.priority) === "critical" ? null : (
                <button
                  type="button"
                  onClick={() => onDismiss(modal._id, "modal")}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            <div className="py-4 md:py-5 lg:py-6 px-4 md:px-6">
              <div className="text-gray-800 whitespace-pre-wrap text-sm">{modal?.message || ""}</div>

              <div className="mt-6 flex items-center justify-end gap-3">
                {String(modal?.priority) === "critical" ? (
                  <button
                    type="button"
                    onClick={() => onAcknowledge(modal._id, "modal")}
                    className="rounded-lg bg-gray-900 py-2 font-semibold text-white shadow-sm text-sm px-4 md:px-6"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onDismiss(modal._id, "modal")}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismiss(modal._id, "modal")}
                      className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 text-sm px-4 md:px-6"
                    >
                      OK
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default InAppAnnouncementsHost;
