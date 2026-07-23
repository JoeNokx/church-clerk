import { useContext, useMemo, useRef, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import { OfferingProvider } from "../offering.store.js";
import { OfferingPageInner } from "./OfferingPage.jsx";
import { SpecialFundProvider } from "../../specialFund/specialFund.store.js";
import { SpecialFundPageInner } from "../../specialFund/pages/SpecialFundPage.jsx";

function OfferingFundsPage() {
  const [activeTab, setActiveTab] = useState("offerings");
  const { can } = useContext(PermissionContext) || {};
  const canCreateOffering = useMemo(() => (typeof can === "function" ? can("offerings", "create") : false), [can]);
  const canCreateFund = useMemo(() => (typeof can === "function" ? can("specialFunds", "create") : false), [can]);

  const offeringCreateRef = useRef(null);
  const fundCreateRef = useRef(null);

  return (
    <div className="w-full max-w-6xl">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Offering &amp; Funds</h2>
            <p className="mt-2 text-gray-600 text-sm">Record and manage offerings and special church funds</p>
          </div>
          <div className="shrink-0">
            {activeTab === "offerings" && canCreateOffering && (
              <button
                type="button"
                data-hq-action="true"
                onClick={() => offeringCreateRef.current?.()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Add Offering
              </button>
            )}
            {activeTab === "funds" && canCreateFund && (
              <button
                type="button"
                data-hq-action="true"
                onClick={() => fundCreateRef.current?.()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Add Fund
              </button>
            )}
          </div>
        </div>

        <div className="cck-tab-bar mt-4 flex w-full overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("offerings")}
            className={`shrink-0 whitespace-nowrap px-4 py-1.5 font-semibold rounded-md text-sm ${activeTab === "offerings" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"}`}
          >
            Offerings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("funds")}
            className={`ml-1 shrink-0 whitespace-nowrap px-4 py-1.5 font-semibold rounded-md text-sm ${activeTab === "funds" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"}`}
          >
            Special Funds
          </button>
        </div>
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
