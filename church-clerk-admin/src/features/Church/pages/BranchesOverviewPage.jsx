import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChurchContext from "../church.store.js";
import { getMyBranches } from "../services/church.api.js";

function KpiCard({ label, value, valueClassName }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className={`mt-3 text-2xl font-semibold ${valueClassName || "text-gray-900"}`}>{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}

function BranchesOverviewPage() {
  const navigate = useNavigate();
  const churchStore = useContext(ChurchContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [kpis, setKpis] = useState({ totalBranches: 0, totalMembers: 0, activeBranches: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  const activeChurch = churchStore?.activeChurch;
  const activeChurchName = activeChurch?.name || "";

  const canViewBranches = useMemo(() => {
    return String(activeChurch?.type || "") === "Headquarters";
  }, [activeChurch?.type]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      if (!canViewBranches) {
        setBranches([]);
        setPagination(null);
        setKpis({ totalBranches: 0, totalMembers: 0, activeBranches: 0 });
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
          <div className="text-2xl font-semibold text-gray-900">Branches Overview</div>
          <div className="mt-1 text-sm text-gray-600">View branches for this headquarters church.</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-900">Currently viewing</div>
        <div className="mt-1 text-sm text-gray-600">{activeChurchName || "—"}</div>
      </div>

      {!canViewBranches ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Branch listing is available only when viewing a headquarters church.
        </div>
      ) : null}

      {canViewBranches && error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {canViewBranches ? (
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Total Branches" value={kpis.totalBranches} />
            <KpiCard label="Total Members (All Branches)" value={kpis.totalMembers} valueClassName="text-blue-900" />
            <KpiCard label="Active Branches" value={kpis.activeBranches} valueClassName="text-green-700" />
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Search</div>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by church name, location, or pastor"
                className="h-10 w-full sm:w-[420px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {canViewBranches && loading ? (
        <div className="mt-4 text-sm text-gray-600">Loading…</div>
      ) : canViewBranches ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {!branches.length ? (
            <div className="p-5 text-sm text-gray-600">No branches found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="px-6 py-2">Branch</th>
                    <th className="px-6 py-2">Location</th>
                    <th className="px-6 py-2">Pastor</th>
                    <th className="px-6 py-2">Members</th>
                    <th className="px-6 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {branches.map((b, idx) => (
                    <tr key={b?._id ?? `b-${idx}`} className="text-sm text-gray-700">
                      <td className="px-6 py-1.5 text-gray-900">{b?.name || "—"}</td>
                      <td className="px-6 py-1.5">{`${b?.city || ""}${b?.region ? `, ${b.region}` : ""}`.trim() || "—"}</td>
                      <td className="px-6 py-1.5">{b?.pastor || "—"}</td>
                      <td className="px-6 py-1.5 text-blue-700">{Number(b?.memberCount || 0).toLocaleString()}</td>
                      <td className="px-6 py-1.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!b?._id) return;
                              navigate(`/admin/churches/${b._id}`);
                            }}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 px-6 py-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!pagination?.prevPage}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
            >
              Prev
            </button>
            <div className="text-sm text-gray-600">Page {pagination?.currentPage || 1}</div>
            <button
              type="button"
              onClick={onNext}
              disabled={!pagination?.nextPage}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BranchesOverviewPage;
