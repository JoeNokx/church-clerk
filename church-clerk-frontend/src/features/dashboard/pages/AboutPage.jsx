import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";

function Reveal({ children, className = "", delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: reduce ? 0 : 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const STORY_CARDS = [
  {
    title: "Rooted in real church work",
    desc: "ChurchClerk started from watching how churches actually run — records in notebooks, attendance on paper, giving in ledgers, branch updates over phone calls.",
    icon: <><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>
  },
  {
    title: "Built for every level of leadership",
    desc: "Pastors, administrators, finance teams, and branch leaders all work from the same records — each seeing exactly what their role requires.",
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>
  },
  {
    title: "One church, many branches",
    desc: "ChurchClerk is designed for networks — a headquarters that sees consolidated reports and branches that manage their own day-to-day records.",
    icon: <><path d="M12 2v3M10 3.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M5 21v-8.5L12 8l7 4.5V21" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M3 21h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M10 21v-4a2 2 0 014 0v4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></>
  },
  {
    title: "Accountability before everything",
    desc: "Permissions, audit logs, and clear financial records are built into the foundation — because church administration runs on trust.",
    icon: <><path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>
  }
];

const WHAT_WE_DO = [
  {
    title: "Church records & membership",
    desc: "We help churches keep a complete record of their people — member profiles, family links, departments, and branch membership — so nothing important lives only in someone's head or notebook.",
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>
  },
  {
    title: "Giving & finance",
    desc: "We help churches record every tithe, offering, welfare contribution, and special fund properly — each entry linked to a member and a date — so finances can be reconciled and reported without the spreadsheet scramble.",
    icon: <path d="M12 1v22M17 5.5c0-1.9-1.8-3.5-5-3.5S7 3.6 7 5.5 8.8 9 12 9s5 1.6 5 3.5S15.2 16 12 16s-5-1.6-5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  },
  {
    title: "Communication & follow-up",
    desc: "We help churches reach their members — announcements, SMS reminders, and service check-ins — and keep attendance visible, so no one quietly slips through the cracks.",
    icon: <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  }
];

const BELIEFS = [
  {
    title: "Technology should serve ministry, not compete with it",
    desc: "A church system earns its place by saving time and reducing friction — never by demanding attention for itself."
  },
  {
    title: "Church records deserve real accountability",
    desc: "Money, membership, and attendance data should be traceable and auditable — held to the same standard as the trust members place in leadership."
  },
  {
    title: "Good tools fit the church, not the other way around",
    desc: "Branches, services, departments, roles — the software should follow how churches are actually structured, not force a generic business model onto them."
  },
  {
    title: "Simple beats powerful-but-confusing",
    desc: "Most church administration is done by volunteers and busy staff. If a tool needs a training course, it has already failed them."
  }
];

const VALUES = [
  {
    title: "Accountability",
    desc: "Every record and transaction is traceable. Churches deserve systems that build trust, not erode it.",
    icon: <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
  },
  {
    title: "Simplicity",
    desc: "Technology should serve ministry, not slow it down. ChurchClerk is designed for users of any technical level.",
    icon: <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
  },
  {
    title: "Transparency",
    desc: "No hidden fees, no locked-in data. Your church's information belongs to your church, always.",
    icon: <><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 15a3 3 0 100-6 3 3 0 000 6Z" stroke="currentColor" strokeWidth="1.7"/></>
  }
];

const TEAM = [
  {
    name: "Co-Founder",
    role: "Product & Engineering",
    shortBio: "Leads the design and development of ChurchClerk.",
    fullBio: "Leads the design and development of ChurchClerk — turning the daily realities of church administration into a system that is organized, accountable, and simple enough for any team member to use.",
    img: null
  },
  {
    name: "Co-Founder",
    role: "Operations & Church Relations",
    shortBio: "Works directly with churches to shape how ChurchClerk fits their work.",
    fullBio: "Works directly with churches to shape how ChurchClerk fits their work — from onboarding and branch setup to making sure the product reflects how real congregations operate.",
    img: null
  }
];

function TeamCard({ member }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-slate-100 shadow-[0_18px_36px_-16px_rgba(15,23,42,0.18)]">
      {member.img ? (
        <img src={member.img} alt={member.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
          <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-slate-400">
            <path d="M12 3L4 8v12a1 1 0 001 1h14a1 1 0 001-1V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Persistent bottom overlay — name, role, short bio */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent p-5 pt-14">
        <p className="text-base font-semibold text-white">{member.name}</p>
        <p className="text-xs font-medium text-blue-300">{member.role}</p>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-300">{member.fullBio}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
        >
          View all
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Expanded bio panel — slides up over the image */}
      <motion.div
        initial={false}
        animate={{ y: open ? "0%" : "100%" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute inset-0 flex flex-col justify-end bg-slate-950/85 p-5"
      >
        <p className="text-base font-semibold text-white">{member.name}</p>
        <p className="text-xs font-medium text-blue-300">{member.role}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">{member.fullBio}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
        >
          Show less
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
            <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832l-3.71 3.94a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <LandingHeader />

      <main>
        {/* ── HERO ── */}
        <section className="bg-white">
          <div className="mx-auto w-full max-w-3xl px-4 pt-16 text-center md:px-6 md:pt-24">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 md:text-5xl">
                Building the management infrastructure for churches.
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-500">
                ChurchClerk exists so that the people running a church spend less time on administration and more time on ministry.
              </p>
            </motion.div>
          </div>
          <div className="mx-auto w-full max-w-5xl px-4 pb-14 pt-8 md:px-6 md:pb-20 md:pt-10">
            <Reveal>
              <div className="overflow-hidden rounded-2xl shadow-[0_18px_36px_-16px_rgba(15,23,42,0.18)]">
                <img
                  src="/church login.jpg"
                  alt="A church congregation gathered together"
                  className="block h-[200px] w-full object-cover sm:h-[280px] lg:h-[340px]"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── OUR STORY ── */}
        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">Our story</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                ChurchClerk started from a simple observation: the administrative work behind a church — member records, attendance, giving, branch coordination — is enormous, and most of it is still done on paper, in spreadsheets, and across personal phones. We believe churches deserve better tools for that work — a system designed around how churches actually operate.
              </p>
            </Reveal>

            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
              {STORY_CARDS.map((card, i) => (
                <Reveal key={card.title} delay={i * 0.06}>
                  <div className="flex h-full items-stretch gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_18px_36px_-16px_rgba(15,23,42,0.18)]">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
                    </div>
                    <div className="flex w-24 shrink-0 items-center justify-center self-stretch rounded-xl bg-blue-50 text-blue-700 sm:w-28">
                      <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">{card.icon}</svg>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT WE DO ── */}
        <section className="bg-slate-50 py-16 md:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">What we do</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                We help churches run the administrative side of ministry — the people, the money, the communication — in one organized system.
              </p>
            </Reveal>
            <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
              {WHAT_WE_DO.map((item, i) => (
                <Reveal key={item.title} delay={i * 0.06}>
                  <div className="h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.15)]">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">{item.icon}</svg>
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT WE BELIEVE ABOUT CHURCH TECHNOLOGY ── */}
        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">What we believe about church technology</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                The convictions that shape every decision we make in ChurchClerk.
              </p>
            </Reveal>
            <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <ul className="divide-y divide-slate-200 border-y border-slate-200">
                  {BELIEFS.map((b, i) => (
                    <Reveal key={b.title} delay={i * 0.05}>
                      <li className="grid grid-cols-1 gap-1 py-5 sm:grid-cols-[2rem_1fr] sm:gap-4">
                        <span className="text-sm font-semibold text-blue-700">{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{b.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">{b.desc}</p>
                        </div>
                      </li>
                    </Reveal>
                  ))}
                </ul>
              </div>
              <Reveal className="lg:col-span-5" delay={0.08}>
                <div className="overflow-hidden rounded-2xl shadow-[0_18px_36px_-16px_rgba(15,23,42,0.18)]">
                  <img
                    src="/church login.jpg"
                    alt="Church members gathered in fellowship"
                    className="block h-[280px] w-full object-cover lg:h-[420px]"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── OUR MISSION ── */}
        <section className="bg-slate-950 py-20 md:py-24">
          <div className="mx-auto w-full max-w-3xl px-4 text-center md:px-6">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Our mission</p>
              <p className="mt-6 text-2xl font-semibold leading-snug tracking-tight text-white md:text-3xl">
                To give every church — regardless of size or budget — an organized, accountable system for the work behind the ministry.
              </p>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-slate-400">
                When a church's records are clear, its people are cared for, its finances are accountable, and its leaders can focus on what the church is actually for.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── OUR VALUES ── */}
        <section className="bg-slate-50 py-16 md:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <Reveal>
              <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl">
                <img
                  src="/church login.jpg"
                  alt=""
                  className="block h-[200px] w-full object-cover md:h-[260px]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55">
                  <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Our Values</h2>
                </div>
              </div>
            </Reveal>
            <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
              {VALUES.map((v, i) => (
                <Reveal key={v.title} delay={i * 0.06}>
                  <div>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">{v.icon}</svg>
                    </span>
                    <h3 className="mt-3 text-base font-semibold text-slate-900">{v.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── THE PEOPLE BEHIND CHURCHCLERK ── */}
        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">The people behind ChurchClerk</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                A small team building for the people who keep churches running.
              </p>
            </Reveal>
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
              {TEAM.map((member, i) => (
                <Reveal key={member.role} delay={i * 0.06}>
                  <TeamCard member={member} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
            <Reveal>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 px-6 py-14 text-center md:px-12">
                {/* Geometric line-art decoration */}
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  {/* Concentric arcs — top left */}
                  <svg viewBox="0 0 200 200" fill="none" className="absolute -left-16 -top-16 h-56 w-56 text-white/10">
                    <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="100" cy="100" r="100" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  {/* Diamond grid — bottom right */}
                  <svg viewBox="0 0 200 200" fill="none" className="absolute -bottom-14 -right-14 h-52 w-52 text-white/10">
                    {[0, 1, 2, 3].map((row) =>
                      [0, 1, 2, 3].map((col) => (
                        <rect
                          key={`${row}-${col}`}
                          x={col * 50 + 10}
                          y={row * 50 + 10}
                          width="18"
                          height="18"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          transform={`rotate(45 ${col * 50 + 19} ${row * 50 + 19})`}
                        />
                      ))
                    )}
                  </svg>
                  {/* Cross motif — top right */}
                  <svg viewBox="0 0 24 24" fill="none" className="absolute right-10 top-8 h-10 w-10 text-white/15">
                    <path d="M12 3v18M7 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {/* Dot cluster — bottom left */}
                  <svg viewBox="0 0 80 60" fill="none" className="absolute bottom-8 left-10 h-14 w-20 text-white/15">
                    {[0, 1, 2, 3, 4].map((col) =>
                      [0, 1, 2].map((row) => (
                        <circle key={`${col}-${row}`} cx={col * 16 + 4} cy={row * 16 + 4} r="2" fill="currentColor" />
                      ))
                    )}
                  </svg>
                </div>

                <div className="relative">
                <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  Join us in building better tools for the work behind the ministry.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-blue-100">
                  Start using ChurchClerk to keep your members, branches, giving, and reports in one organized system.
                </p>
                <div className="mt-8">
                  <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors">
                    Get Started
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

export default AboutPage;
