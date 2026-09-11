import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const MODULES = [
  { title: "Member Management", desc: "Complete member profiles with contact info, family links, ministry roles, and status history. Know every person in your congregation." },
  { title: "Attendance Tracking", desc: "Record service attendance manually or via shareable check-in links. See trends and flag those needing pastoral care." },
  { title: "Giving & Finance", desc: "Track tithes, offerings, income, expenses, welfare, and special funds. Every contribution accounted for with clear, auditable records." },
  { title: "Reports & Analytics", desc: "Attendance trends, financial summaries, budget vs actuals, and member growth reports—visualized for leadership decisions." },
  { title: "HQ & Branch Management", desc: "One headquarters, multiple branches. Each branch manages its own records while the HQ sees consolidated reports." },
  { title: "Roles & Permissions", desc: "Control exactly what each team member can view or edit. Full audit logs so leadership always knows who changed what." },
  { title: "Events & Programs", desc: "Plan services, special events, and ministry programs. Track attendance and engagement per activity." },
  { title: "Announcements", desc: "Send announcements and updates to your congregation. Keep everyone informed and engaged." }
];

function ProductPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />
      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-50 blur-3xl pointer-events-none" />
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-24 pb-20 text-center md:px-6">
            <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55 }}>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Product</span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                One platform for your{" "}
                <span className="text-blue-600">entire church.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 md:text-lg">
                ChurchClerk brings every aspect of church management into a single, connected system—so your team can focus on ministry, not admin.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors">
                  Start Free Trial
                </Link>
                <Link to="/contact" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  Talk to Us
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Built-in modules</h2>
              <p className="mt-4 text-base text-slate-500">Everything you need is included—no add-ons, no integrations to cobble together.</p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {MODULES.map((m, i) => (
                <motion.div key={m.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: i * 0.05 }} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:border-blue-100 hover:shadow-md transition-all">
                  <h3 className="text-base font-semibold text-slate-900">{m.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{m.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Ready to see it in action?</h2>
            <p className="mt-4 text-slate-400">Create your free account and explore every module—no commitment required.</p>
            <Link to="/register" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors">
              Get Started Free
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}

export default ProductPage;
