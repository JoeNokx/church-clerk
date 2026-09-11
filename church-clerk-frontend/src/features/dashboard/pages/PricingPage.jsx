import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import http from "../../../shared/services/http.js";
import PriceCard from "../../../shared/components/PriceCard/index.jsx";
import Spinner from "../../../shared/components/Spinner.jsx";
import { convertGhsToCurrency } from "../../../shared/utils/fx.js";
import { resolveCurrencyFromCountryCode } from "../../../shared/utils/geoCurrency.js";
import { getPlanDescriptionFeatures } from "../../../shared/utils/planDescription.js";

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [visitorCurrency, setVisitorCurrency] = useState("GHS");
  const [ghsToVisitorRate, setGhsToVisitorRate] = useState(1);
  const [fxLoading, setFxLoading] = useState(false);

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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFxLoading(true);
      try {
        const rate = await convertGhsToCurrency(1, visitorCurrency);
        if (cancelled) return;
        const n = Number(rate);
        setGhsToVisitorRate(Number.isFinite(n) && n > 0 ? n : 1);
      } catch {
        if (cancelled) return;
        setGhsToVisitorRate(1);
      } finally {
        if (cancelled) return;
        setFxLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visitorCurrency]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
        if (!res.ok) throw new Error("geo lookup failed");
        const json = await res.json();
        if (cancelled) return;
        const code = String(json?.country_code || json?.country || "").trim().toUpperCase();
        const resolved = resolveCurrencyFromCountryCode(code);
        setVisitorCurrency(resolved?.currency || "GHS");
      } catch {
        if (cancelled) return;
        setVisitorCurrency("GHS");
      }
    })();
    return () => { cancelled = true; };
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

  const displayCurrency = String(visitorCurrency || "USD").trim().toUpperCase() || "USD";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />
      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-50 blur-3xl pointer-events-none" />
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-24 pb-16 text-center md:px-6">
            <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55 }}>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Pricing</span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                Plans that grow{" "}
                <span className="text-blue-600">with your church.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 md:text-lg">
                Start free. Upgrade when you're ready. No hidden fees, no complicated contracts.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-12">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {[{ key: "monthly", label: "Monthly" }, { key: "halfYear", label: "6 Months" }, { key: "yearly", label: "Yearly" }].map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setBillingInterval(key)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${billingInterval === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >{label}</button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Prices shown in <span className="font-semibold text-slate-600">{displayCurrency}</span>
                {fxLoading && <span className="ml-1">(updating…)</span>}
              </p>
            </div>

            <div className="mt-10">
              {loadingPlans && <div className="py-16 text-center text-sm text-slate-500 flex items-center justify-center gap-2"><Spinner size="sm" className="text-slate-400" /> Loading plans…</div>}
              {!loadingPlans && plansSorted.length === 0 && <div className="py-16 text-center text-sm text-slate-500">No plans available right now.</div>}
              {!loadingPlans && plansSorted.length > 0 && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {plansSorted.map((p, idx) => {
                    const id = p?._id;
                    const name = String(p?.name || "");
                    const isMostPopular = name.toLowerCase() === "standard";
                    const ghsPrice = p?.pricing?.GHS?.[billingInterval] ?? p?.priceByCurrency?.GHS?.[billingInterval] ?? 0;
                    const displayPrice = Number(ghsPrice || 0) * Number(ghsToVisitorRate || 1);
                    const per = billingInterval === "monthly" ? "/month" : billingInterval === "halfYear" ? "/6 months" : "/year";
                    const memberLimit = p?.memberLimit;
                    const memberLine = memberLimit === null ? "Unlimited members" : `Up to ${Number(memberLimit || 0).toLocaleString()} members`;
                    const descriptionFeatures = getPlanDescriptionFeatures(p, { max: 5 });
                    const highlights = [memberLine, ...descriptionFeatures];
                    return (
                      <motion.div key={id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.4, delay: idx * 0.04 }}>
                        <PriceCard id={id} name={name} price={displayPrice} currency={displayCurrency} per={per} isMostPopular={isMostPopular} memberLimit={memberLimit} features={highlights} actionLabel="Get started" actionHref="/register" variant="landing" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Need a fully customized solution?</h3>
                  <p className="mt-1 text-sm text-slate-500">Ministry Plus is built around your church's specific workflows, scale, and integration needs.</p>
                </div>
                <Link to="/contact" className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                  Contact us for Ministry Plus
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Still have questions?</h2>
            <p className="mt-4 text-slate-400">We're happy to help you choose the right plan for your church.</p>
            <Link to="/contact" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors">
              Contact Us
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}

export default PricingPage;
