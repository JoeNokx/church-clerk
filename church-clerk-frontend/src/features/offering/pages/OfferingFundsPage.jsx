import { useContext, useMemo, useRef, useState } from "react";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import { OfferingProvider } from "../offering.store.js";
import { OfferingPageInner } from "./OfferingPage.jsx";
import { SpecialFundProvider } from "../../specialFund/specialFund.store.js";
import { SpecialFundPageInner } from "../../specialFund/pages/SpecialFundPage.jsx";

function OfferingFundsPage() {
  const [activeTab, setActiveTab] = useState("offerings");
  const guarded = useGuardedAction();

  const offeringCreateRef = useRef(null);
  const fundCreateRef = useRef(null);

  return (
    <div className="w-full max-w-6xl">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Offering &amp; Funds</h2>
            <p className="mt-2 text-gray-600 text-sm hidden md:block">Record and manage offerings and special church funds</p>
          </div>
          <div className="shrink-0">
            {activeTab === "offerings" && (
              <button
                type="button"
                data-hq-action="true"
                onClick={() => guarded(() => offeringCreateRef.current?.(), "offerings", "create")}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Add Offering
              </button>
            )}
            {activeTab === "funds" && (
              <button
                type="button"
                data-hq-action="true"
                onClick={() => guarded(() => fundCreateRef.current?.(), "specialFunds", "create")}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Add Fund
              </button>
            )}
          </div>
        </div>

        <PageTabs
          tabs={[
            { key: "offerings", label: "Offerings" },
            { key: "funds", label: "Special Funds" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          sticky={false}
          className="mt-4"
        />
      </div>

      {activeTab === "offerings" ? (
        <OfferingProvider>
          <OfferingPageInner noHeader embedded openCreateRef={offeringCreateRef} />
        </OfferingProvider>
      ) : (
        <SpecialFundProvider>
          <SpecialFundPageInner noHeader embedded openCreateRef={fundCreateRef} />
        </SpecialFundProvider>
      )}
    </div>
  );
}

export default OfferingFundsPage;
