import { useCallback, useEffect, useState } from "react";
import { getMemberMissedServices } from "../services/attendance.api.js";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDay(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

/**
 * Popup listing the specific services a member was marked absent for,
 * scoped to the filters active on the absentees tab that opened it.
 */
function MissedServicesModal({ member, serviceType = "", year = "", month = "", onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, prevPage: null, nextPage: null });
  const [limit, setLimit] = useState(10);
  const [memberInfo, setMemberInfo] = useState(member || null);

  const memberId = member?._id || member;
  const memberName = memberInfo
    ? `${memberInfo?.firstName || ""} ${memberInfo?.lastName || ""}`.trim() || "-"
    : "-";
  const memberLocation = memberInfo
    ? [memberInfo?.streetAddress, memberInfo?.city].filter(Boolean).join(", ") || "-"
    : "-";

  const load = useCallback(async (page = 1, lim = limit) => {
    if (!memberId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getMemberMissedServices(memberId, {
        page,
        limit: lim,
        serviceType: serviceType || undefined,
        year: year || undefined,
        month: month || undefined,
      });
      const payload = res?.data?.data ?? res?.data;
      setRows(Array.isArray(payload?.services) ? payload.services : []);
      setPagination(payload?.pagination || { currentPage: page, prevPage: null, nextPage: null });
      if (payload?.member) setMemberInfo(payload.member);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load missed services");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [memberId, limit, serviceType, year, month]);

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 py-4 shrink-0">
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm">Missed Services</div>
            <div className="text-gray-500 text-xs mt-0.5 truncate">
              {memberName}{memberInfo?.phoneNumber ? ` · ${memberInfo.phoneNumber}` : ""} · {memberLocation}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {error ? (
            <div className="p-4 md:p-6">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
            </div>
          ) : loading ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : !rows.length ? (
            <EmptyState
              compact
              illustration="attendance"
              title="No missed services"
              description="This member hasn't been marked absent for any service in this period."
            />
          ) : (
            <div className="relative overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left font-semibold text-gray-500 text-xs">
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Service</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Speaker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((s, i) => (
                    <tr key={String(s?._id ?? i)} className="max-md:text-xs text-gray-700 text-sm">
                      <td className="max-md:px-4 py-2.5 text-gray-900 whitespace-nowrap px-4 md:px-6">
                        <span className="font-medium">{formatDay(s?.date) || "-"},</span> {formatDate(s?.date)}
                      </td>
                      <td className="max-md:px-4 py-2.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{s?.serviceType || "-"}</td>
                      <td className="max-md:px-4 py-2.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{s?.mainSpeaker || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && rows.length > 0 ? (
          <div className="border-t border-gray-200 shrink-0">
            <Pagination
              pagination={pagination}
              rowsCount={rows.length}
              limit={limit}
              onLimitChange={(n) => setLimit(n)}
              onPageChange={(p) => load(p)}
              itemName="services"
              filtered={Boolean(serviceType || month || (year && year !== String(new Date().getFullYear())))}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default MissedServicesModal;
