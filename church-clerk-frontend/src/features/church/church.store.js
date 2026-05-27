import { createContext, useState, createElement, useRef, useEffect } from "react";
import http from "../../shared/services/http.js";

const ChurchContext = createContext(null);

const emptyActiveChurch = {
  _id: null,
  name: "",
  type: "",
  canEdit: false,
  modules: {}
};

function safeParse(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function ChurchProvider({ children }) {
  const [activeChurch, setActiveChurchState] = useState(emptyActiveChurch);

  // hqChurch: full HQ church data saved when HQ admin switches into branch monitoring
  // branchChurch: full branch church data saved when entering monitoring mode
  const [hqChurch,     setHqChurch]     = useState(() => safeParse("hqChurch"));
  const [branchChurch, setBranchChurch] = useState(() => safeParse("branchChurch"));

  // Ref so switchChurch closure always reads the latest activeChurch
  const activeChurchRef = useRef(activeChurch);
  useEffect(() => { activeChurchRef.current = activeChurch; }, [activeChurch]);

  // Persist monitoring state to survive page refreshes
  useEffect(() => {
    if (hqChurch)     localStorage.setItem("hqChurch",     JSON.stringify(hqChurch));
    else              localStorage.removeItem("hqChurch");
  }, [hqChurch]);

  useEffect(() => {
    if (branchChurch) localStorage.setItem("branchChurch", JSON.stringify(branchChurch));
    else              localStorage.removeItem("branchChurch");
  }, [branchChurch]);

  const setActiveChurch = (churchData) => {
    if (!churchData) {
      localStorage.removeItem("activeChurch");
      setActiveChurchState(emptyActiveChurch);
      return;
    }
    if (churchData?._id) localStorage.setItem("activeChurch", churchData._id);
    setActiveChurchState(churchData);
  };

  const clearActiveChurch = () => {
    localStorage.removeItem("activeChurch");
    localStorage.removeItem("hqChurch");
    localStorage.removeItem("branchChurch");
    setActiveChurchState(emptyActiveChurch);
    setHqChurch(null);
    setBranchChurch(null);
  };

  const switchChurch = async (churchId) => {
    const previousId   = localStorage.getItem("activeChurch");
    const currentChurch = activeChurchRef.current;

    localStorage.setItem("activeChurch", churchId);

    try {
      const res = await http.get("/user/me");
      const next = res?.data?.data?.activeChurch;

      // Entering branch monitoring: HQ → Branch
      if (next?.type === "Branch" && currentChurch?.type === "Headquarters") {
        setHqChurch({ ...currentChurch });
        setBranchChurch(next);
      }
      // Exiting monitoring: back to HQ
      else if (next?.type === "Headquarters") {
        setHqChurch(null);
        setBranchChurch(null);
      }

      setActiveChurch(next);
      return res?.data?.data;
    } catch (error) {
      if (previousId) localStorage.setItem("activeChurch", previousId);
      else            localStorage.removeItem("activeChurch");
      throw error;
    }
  };

  // Instantly swap to HQ context — no network call, used by sidebar clicks
  const quickSwitchToHq = () => {
    if (!hqChurch?._id) return;
    localStorage.setItem("activeChurch", hqChurch._id);
    setActiveChurchState(hqChurch);
  };

  // Instantly swap to branch context — no network call, used by branch bar clicks
  const quickSwitchToBranch = () => {
    if (!branchChurch?._id) return;
    localStorage.setItem("activeChurch", branchChurch._id);
    setActiveChurchState(branchChurch);
  };

  // True when HQ is actively monitoring a branch (both church snapshots are stored)
  const isMonitoringBranch = !!(hqChurch?._id && branchChurch?._id);

  return createElement(
    ChurchContext.Provider,
    {
      value: {
        activeChurch,
        setActiveChurch,
        clearActiveChurch,
        switchChurch,
        quickSwitchToHq,
        quickSwitchToBranch,
        hqChurch,
        branchChurch,
        isMonitoringBranch
      }
    },
    children
  );
}

export default ChurchContext;
