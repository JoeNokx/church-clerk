import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import http from "../../../shared/services/http.js";
import MinistryPlusCustomPlanModal from "../../../shared/components/MinistryPlusCustomPlanModal.jsx";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { getUsdToGhsRate } from "../../../shared/utils/fx.js";

function formatCurrency(amount, currency) {
  return formatMoney(amount, currency);
}

function LandingPage() {
  const [plans, setPlans] = useState([]);
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showCustomPlanModal, setShowCustomPlanModal] = useState(false);
  const [visitorIsGhana, setVisitorIsGhana] = useState(true);
  const [usdToGhs, setUsdToGhs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPlans(true);
      try {
        const res = await http.get("/subscription/public/plans");
        if (cancelled) return;
        setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : []);
      } catch {
        if (cancelled) return;
        setPlans([]);
      } finally {
        if (cancelled) return;
        setLoadingPlans(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (visitorIsGhana) {
        setUsdToGhs(null);
        return;
      }

      try {
        const rate = await getUsdToGhsRate();
        if (cancelled) return;
        setUsdToGhs(rate);
      } catch {
        if (cancelled) return;
        setUsdToGhs(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visitorIsGhana]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
        if (!res.ok) throw new Error("geo lookup failed");
        const json = await res.json();
        if (cancelled) return;
        const code = String(json?.country || "").trim().toUpperCase();
        const name = String(json?.country_name || "").trim().toLowerCase();
        const isGhana = code === "GH" || name === "ghana";
        setVisitorIsGhana(isGhana);
      } catch {
        if (cancelled) return;
        setVisitorIsGhana(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const plansSorted = useMemo(() => {
    const rows = Array.isArray(plans) ? plans : [];
    const order = { "free lite": 0, basic: 1, standard: 2, premium: 3 };
    return rows.slice().sort((a, b) => {
      const aName = String(a?.name || "").toLowerCase();
      const bName = String(b?.name || "").toLowerCase();
      const aRank = Number.isFinite(order[aName]) ? order[aName] : 99;
      const bRank = Number.isFinite(order[bName]) ? order[bName] : 99;
      if (aRank !== bRank) return aRank - bRank;
      return aName.localeCompare(bName);
    });
  }, [plans]);

  const displayCurrency = visitorIsGhana || !usdToGhs ? "GHS" : "USD";

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main>
        <section className="bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20 text-center">
            <h1 className="text-3xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
              Run your church admin in one simple system
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Manage members, attendance, and giving with clear records your team can trust—without spreadsheets.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg bg-blue-900 text-white text-sm font-semibold px-5 py-3 shadow-sm hover:bg-blue-800"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg border border-gray-300 text-gray-800 text-sm font-semibold px-5 py-3 hover:bg-gray-50"
              >
                Login
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 border-t border-gray-200">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900">Built for real ministry admin</h2>
              <p className="mt-2 text-sm text-gray-600">
                Everything you need to stay organized, accountable, and consistent.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900">Member records that stay clean</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Capture profiles, contacts, and church assignments so your data stays complete and easy to find.
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900">Attendance you can trust</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Track service attendance and follow-ups with consistent reporting for leaders and teams.
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900">Simple giving and finance tracking</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Record tithes and offerings with clear summaries so you can report with confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border-t border-gray-200">
          <div className="mx-auto w-full max-w-6xl px-4 py-14">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900">Pricing that scales with your team</h2>
              <p className="mt-2 text-sm text-gray-600">Start simple, upgrade when you’re ready.</p>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3">
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setBillingInterval("monthly")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    billingInterval === "monthly" ? "bg-blue-900 text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("halfYear")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    billingInterval === "halfYear" ? "bg-blue-900 text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  6 months
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("yearly")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    billingInterval === "yearly" ? "bg-blue-900 text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="mt-10">
              {loadingPlans ? (
                <div className="text-center text-sm text-gray-600">Loading plans…</div>
              ) : null}

              {!loadingPlans && plansSorted.length === 0 ? (
                <div className="text-center text-sm text-gray-600">No plans available right now.</div>
              ) : null}

              {!loadingPlans && plansSorted.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
                  {plansSorted.map((p) => {
                    const id = p?._id;
                    const name = String(p?.name || "");
                    const isMostPopular = name.toLowerCase() === "standard";
                    const ghsPrice = p?.pricing?.GHS?.[billingInterval] ?? p?.priceByCurrency?.GHS?.[billingInterval] ?? 0;
                    const displayPrice = !visitorIsGhana && usdToGhs ? Number(ghsPrice || 0) / Number(usdToGhs || 1) : ghsPrice;
                    const per = billingInterval === "monthly" ? "/month" : billingInterval === "halfYear" ? "/6 months" : "/year";

                    return (
                      <div
                        key={id}
                        className={`relative rounded-2xl bg-white p-6 flex flex-col ${
                          isMostPopular ? "shadow-md ring-2 ring-blue-900" : "shadow-sm ring-1 ring-gray-200"
                        }`}
                      >
                        {isMostPopular ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-900 px-3 py-1 text-[10px] font-semibold text-white">
                            Most Popular
                          </div>
                        ) : null}

                        <div className="text-lg font-semibold text-gray-900">{name || "—"}</div>
                        <div className="mt-4 flex items-end gap-2">
                          <span className="text-3xl font-semibold text-gray-900">{formatCurrency(displayPrice, displayCurrency)}</span>
                          <span className="text-sm text-gray-500">{per}</span>
                        </div>

                        <div className="mt-6 space-y-2 text-sm text-gray-600">
                          <div>{p?.memberLimit === null ? "Unlimited members" : `Up to ${Number(p?.memberLimit || 0).toLocaleString()} members`}</div>
                          <div>Member management</div>
                          <div>Attendance tracking</div>
                          <div>Finance module access</div>
                        </div>

                        <div className="mt-6">
                          <Link
                            to="/register"
                            className={`w-full inline-flex justify-center items-center rounded-lg text-sm font-semibold px-4 py-2.5 shadow-sm ${
                              isMostPopular
                                ? "bg-blue-900 text-white hover:bg-blue-800"
                                : "border border-blue-900 text-blue-900 hover:bg-blue-50"
                            }`}
                          >
                            Get started
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="mt-10 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
              <div className="text-base font-semibold text-gray-900">Need a fully customized church management solution?</div>
              <div className="mt-2 text-sm text-gray-700">
                With Ministry Plus, get a tailor-made system built specifically for your church’s needs. Features, workflows, and integrations — all designed just for you.
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomPlanModal(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  Contact us for a custom plan
                </button>
              </div>
            </div>

            <MinistryPlusCustomPlanModal open={showCustomPlanModal} onClose={() => setShowCustomPlanModal(false)} defaultEmail="" />
          </div>
        </section>

        <section className="bg-blue-900">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center">
            <p className="text-white text-lg font-medium">
              Ready to set up your church and start organizing your records today?
            </p>
            <div className="mt-6">
              <Link
                to="/register"
                className="inline-flex justify-center items-center rounded-lg bg-white text-blue-900 text-sm font-semibold px-6 py-3 shadow-sm hover:bg-gray-100"
              >
                Create your account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

export default LandingPage;
