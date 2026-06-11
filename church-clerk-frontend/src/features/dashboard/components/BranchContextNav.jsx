import { useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChurchContext from "../../church/church.store.js";
import PermissionContext from "../../permissions/permission.store.js";

// ─── Nav definitions ────────────────────────────────────────────────────────

const PEOPLE_ITEMS = [
  { key: "members",       label: "Members",          mod: "Members",          perm: "members" },
  { key: "attendance",    label: "Attendance",        mod: "Attendance",       perm: "attendance" },
  { key: "programs-events", label: "Programs & Events", mod: "ProgramsEvents", perm: "events" },
  { key: "ministries",    label: "Ministries",        mod: "Ministries",       perm: "ministry" },
  { key: "announcements", label: "Announcements",     mod: "Announcements",    perm: "announcements" },
];

const FINANCE_ITEMS = [
  { key: "tithe",              label: "Tithe",               mod: "Tithe",             perm: "tithe" },
  { key: "offerings",          label: "Offerings",           mod: "Offerings",         perm: "offerings" },
  { key: "expenses",           label: "Expenses",            mod: "Expenses",          perm: "expenses" },
  { key: "budgeting",          label: "Budgeting",           mod: "Budgeting",         perm: "budgeting" },
  { key: "special-funds",      label: "Special Funds",       mod: "SpecialFunds",      perm: "specialFunds" },
  { key: "welfare",            label: "Welfare",             mod: "Welfare",           perm: "welfare" },
  { key: "pledges",            label: "Pledges",             mod: "Pledges",           perm: "pledges" },
  { key: "church-projects",    label: "Church Projects",     mod: "ChurchProjects",    perm: "churchProjects" },
  { key: "business-ventures",  label: "Business Ventures",   mod: "BusinessVentures",  perm: "businessVentures" },
  { key: "financial-statement",label: "Financial Statement", mod: "FinancialStatement",perm: "financialStatement" },
];

const FINANCE_KEYS = new Set(FINANCE_ITEMS.map((i) => i.key));
const PEOPLE_KEYS  = new Set(PEOPLE_ITEMS.map((i) => i.key));

// Groups drive the top-tab row; each group's items drive the sub-tab row
const GROUPS = [
  { key: "overview",  label: "Branch Dashboard",   items: null },
  { key: "people",    label: "People & Ministries", items: PEOPLE_ITEMS },
  { key: "finance",   label: "Finance",             items: FINANCE_ITEMS },
  { key: "reports",   label: "Reports",             items: [{ key: "reports-analytics", label: "Reports & Analytics", mod: "ReportsAnalytics", perm: "reportsAnalytics" }] },
];

// ─── Small icons ─────────────────────────────────────────────────────────────

function IconBranch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 3v12" />
      <path d="M18 9a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M6 21a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M18 9a9 9 0 01-9 9" />
    </svg>
  );
}

function IconExit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function BranchContextNav({ homeChurchName, homeChurchId }) {
  const churchCtx = useContext(ChurchContext);
  const permCtx   = useContext(PermissionContext);
  const location  = useLocation();
  const navigate  = useNavigate();

  // Always use branchChurch for module checks — keeps branch bar independent
  // of whichever context the user last clicked (HQ sidebar or branch bar)
  const branchChurch = churchCtx?.branchChurch;
  const can = permCtx?.can;

  const [exitLoading, setExitLoading] = useState(false);

  // ── Current page ──────────────────────────────────────────────────────────
  const currentPage = useMemo(() => {
    if (location.pathname === "/dashboard/billing") return "billing";
    return new URLSearchParams(location.search).get("page") || "dashboard";
  }, [location]);

  // ── Module + permission helpers (always against branch church) ────────────
  const planAllows = useCallback(
    (mod) => {
      if (!mod) return true;
      const modules = branchChurch?.modules;
      if (!modules || Object.keys(modules).length === 0) return true;
      return Boolean(modules[mod]);
    },
    [branchChurch]
  );

  const canRead = useCallback(
    (perm) => {
      if (!perm) return true;
      if (typeof can !== "function") return true;
      return can(perm, "read");
    },
    [can]
  );

  // ── Which group is active based on current URL ────────────────────────────
  // Only highlight branch-bar items when we are actually IN branch context;
  // if the user clicked a HQ sidebar item, suppress all branch-bar highlights.
  const isInBranchContext = useMemo(
    () =>
      !!(branchChurch?._id &&
        churchCtx?.activeChurch?._id &&
        String(churchCtx.activeChurch._id) === String(branchChurch._id)),
    [branchChurch?._id, churchCtx?.activeChurch?._id]
  );

  const activeGroup = useMemo(() => {
    if (!isInBranchContext) return null;
    if (PEOPLE_KEYS.has(currentPage))  return "people";
    if (FINANCE_KEYS.has(currentPage)) return "finance";
    if (currentPage === "reports-analytics") return "reports";
    return "overview";
  }, [currentPage, isInBranchContext]);

  // ── Visible items per group ───────────────────────────────────────────────
  const visibleGroupItems = useCallback(
    (items) => (items || []).filter((i) => planAllows(i.mod) && canRead(i.perm)),
    [planAllows, canRead]
  );

  // ── Navigate: always switch to branch context first ───────────────────────
  const go = useCallback(
    (key) => {
      churchCtx?.quickSwitchToBranch?.();
      if (key === "dashboard") { navigate("/dashboard"); return; }
      navigate(`/dashboard?page=${key}`);
    },
    [churchCtx, navigate]
  );

  // ── Exit branch ───────────────────────────────────────────────────────────
  const handleExit = useCallback(async () => {
    if (exitLoading || !homeChurchId) return;
    setExitLoading(true);
    try {
      await churchCtx.switchChurch(homeChurchId);
      navigate("/dashboard");
    } catch {
      setExitLoading(false);
    }
  }, [churchCtx, exitLoading, homeChurchId, navigate]);

  const branchName = branchChurch?.name || "Branch";
  const city = branchChurch?.city ? `, ${branchChurch.city}` : "";

  // Sub-tabs to show below the group row
  const subItems = useMemo(() => {
    const group = GROUPS.find((g) => g.key === activeGroup);
    if (!group?.items) return [];
    return visibleGroupItems(group.items);
  }, [activeGroup, visibleGroupItems]);

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white">

      {/* ── Row 1: Identity + exit ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 pt-3 pb-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white md:h-12 md:w-11 w-11 md:w-12">
            <IconBranch />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 truncate text-sm">{branchName}{city}</span>
              <span className="inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Branch
              </span>
            </div>
            <p className="text-gray-400 truncate text-xs">
              Branch of <span className="font-medium text-gray-600">{homeChurchName || "Headquarters"}</span>
              {" · "}Sidebar shows HQ data · Branch bar shows branch data
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExit}
          disabled={exitLoading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-60 text-xs"
        >
          <IconExit />
          {exitLoading ? "Exiting…" : "Exit Branch"}
        </button>
      </div>

      {/* ── Row 2: Group tabs ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <nav className="flex items-end px-2 md:px-4 min-w-max">
          {GROUPS.map((group) => {
            const items = visibleGroupItems(group.items);
            // Hide group if it has defined items but none are visible
            if (group.items !== null && items.length === 0) return null;
            const isActive = activeGroup === group.key;
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => {
                  if (group.key === "overview") { go("dashboard"); return; }
                  if (items.length === 1)        { go(items[0].key); return; }
                  if (items.length > 1)          { go(items[0].key); }
                }}
                className={`relative inline-flex h-11 shrink-0 items-center px-4 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none ${
                  isActive
                    ? "text-blue-700 font-semibold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {group.label}
                {isActive && (
                  <span className="pointer-events-none absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Row 3: Sub-tabs (only when active group has multiple items) ───── */}
      {subItems.length > 1 && (
        <div className="border-t border-gray-100 bg-gray-50/60 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <nav className="flex items-center gap-1 px-4 md:px-6 py-1.5 min-w-max">
            {subItems.map((item) => {
              const isActive = currentPage === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => go(item.key)}
                  className={`inline-flex h-7 shrink-0 items-center rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-800 font-semibold"
                      : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

    </div>
  );
}

export default BranchContextNav;
