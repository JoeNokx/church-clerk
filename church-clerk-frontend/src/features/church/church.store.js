import { createContext, useState, createElement } from "react";
import http from "../../shared/services/http.js";

const ChurchContext = createContext(null);

const emptyActiveChurch = {
  _id: null,
  name: "",
  type: "",
  canEdit: false,
  modules: {}
};

export function ChurchProvider({ children }) {
  const [activeChurch, setActiveChurchState] = useState(emptyActiveChurch);

  const setActiveChurch = (churchData) => {
    if (!churchData) {
      localStorage.removeItem("activeChurch");
      setActiveChurchState(emptyActiveChurch);
      return;
    }

    if (churchData?._id) {
      localStorage.setItem("activeChurch", churchData._id);
    }

    setActiveChurchState(churchData);
  };

  const clearActiveChurch = () => {
    localStorage.removeItem("activeChurch");
    setActiveChurchState(emptyActiveChurch);
  };

  const switchChurch = async (churchId) => {
    const previousActiveChurch = localStorage.getItem("activeChurch");

    localStorage.setItem("activeChurch", churchId);

    try {
      const res = await http.get("/user/me");
      const nextActiveChurch = res?.data?.data?.activeChurch;
      setActiveChurch(nextActiveChurch);
      return res?.data?.data;
    } catch (error) {
      if (previousActiveChurch) {
        localStorage.setItem("activeChurch", previousActiveChurch);
      } else {
        localStorage.removeItem("activeChurch");
      }
      throw error;
    }
  };

  return createElement(
    ChurchContext.Provider,
    {
      value: {
        activeChurch,
        setActiveChurch,
        clearActiveChurch,
        switchChurch
      }
    },
    children
  );
}

export default ChurchContext;
