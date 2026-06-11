import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import ChurchContext from "../church.store.js";
import { getMyBranches } from "../services/church.api.js";
import ConfirmChurchSwitchModal from "../../../shared/components/ConfirmChurchSwitchModal.jsx";
import Skeleton from "react-loading-skeleton";

function BranchesOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const churchStore = useContext(ChurchContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [kpis, setKpis] = useState({ totalBranches: 0, totalMembers: 0, activeBranches: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState(null);
  const [switching, setSwitching] = useState(false);
  const limit = 10;

  const activeChurch = churchStore?.activeChurch;
  const activeChurchName = activeChurch?.name || "";

  const canViewBranches = activeChurch?.type === "Headquarters" && activeChurch?.canEdit !== false;

  const homeChurchId = useMemo(() => {
    const c = user?.church;
    if (!c) return null;
    return typeof c === "string" ? c : c?._id || null;
  }, [user]);

  const homeChurchName = useMemo(() => {
    const c = user?.church;
    if (!c) return "";
    if (typeof c === "string") return "";
    return c?.name || "";
  }, [user]);

  const switchTo = async (churchId) => {
    if (!churchId || typeof churchStore?.switchChurch !== "function") return;

    try {
      await churchStore.switchChurch(churchId);
      navigate("/dashboard");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to switch church");
    }
  };

  const openConfirm = (payload) => {
    if (!payload?.id) return;
    setPendingSwitch({
      id: payload.id,
      name: payload?.name || "",
      mode: payload?.mode || "branch"
    });
    setConfirmOpen(true);
  };

  const openConfirmBranch = (church) => {
    if (!church?._id) return;
    const city = String(church?.city || "").trim();
    const displayName = city ? `${church?.name || ""} - ${city}` : (church?.name || "");
    openConfirm({ id: church._id, name: displayName, mode: "branch" });
  };

  const openConfirmHq = (churchId) => {
    if (!churchId) return;
    const displayName = `${homeChurchName || "Headquarters"} - headquarters`;
    openConfirm({ id: churchId, name: displayName, mode: "hq" });
  };

  const cancelConfirm = () => {
    if (switching) return;
    setConfirmOpen(false);
    setPendingSwitch(null);
  };

  const confirmSwitch = async () => {
    const churchId = pendingSwitch?.id;
    if (!churchId) return;
    setSwitching(true);
    try {
      await switchTo(churchId);
    } finally {
      setSwitching(false);
      setConfirmOpen(false);
      setPendingSwitch(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      if (!canViewBranches) {
        setBranches([]);
        setError("");
        setPagination(null);
        setPage(1);
        setLoading(false);
        return;
      }

      try {
        const res = await getMyBranches({ page, limit, search });
        const payload = res?.data?.data ?? res?.data;
        const rows = Array.isArray(payload?.branches) ? payload.branches : Array.isArray(payload) ? payload : [];
        const pg = payload?.pagination || null;
        const nextKpis = payload?.kpis || null;
        if (!cancelled) setBranches(rows);
        if (!cancelled) setPagination(pg);
        if (!cancelled && nextKpis) {
          setKpis({
            totalBranches: Number(nextKpis?.totalBranches || 0),
            totalMembers: Number(nextKpis?.totalMembers || 0),
            activeBranches: Number(nextKpis?.activeBranches || 0)
          });
        }
      } catch (e) {
        if (cancelled) return;
        setBranches([]);
        setError(e?.response?.data?.message || e?.message || "Failed to load branches");
        setPagination(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [canViewBranches, page, search]);

  const onPrev = () => {
    const prev = pagination?.prevPage;
    if (!prev) return;
    setPage(prev);
  };

  const onNext = () => {
    const next = pagination?.nextPage;
    if (!next) return;
    setPage(next);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Branches Overview</div>
          <div className="mt-1 text-gray-600 text-sm">View branches and switch your active context.</div>
        </div>

        {homeChurchId && String(activeChurch?._id || "") !== String(homeChurchId) ? (
          <button
            type="button"
            onClick={() => openConfirmHq(homeChurchId)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
          >
            Back to {homeChurchName || "Headquarters"}
          </button>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="font-semibold text-gray-900 text-sm">Currently viewing</div>
        <div className="mt-1 text-gray-600 text-sm">{activeChurchName || "—"}</div>
        {activeChurch?.canEdit === false ? (
          <div className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 text-xs">
            Read-only mode
          </div>
        ) : null}
      </div>

      {!canViewBranches ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 text-sm">
          Branch listing is available only in Headquarters context. Switch back to your headquarters context.
        </div>
      ) : null}

      {canViewBranches && error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
      ) : null}

      {canViewBranches ? (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="font-semibold text-gray-500 text-xs">Total Branches</div>
              <div className="mt-3 font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">{Number(kpis.totalBranches || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="font-semibold text-gray-500 text-xs">Total Members (All Branches)</div>
              <div className="mt-3 font-semibold text-blue-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">{Number(kpis.totalMembers || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="font-semibold text-gray-500 text-xs">Active Branches</div>
              <div className="mt-3 font-semibold text-green-700 md:text-3xl lg:text-4xl text-xl md:text-2xl">{Number(kpis.activeBranches || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="font-semibold text-gray-900 text-sm">Search</div>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by church name, location, or pastor"
                className="h-11 w-full md:w-[420px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="h-11 rounded-lg border border-gray-200 bg-white px-4 font-semibold text-gray-700 hover:bg-gray-50 md:h-12 text-sm"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {canViewBranches && loading ? (
        <div className="mt-4">
          <Skeleton height={14} count={4} />
        </div>
      ) : canViewBranches ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {!branches.length ? (
            <div className="p-4 text-gray-600 md:p-6 lg:p-8 text-sm">No branches found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Branch</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Location</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Pastor</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Members</th>
                    <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {branches.map((b, idx) => (
                    <tr key={b?._id ?? `b-${idx}`} className="max-md:text-xs text-gray-700 text-sm">
                      <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{b?.name || "—"}</td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{`${b?.city || ""}${b?.region ? `, ${b.region}` : ""}`.trim() || "—"}</td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{b?.pastor || "—"}</td>
                      <td className="max-md:px-4 py-1.5 text-blue-700 whitespace-nowrap px-4 md:px-6">{Number(b?.memberCount || 0).toLocaleString()}</td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openConfirmBranch(b)}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 max-md:px-4 py-2 px-4 md:px-6">
            <button
              type="button"
              onClick={onPrev}
              disabled={!pagination?.prevPage}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
            >
              Prev
            </button>
            <div className="text-gray-600 text-sm">Page {pagination?.currentPage || 1}</div>
            <button
              type="button"
              onClick={onNext}
              disabled={!pagination?.nextPage}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmChurchSwitchModal
        open={confirmOpen}
        churchDisplayName={pendingSwitch?.name}
        mode={pendingSwitch?.mode}
        onCancel={cancelConfirm}
        onConfirm={confirmSwitch}
        loading={switching}
      />
    </div>
  );
}

export default BranchesOverviewPage;
