import React, { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notifications.api.js";

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 20,
    nextPage: null,
    prevPage: null
  });

  const [unreadOnly, setUnreadOnly] = useState(false);

  const query = useMemo(() => {
    return {
      page: pagination.currentPage,
      limit: pagination.limit,
      unreadOnly: unreadOnly ? "true" : ""
    };
  }, [pagination.currentPage, pagination.limit, unreadOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await getMyNotifications(query);
      const rows = Array.isArray(res?.data?.notifications) ? res.data.notifications : [];
      const p = res?.data?.pagination || {};

      setNotifications(rows);
      setPagination((prev) => ({
        ...prev,
        total: Number(p?.total || 0),
        totalPages: Math.max(1, Number(p?.totalPages || 1)),
        currentPage: Math.max(1, Number(p?.currentPage || prev.currentPage || 1)),
        limit: Math.max(1, Number(p?.limit || prev.limit || 20)),
        nextPage: p?.nextPage ?? null,
        prevPage: p?.prevPage ?? null
      }));
    } catch (e) {
      setNotifications([]);
      setError(e?.response?.data?.message || e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCountLocal = useMemo(() => {
    return notifications.reduce((acc, n) => acc + (n?.readStatus ? 0 : 1), 0);
  }, [notifications]);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <div className="text-2xl font-semibold text-gray-900">Notifications</div>
        </div>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <Skeleton height={14} count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Notifications</div>
          <div className="mt-1 text-sm text-gray-600">{pagination?.total ? `${pagination.total} total` : "No notifications"}</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setUnreadOnly((v) => !v);
              setPagination((p) => ({ ...p, currentPage: 1 }));
            }}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${unreadOnly ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {unreadOnly ? `Unread only (${unreadCountLocal})` : "Show unread only"}
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await markAllNotificationsRead();
                setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
              } catch {
                void 0;
              }
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Mark all as read
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {notifications.length ? (
          <div className="divide-y divide-gray-200">
            {notifications.map((n) => (
              <div key={n?._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!n?.readStatus ? (
                        <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" />
                      ) : null}
                      <div className="text-sm font-semibold text-gray-900 truncate">{n?.title || "Notification"}</div>
                    </div>
                    <div className="mt-1 text-sm text-gray-700">{n?.message || ""}</div>
                    <div className="mt-2 text-xs text-gray-500">{formatDateTime(n?.createdAt)}</div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={!!n?.readStatus}
                      onClick={async () => {
                        if (!n?._id) return;
                        if (n?.readStatus) return;
                        try {
                          await markNotificationRead(n._id);
                          setNotifications((prev) =>
                            prev.map((x) => (String(x?._id) === String(n._id) ? { ...x, readStatus: true } : x))
                          );
                        } catch {
                          void 0;
                        }
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <div className="text-sm font-semibold text-gray-900">No notifications yet</div>
            <div className="mt-1 text-sm text-gray-600">Notifications will appear here when events happen in your account.</div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setPagination((p) => ({ ...p, currentPage: Math.max(1, Number(p.currentPage || 1) - 1) }))}
          disabled={!pagination?.prevPage && Number(pagination?.currentPage || 1) <= 1}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Prev
        </button>
        <div className="text-sm text-gray-600">Page {pagination?.currentPage || 1} of {pagination?.totalPages || 1}</div>
        <button
          type="button"
          onClick={() => setPagination((p) => ({ ...p, currentPage: Math.min(Number(p.totalPages || 1), Number(p.currentPage || 1) + 1) }))}
          disabled={!pagination?.nextPage && Number(pagination?.currentPage || 1) >= Number(pagination?.totalPages || 1)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default NotificationsPage;
