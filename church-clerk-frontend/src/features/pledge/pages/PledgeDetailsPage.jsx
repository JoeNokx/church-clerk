import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";

import PledgeDetailsModal from "../components/PledgeDetailsModal.jsx";

// Pledge details now live in a popup modal. This page remains only so that
// existing deep links (e.g. global search) keep working — it renders the same
// content inside the modal and returns to Fundraising when closed.
function PledgeDetailsPage() {
  const location = useLocation();
  const { toPage } = useDashboardNavigator();

  const pledgeId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search]);

  if (!pledgeId) {
    toPage("fundraising");
    return null;
  }

  return (
    <div className="max-w-6xl">
      <PledgeDetailsModal
        open
        pledgeId={pledgeId}
        view="details"
        onClose={() => toPage("fundraising")}
      />
    </div>
  );
}

export default PledgeDetailsPage;
