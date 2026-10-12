import { Navigate } from "react-router-dom";

// Legacy stub — active route redirects to /admin/billing/subscriptions via the router.
// This component is kept as a safety fallback.
function SubscriptionsPage() {
  return <Navigate to="/admin/billing/subscriptions" replace />;
}

export default SubscriptionsPage;
