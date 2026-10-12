import { Navigate } from "react-router-dom";

// Legacy stub — active route redirects to /admin/billing/payments via the router.
// This component is kept as a safety fallback.
function BillingHistoryPage() {
  return <Navigate to="/admin/billing/payments" replace />;
}

export default BillingHistoryPage;
