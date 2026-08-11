import { useContext, useState, lazy, Suspense, useEffect } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import { getFollowUpsStats } from "../services/outreach.api.js";

const OverviewTab = lazy(() => import("../components/tabs/OverviewTab.jsx"));
const OutreachesTab = lazy(() => import("../components/tabs/OutreachesTab.jsx"));
const PeopleReachedTab = lazy(() => import("../components/tabs/PeopleReachedTab.jsx"));
const FollowUpsTab = lazy(() => import("../components/tabs/FollowUpsTab.jsx"));
const TeamsTab = lazy(() => import("../components/tabs/TeamsTab.jsx"));
const ReportsTab = lazy(() => import("../components/tabs/ReportsTab.jsx"));

function TabSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
      </div>
      <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "outreaches", label: "Outreaches" },
  { key: "people", label: "People Reached" },
  { key: "followups", label: "Follow-Ups" },
  { key: "teams", label: "Teams" },
  { key: "reports", label: "Reports" },
];

export default function OutreachPage() {
  const { can } = useContext(PermissionContext) || {};
  const canRead = typeof can === "function" ? can("outreach", "read") : true;
  const [tab, setTab] = useState("overview");
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    getFollowUpsStats()
      .then((r) => setOverdueCount(r?.data?.data?.overdue || 0))
      .catch(() => {});
  }, []);

  if (!canRead) {
    return (
      <div className="max-w-6xl">
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <div className="text-sm font-semibold text-gray-600">You do not have permission to access Outreach.</div>
        </div>
      </div>
    );
  }

  const ActiveTab =
    tab === "overview" ? OverviewTab :
    tab === "outreaches" ? OutreachesTab :
    tab === "people" ? PeopleReachedTab :
    tab === "followups" ? FollowUpsTab :
    tab === "teams" ? TeamsTab :
    ReportsTab;

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold text-gray-900 text-xl md:text-3xl">Outreach & Evangelism</h1>
          <p className="mt-1 text-gray-500 text-sm">Plan outreaches, record people reached, and track follow-ups</p>
        </div>
      </div>

      <div className="mt-5 border-b border-gray-200 sticky top-0 bg-slate-50 z-10">
        <div className="flex -mb-px overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
              {t.key === "followups" && overdueCount > 0 ? (
                <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">{overdueCount}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <Suspense fallback={<TabSkeleton />}>
        <ActiveTab />
      </Suspense>
    </div>
  );
}
