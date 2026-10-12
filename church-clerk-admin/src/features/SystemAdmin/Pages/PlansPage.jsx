import { Navigate } from "react-router-dom";

// Legacy stub — active route redirects to /admin/billing/plans via the router.
// This component is kept as a safety fallback.
function PlansPage() {
  return <Navigate to="/admin/billing/plans" replace />;
}

export default PlansPage;
