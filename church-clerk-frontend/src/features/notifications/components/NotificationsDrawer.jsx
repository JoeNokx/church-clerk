import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notifications.api.js";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function NotificationRow({ n, onMarkRead, onNavigate }) {
  const isSupportTicket = n?.type === "support_ticket";
  const ticketId = n?.meta?.ticketId || null;

  const handleClick = async () => {
    if (!isSupportTicket || !ticketId) return;
    if (!n?.readStatus) await onMarkRead();
    onNavigate(ticketId);
  };

  return (
    <div
      className={`px-5 py-4 ${!n?.readStatus ? "bg-blue-50/40" : ""} ${isSupportTicket && ticketId ? "cursor-pointer hover:bg-gray-50" : ""}`}
      onClick={isSupportTicket && ticketId ? handleClick : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {!n?.readStatus && (
              <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            )}
            <div className="font-semibold text-gray-900 text-sm leading-snug">{n?.title || "Notification"}</div>
          </div>
          <div className="mt-1 text-gray-600 text-sm leading-relaxed">{n?.message || ""}</div>
          {isSupportTicket && ticketId && (
            <div className="mt-1 text-blue-600 text-xs font-medium">Tap to view ticket →</div>
          )}
          <div className="mt-1.5 text-gray-400 text-xs">{formatDateTime(n?.createdAt)}</div>
        </div>
        {!n?.readStatus && !isSupportTicket && (
          <button
            type="button"
            onClick={async (e) => { e.stopPropagation(); await onMarkRead(); }}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-1.5 py-0.5 md:px-2.5 md:py-1.5 font-semibold text-gray-600 hover:bg-gray-50 text-xs"
          >
            Mark read
          </button>
        )}
      </div>
    </div>
  );
}

function NotificationsDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0, totalPages: 1, currentPage: 1, limit: 20, nextPage: null, prevPage: null
  });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [cachedCounts, setCachedCounts] = useState({ all: 0, unread: 0 });

  const query = useMemo(() => ({
    page: pagination.currentPage,
    limit: pagination.limit,
    unreadOnly: unreadOnly ? "true" : ""
  }), [pagination.currentPage, pagination.limit, unreadOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyNotifications(query);
      const rows = Array.isArray(res?.data?.notifications) ? res.data.notifications : [];
      const p = res?.data?.pagination || {};
      const total = Number(p?.total || 0);
      setNotifications(rows);
      setPagination((prev) => ({
        ...prev,
        total,
        totalPages: Math.max(1, Number(p?.totalPages || 1)),
        currentPage: Math.max(1, Number(p?.currentPage || prev.currentPage || 1)),
        limit: Math.max(1, Number(p?.limit || prev.limit || 20)),
        nextPage: p?.nextPage ?? null,
        prevPage: p?.prevPage ?? null
      }));
      setCachedCounts((prev) => unreadOnly ? { ...prev, unread: total } : { ...prev, all: total });
    } catch (e) {
      setNotifications([]);
      setError(e?.response?.data?.message || e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const unreadCountLocal = useMemo(
    () => notifications.reduce((acc, n) => acc + (n?.readStatus ? 0 : 1), 0),
    [notifications]
  );

  const displayedNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const type = String(n?.type || "").toLowerCase();
      const title = String(n?.title || "").toLowerCase();
      return !type.includes("tithe") && !type.includes("offering") &&
             !title.includes("tithe recorded") && !title.includes("offering recorded");
    });
  }, [notifications]);

  const emitUnreadChanged = useCallback(() => {
    try { window.dispatchEvent(new Event("cck:notifications:unread-changed")); } catch { void 0; }
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-[85vw] max-w-[360px] md:max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-modal="true"
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="border-b border-gray-200 shrink-0">
          {/* Row 1: title + controls */}
          <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 md:py-4">
            <div>
              <div className="font-semibold text-gray-900 text-sm md:text-base">Notifications</div>
              {pagination.total > 0 && (
                <div className="text-gray-500 text-xs mt-0.5">{pagination.total} total</div>
              )}
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {/* Tabs — desktop only in this row */}
              <div className="hidden md:flex items-center rounded-lg bg-gray-100 p-0.5">
                <button
                  type="button"
                  onClick={() => { setUnreadOnly(false); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${!unreadOnly ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  All{cachedCounts.all > 0 ? ` (${cachedCounts.all})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => { setUnreadOnly(true); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${unreadOnly ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Unread{cachedCounts.unread > 0 ? ` (${cachedCounts.unread})` : ""}
                </button>
              </div>
              {/* Mark all read — desktop only in this row */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await markAllNotificationsRead();
                    setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
                    emitUnreadChanged();
                  } catch { void 0; }
                }}
                className="hidden md:block rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 font-semibold text-gray-600 hover:bg-gray-50 text-xs"
              >
                Mark all read
              </button>
              {/* Close — always visible */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close notifications"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
          {/* Row 2: mobile only — tabs + mark all read */}
          <div className="flex md:hidden items-center justify-between gap-2 px-4 pb-2">
            <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() => { setUnreadOnly(false); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${!unreadOnly ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                All{cachedCounts.all > 0 ? ` (${cachedCounts.all})` : ""}
              </button>
              <button
                type="button"
                onClick={() => { setUnreadOnly(true); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${unreadOnly ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                Unread{cachedCounts.unread > 0 ? ` (${cachedCounts.unread})` : ""}
              </button>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await markAllNotificationsRead();
                  setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
                  emitUnreadChanged();
                } catch { void 0; }
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 font-semibold text-gray-600 hover:bg-gray-50 text-xs"
            >
              Mark all read
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
          ) : null}

          {loading ? (
            <div className="divide-y divide-gray-100">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-4 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-gray-200 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-200" />
                    <div className="h-2.5 w-1/4 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedNotifications.length ? (
            <div className="divide-y divide-gray-100">
              {displayedNotifications.map((n) => (
                <NotificationRow
                  key={n?._id}
                  n={n}
                  onMarkRead={async () => {
                    if (!n?._id || n?.readStatus) return;
                    try {
                      await markNotificationRead(n._id);
                      setNotifications((prev) =>
                        prev.map((x) => (String(x?._id) === String(n._id) ? { ...x, readStatus: true } : x))
                      );
                      emitUnreadChanged();
                    } catch { void 0; }
                  }}
                  onNavigate={(ticketId) => {
                    onClose();
                    navigate(`/dashboard?page=support-help&ticketId=${ticketId}`);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              illustration="notifications"
              title="No notifications yet"
              description="Notifications will appear here when events happen."
            />
          )}
        </div>

        {/* Pagination footer */}
        {pagination.totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, currentPage: Math.max(1, Number(p.currentPage || 1) - 1) }))}
              disabled={Number(pagination?.currentPage || 1) <= 1}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 text-xs"
            >
              Prev
            </button>
            <div className="text-gray-500 text-xs">Page {pagination?.currentPage || 1} of {pagination?.totalPages || 1}</div>
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, currentPage: Math.min(Number(p.totalPages || 1), Number(p.currentPage || 1) + 1) }))}
              disabled={Number(pagination?.currentPage || 1) >= Number(pagination?.totalPages || 1)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 text-xs"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default NotificationsDrawer;
