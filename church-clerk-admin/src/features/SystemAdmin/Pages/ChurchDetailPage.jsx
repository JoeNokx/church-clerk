import { useContext, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";

import ChurchContext from "../../Church/church.store.js";
import { useAuth } from "../../Auth/useAuth.js";
import { getSystemChurch } from "../Services/systemAdmin.api.js";

function ChurchDashboardHome() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
      Church dashboard view will be implemented inside the admin app.
    </div>
  );
}

function formatChurchDisplayName(church) {
  const name = String(church?.name || "").trim();
  const city = String(church?.city || "").trim();
  if (name && city) return `${name} - ${city}`;
  return name || "—";
}

function TabNav({ items, activeKey, getTo }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Tabs">
      {items.map((it) => (
        <NavLink
          key={it.key}
          to={getTo(it.key)}
          className={({ isActive }) => {
            const active = Boolean(isActive) || activeKey === it.key;
            return active
              ? "rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white"
              : "rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50";
          }}
        >
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}

function ChurchDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuth();
  const churchCtx = useContext(ChurchContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [church, setChurch] = useState(null);

  const page = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("page") || "dashboard";
    return raw === "offering" ? "offerings" : raw;
  }, [location.search]);

  const isHeadquarters = String(church?.type || "") === "Headquarters";

  const mainTabs = useMemo(
    () => {
      const list = [
        { key: "dashboard", label: "Dashboard" },
        { key: "people", label: "People & Ministries" },
        { key: "finance", label: "Finance" },
        { key: "admin", label: "Administration" }
      ];
      if (isHeadquarters) list.push({ key: "branches", label: "Branches" });
      return list;
    },
    [isHeadquarters]
  );

  const derivedMainTab = useMemo(() => {
    if (page === "dashboard") return "dashboard";
    if (page === "branches-overview") return "branches";
    if (
      [
        "members",
        "attendance",
        "programs-events",
        "ministries",
        "announcements",
        "member-form",
        "member-details",
        "event-details",
        "event-create",
        "event-edit",
        "ministry-details"
      ].includes(page)
    ) {
      return "people";
    }
    if (
      [
        "tithe",
        "church-projects",
        "church-project-details",
        "special-funds",
        "offerings",
        "welfare",
        "pledges",
        "pledge-details",
        "business-ventures",
        "business-venture-details",
        "expenses",
        "financial-statement"
      ].includes(page)
    ) {
      return "finance";
    }
    if (["reports-analytics", "billing", "referrals", "settings", "support-help"].includes(page)) return "admin";
    return "dashboard";
  }, [page]);

  const peopleSubTabs = useMemo(
    () => [
      { key: "members", label: "Members" },
      { key: "attendance", label: "Attendance" },
      { key: "programs-events", label: "Programs & Events" },
      { key: "ministries", label: "Ministries" },
      { key: "announcements", label: "Announcements" }
    ],
    []
  );

  const financeSubTabs = useMemo(
    () => [
      { key: "tithe", label: "Tithe" },
      { key: "church-projects", label: "Church Projects" },
      { key: "special-funds", label: "Special Fund" },
      { key: "offerings", label: "Offerings" },
      { key: "welfare", label: "Welfare" },
      { key: "pledges", label: "Pledges" },
      { key: "business-ventures", label: "Business Ventures" },
      { key: "expenses", label: "Expenses" },
      { key: "financial-statement", label: "Financial Statement" }
    ],
    []
  );

  const adminSubTabs = useMemo(
    () => [
      { key: "reports-analytics", label: "Report & Analytics" },
      { key: "billing", label: "Billing" },
      { key: "referrals", label: "Referrals" },
      { key: "settings", label: "Settings" },
      { key: "support-help", label: "Support & Help" }
    ],
    []
  );

  const makeToPage = (nextPage) => {
    const params = new URLSearchParams(location.search);
    if (!nextPage || nextPage === "dashboard") {
      params.delete("page");
    } else {
      params.set("page", nextPage);
    }
    const search = params.toString();
    return { pathname: location.pathname, search: search ? `?${search}` : "" };
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const res = await getSystemChurch(id);
        const data = res?.data?.data || null;
        if (!cancelled) setChurch(data);

        if (typeof churchCtx?.enterChurchView === "function") {
          await churchCtx.enterChurchView(id);
        }
      } catch (e) {
        if (cancelled) return;
        setChurch(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load church");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      churchCtx?.exitChurchView?.();
    };
  }, []);

  const displayName = useMemo(() => formatChurchDisplayName(church), [church]);

  const activeSubTabs =
    derivedMainTab === "dashboard"
      ? [{ key: "dashboard", label: "Dashboard" }]
      : derivedMainTab === "people"
        ? peopleSubTabs
        : derivedMainTab === "finance"
          ? financeSubTabs
          : derivedMainTab === "branches"
            ? [{ key: "branches-overview", label: "Branches" }]
            : adminSubTabs;

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Church</div>
          <div className="mt-1 text-sm text-gray-600">Viewing this church inside System Admin.</div>
        </div>
        <button
          type="button"
          onClick={() => {
            churchCtx?.exitChurchView?.();
            navigate("/admin/churches");
          }}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to Churches
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="text-sm text-gray-500">Viewing</div>
        <div className="mt-1 text-lg font-semibold text-gray-900">
          <span className="font-bold">{displayName}</span>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <div className="text-gray-500">Type</div>
            <div className="mt-1 font-medium text-gray-900">{church?.type || "—"}</div>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <div className="text-gray-500">Email</div>
            <div className="mt-1 font-medium text-gray-900">{church?.email || "—"}</div>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <div className="text-gray-500">Phone</div>
            <div className="mt-1 font-medium text-gray-900">{church?.phoneNumber || "—"}</div>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <div className="text-gray-500">Pastor</div>
            <div className="mt-1 font-medium text-gray-900">{church?.pastor || "—"}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4">
          <TabNav
            items={mainTabs}
            activeKey={derivedMainTab}
            getTo={(key) => {
              if (key === "dashboard") return makeToPage("dashboard");
              if (key === "people") return makeToPage("members");
              if (key === "finance") return makeToPage("tithe");
              if (key === "branches") return makeToPage("branches-overview");
              return makeToPage("reports-analytics");
            }}
          />

          <TabNav items={activeSubTabs} activeKey={page} getTo={makeToPage} />
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (
          <ChurchDashboardHome />
        )}
      </div>

      <div className="mt-6 text-xs text-gray-500">
        Signed in as: {user?.fullName || "—"} ({user?.role || ""})
      </div>
    </div>
  );
}

export default ChurchDetailPage;
