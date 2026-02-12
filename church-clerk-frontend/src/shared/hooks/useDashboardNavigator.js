import { useNavigate } from "react-router-dom";

export function useDashboardNavigator() {
  const navigate = useNavigate();

  const basePath = "/dashboard";

  const toPage = (page, params, options) => {
    const p = String(page || "").trim();

    if (p === "billing") {
      navigate("/dashboard/billing", options);
      return;
    }

    const search = new URLSearchParams();

    if (p && p !== "dashboard") {
      search.set("page", p);
    }

    if (params && typeof params === "object") {
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        search.set(k, String(v));
      });
    }

    const searchString = search.toString();
    navigate(
      {
        pathname: basePath,
        search: searchString ? `?${searchString}` : ""
      },
      options
    );
  };

  return {
    basePath,
    toPage
  };
}
