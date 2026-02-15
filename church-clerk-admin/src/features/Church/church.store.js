import { createContext, useEffect, useState, createElement } from "react";
import http from "../../shared/services/http.js";

const ChurchContext = createContext(null);

const LS_ACTIVE_CHURCH = "systemAdminActiveChurch";
const LS_VIEW_CHURCH_MODE = "systemAdminViewChurch";

const emptyActiveChurch = {
  _id: null,
  name: "",
  type: "",
  canEdit: false,
  modules: {}
};

export function ChurchProvider({ children }) {
  const [activeChurch, setActiveChurchState] = useState(emptyActiveChurch);

  useEffect(() => {
    const legacyView = localStorage.getItem("adminViewChurch") === "1";
    const legacyActive = localStorage.getItem("activeChurch");
    const hasNew = localStorage.getItem(LS_VIEW_CHURCH_MODE) === "1";

    if (legacyView && !hasNew) {
      localStorage.setItem(LS_VIEW_CHURCH_MODE, "1");
      if (legacyActive) {
        localStorage.setItem(LS_ACTIVE_CHURCH, legacyActive);
      }
    }
  }, []);

  const setActiveChurch = (churchData) => {
    if (!churchData) {
      localStorage.removeItem(LS_ACTIVE_CHURCH);
      setActiveChurchState(emptyActiveChurch);
      return;
    }

    if (churchData?._id) {
      localStorage.setItem(LS_ACTIVE_CHURCH, churchData._id);
    }

    setActiveChurchState(churchData);
  };

  const clearActiveChurch = () => {
    localStorage.removeItem(LS_ACTIVE_CHURCH);
    setActiveChurchState(emptyActiveChurch);
  };

  const enterChurchView = async (churchId) => {
    if (!churchId) return;
    localStorage.setItem(LS_VIEW_CHURCH_MODE, "1");
    const previousActiveChurch = localStorage.getItem(LS_ACTIVE_CHURCH);
    localStorage.setItem(LS_ACTIVE_CHURCH, churchId);

    try {
      const res = await http.get("/user/me");
      const nextActiveChurch = res?.data?.data?.activeChurch;
      setActiveChurch(nextActiveChurch);
      return res?.data?.data;
    } catch (error) {
      if (previousActiveChurch) {
        localStorage.setItem(LS_ACTIVE_CHURCH, previousActiveChurch);
      } else {
        localStorage.removeItem(LS_ACTIVE_CHURCH);
      }
      throw error;
    }
  };

  const exitChurchView = () => {
    localStorage.removeItem(LS_VIEW_CHURCH_MODE);
    clearActiveChurch();
  };

  return createElement(
    ChurchContext.Provider,
    {
      value: {
        activeChurch,
        setActiveChurch,
        clearActiveChurch,
        enterChurchView,
        exitChurchView
      }
    },
    children
  );
}

export default ChurchContext;
