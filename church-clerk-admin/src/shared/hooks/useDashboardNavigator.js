import { useLocation, useNavigate, useParams } from "react-router-dom";

export function useDashboardNavigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const basePath = id ? `/admin/churches/${id}` : "/admin/churches";

  const toPage = (page, params, options) => {
    const p = String(page || "").trim();

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
        pathname: basePath || location.pathname,
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
