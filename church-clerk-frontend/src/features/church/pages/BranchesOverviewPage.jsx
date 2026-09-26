import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import ChurchContext from "../church.store.js";
import ConfirmChurchSwitchModal from "../../../shared/components/ConfirmChurchSwitchModal.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import AllBranchesTab from "../components/AllBranchesTab.jsx";
import BranchFinancesTab from "../components/BranchFinancesTab.jsx";
import BranchMembershipTab from "../components/BranchMembershipTab.jsx";
import BranchAttendanceTab from "../components/BranchAttendanceTab.jsx";

function BranchesOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const churchStore = useContext(ChurchContext);

  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

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
    const isHq = Boolean(church?.isHeadquarters);
    const baseName = church?.name || "";
    const displayName = isHq ? `${baseName} - headquarters` : city ? `${baseName} - ${city}` : baseName;
    openConfirm({ id: church._id, name: displayName, mode: isHq ? "hq" : "branch" });
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

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Branches Overview</div>
          <div className="mt-1 text-gray-600 text-sm hidden md:block">Compare branches and switch your active context.</div>
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
          <PageTabs
            tabs={[
              { key: "all", label: "All Branches" },
              { key: "finances", label: "Branch Finances" },
              { key: "membership", label: "Membership" },
              { key: "attendance", label: "Attendance" },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            sticky={false}
          />

          <div className="mt-4">
            {activeTab === "all" ? (
              <AllBranchesTab onViewBranch={openConfirmBranch} />
            ) : activeTab === "finances" ? (
              <BranchFinancesTab currency={activeChurch?.currency || "GHS"} />
            ) : activeTab === "membership" ? (
              <BranchMembershipTab />
            ) : activeTab === "attendance" ? (
              <BranchAttendanceTab />
            ) : null}
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
