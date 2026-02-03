import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext, { MemberProvider } from "../member.store.js";
import MemberFilters from "../components/MemberFilters.jsx";
import MemberTable from "../components/MemberTable.jsx";
import { getMembersKPI } from "../services/member.api.js";

function KpiCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{typeof value === "number" ? value : 0}</div>
    </div>
  );
}

function MembersPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberContext);
  const location = useLocation();
  const navigate = useNavigate();

  const canCreate = useMemo(() => (typeof can === "function" ? can("members", "create") : false), [can]);

  const [kpiLoading, setKpiLoading] = useState(false);
  const [memberKPI, setMemberKPI] = useState(null);

  const refreshMembers = useCallback(async () => {
    await store?.fetchMembers?.();
  }, [store]);

  useEffect(() => {
    if (!store?.activeChurch) return;
    refreshMembers();
  }, [store?.activeChurch]);

  useEffect(() => {
    if (!store?.activeChurch) return;

    let cancelled = false;

    (async () => {
      setKpiLoading(true);
      try {
        const res = await getMembersKPI();
        const payload = res?.data?.data ?? res?.data;
        const kpi = payload?.memberKPI || payload;
        if (cancelled) return;
        setMemberKPI(kpi || null);
      } catch (e) {
        if (cancelled) return;
        setMemberKPI(null);
      } finally {
        if (cancelled) return;
        setKpiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.activeChurch]);

  useEffect(() => {
    const state = location.state;
    const prefill = state?.prefillMember || null;

    if (!prefill) return;

    navigate("/dashboard?page=member-form", {
      state: {
        prefillMember: prefill
      }
    });
  }, [location.pathname, location.search, location.state, navigate]);

  const openCreate = () => {
    navigate("/dashboard?page=member-form");
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Members</h2>
          <p className="mt-2 text-sm text-gray-600">Track and manage church members</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              Add Member
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpiLoading ? (
            <div className="text-sm text-gray-600 sm:col-span-2 lg:col-span-4">Loading KPI...</div>
          ) : (
            <>
              <KpiCard label="Total Members" value={memberKPI?.totalMembers} />
              <KpiCard label="Active Members" value={memberKPI?.currentMembers} />
              <KpiCard label="Inactive Members" value={memberKPI?.inactiveMembers} />
              <KpiCard label="New This Month" value={memberKPI?.newMembersThisMonth} />
            </>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Members Records</div>
            <div className="text-xs text-gray-500">All members and their details</div>
          </div>

          <MemberFilters />
        </div>

        <MemberTable onDeleted={refreshMembers} />
      </div>
    </div>
  );
}

function MembersPage() {
  return (
    <MemberProvider>
      <MembersPageInner />
    </MemberProvider>
  );
}

export default MembersPage;
