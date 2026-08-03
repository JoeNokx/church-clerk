import React from "react";
import { Link } from "react-router-dom";

const AREAS = [
  {
    id: "account",
    number: "01",
    title: "Create Your Account",
    color: "bg-blue-50 border-blue-100",
    badge: "bg-blue-100 text-blue-700",
    steps: [
      "Go to the app and click 'Start Free Trial'.",
      "Fill in your details and follow the process."
    ],
    note: "This is your first impression. Let us know if anything feels confusing or breaks.",
  },
  {
    id: "members",
    number: "02",
    title: "Add Members",
    color: "bg-violet-50 border-violet-100",
    badge: "bg-violet-100 text-violet-700",
    steps: [
      "From the sidebar, click 'Members'.",
      "Create member and check details.",
    ],
    note: "Try adding at least 3–5 membersof different gender so later steps feel realistic. Try and later add members to cell, groups or department. Again try out the members registration link."
  },
  {
    id: "attendance",
    number: "03",
    title: "Record Attendance",
    color: "bg-emerald-50 border-emerald-100",
    badge: "bg-emerald-100 text-emerald-700",
    steps: [
      "From the sidebar, click 'Attendance'.",
      "work on all three forms of attendance.",
    ],
    note: "Check that the members you added earlier appear in the attendance list. Also convert some visitors into members. Again try out the attendance link",
  },
 
  {
    id: "programs",
    number: "04",
    title: "Programs & Events",
    color: "bg-indigo-50 border-indigo-100",
    badge: "bg-indigo-100 text-indigo-700",
    steps: [
      "In the sidebar, click 'Programs and Events'.",
      "Create a progam or event and check its details. Consider creating for at least one each for ongoing and upcoming.",
      "record offering and attendance of one program or event. Use all three modes of attendance record."
    ],
    note: "Programs have their own attendance and offering records separate from the main church ones.",
  },
  {
    id: "ministries",
    number: "05",
    title: "Ministries",
    color: "bg-purple-50 border-purple-100",
    badge: "bg-purple-100 text-purple-700",
    steps: [
      "In the sidebar, click 'Ministries'.",
      "Create one ministry each for all three ministries and check their details. Consider creating for at least one each for ongoing and upcoming.",
      "Add at least 2 members. Record offering and attendance of one program or event. Use all two modes of attendance record."
    ],
    note: "Each ministry keeps its own records. Confirm members and data appear correctly under it.",
  },
  {
    id: "tithe",
    number: "06",
    title: "Tithe",
    color: "bg-teal-50 border-teal-100",
    badge: "bg-teal-100 text-teal-700",
    steps: [
      "In the sidebar, click 'Tthes'.",
      "Mode 1 (Individual): add tithes and observe details",
      "Mode 2 (Bulk): add tithes and observe details",
    ],
    note: "Try out both modes and Verify both mode retains data after switching modes.",
  },
  
  {
    id: "projects",
    number: "07",
    title: "Church Projects",
    color: "bg-orange-50 border-orange-100",
    badge: "bg-orange-100 text-orange-700",
    steps: [
      "In the sidebar, click 'Church Projects'.",
      "Create at least two project and check details",
      "Record a contribution and expenses in the project.",
      "Make sure one project is fully paid out and other incomplete and observe their progress status.",
    ],
    note: "Confirm the progress amount updates after recording a contribution.",
  },
  {
    id: "funds",
    number: "08",
    title: "Offering & Funds",
    color: "bg-yellow-50 border-yellow-100",
    badge: "bg-yellow-100 text-yellow-700",
    steps: [
      "In the sidebar, click 'Offering and Funds'.",
      "Record offerings and seeds, at least 2 each.",
    ],
    note: "Each fund should track its own balance separately. Check that totals are correct.",
  },
  {
    id: "welfare",
    number: "09",
    title: "Welfare",
    color: "bg-pink-50 border-pink-100",
    badge: "bg-pink-100 text-pink-700",
    steps: [
      "In the sidebar, click 'Welfare'.",
      "Create welfare and check details.",
      "Record contributions and disbursement",
    ],
    note: "Welfare records track money given to members in need. Confirm the calculations at the KPI is correct.",
  },
  {
    id: "pledges",
    number: "10",
    title: "Pledges",
    color: "bg-rose-50 border-rose-100",
    badge: "bg-rose-100 text-rose-700",
    steps: [
      "In the sidebar, click 'Pledges'.",
      "Create at least two Pledges and check it details.",
      "Record a pledge payment against it. Make sure one pledge is fully paid out and other incomplete and observe their status.",
    ],
    note: "A pledge is a promise to give. Payments should reduce the outstanding balance — verify this works.",
  },
  {
    id: "ventures",
    number: "11",
    title: "Business Ventures",
    color: "bg-slate-100 border-slate-200",
    badge: "bg-slate-200 text-slate-700",
    steps: [
      "In the sidebar, click 'Business Ventures'.",
      "Create at least two business ventures and check details.",
      "Record income and expenses entries from the venture.",
    ],
    note: "This tracks income from church-owned business activities. Confirm figures save correctly.",
  },
  {
    id: "expenses",
    number: "12",
    title: "General Expenses",
    color: "bg-zinc-50 border-zinc-100",
    badge: "bg-zinc-100 text-zinc-700",
    steps: [
      "In the sidebar, click 'General Expenses'.",
      "Create expenses of any purchase. Add at least 2 expenses with different categories.",
    ],
    note: "These cover day-to-day costs like utilities, stationery, or transport.",
  },
  {
    id: "statement",
    number: "13",
    title: "Financial Statement",
    color: "bg-cyan-50 border-cyan-100",
    badge: "bg-cyan-100 text-cyan-700",
    steps: [
      "In the sidebar, look for 'Financial Statement'",
      "Based on monthly, Quarterly and Yearly, Review the income vs expense summary and check the figures match your earlier records or Set a date range (e.g. this month) and generate the statement.",
      "Try out the export option.",
    ],
    note: "The statement should combine all income and expenses entered across modules or pages.",
  },
  {
    id: "analytics",
    number: "14",
    title: "Reports & Analytics",
    color: "bg-fuchsia-50 border-fuchsia-100",
    badge: "bg-fuchsia-100 text-fuchsia-700",
    steps: [
      "In the sidebar, click 'Reports and Analytics'.",
      "Check attendance trends, member growth, and financial summaries.",
      "Generate data using date and selected moule.",
    ],
    note: "The more data entered in earlier modules, the more meaningful the reports will be.",
  },
  {
    id: "settings",
    number: "15",
    title: "Settings",
    color: "bg-gray-50 border-gray-200",
    badge: "bg-gray-200 text-gray-700",
    steps: [
      "In the sidebar, click 'Settings'.",
      "Check your your profile and church profile details and perform and update including adding an image.",
      "Look for user roles or team management and check what access levels are available. Also, check how 'Audit' works. Don't perform any task there.",
    ],
    note: "Let us know if any setting does not save or if a section you expected is missing.",
  },
  {
    id: "support",
    number: "16",
    title: "Support & Help",
    color: "bg-neutral-50 border-neutral-200",
    badge: "bg-neutral-200 text-neutral-700",
    steps: [
      "In the sidebar, click 'Support and Help'",
      "Simply observe help documentation, an FAQ, or a contact form is .",
      "Try submitting a test message.",
    ],
    note: "Just confirm help resources are accessible and there is a clear way to reach support.",
  },
];

const FEEDBACK = [
  "Anything that broke or gave an error",
  "Any step that felt confusing or unclear",
  "Anything missing that you'd expect to see",
  "Anything that worked really well",
];

export default function TestGuidePage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M12 3L4 8v12a1 1 0 001 1h14a1 1 0 001-1V8L12 3Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M9 21V12h6v9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900">ChurchClerk — Tester Guide</span>
          </div>
          <Link to="/register" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
            Open App →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">

        {/* Hero */}
        <div className="mb-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-8 text-white md:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">Beta Testing</p>
          <h1 className="mt-2 text-2xl font-bold leading-snug md:text-3xl">
            Thanks for testing ChurchClerk!
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-blue-100">
            ChurchClerk helps churches manage their members, attendance, finances and branches in one place.
            This guide walks you through the key areas — just follow the steps and let us know what you find. Kindly document your observation.
          </p>
          <p className="mt-4 text-xs text-blue-200">
            ⏱ Takes about <strong className="text-white">15–30 minutes</strong> to go through everything.
          </p>
           <p className="mt-4 text-xs text-blue-200">
             <strong className="text-white"> NOTE: </strong>Almost all pages have action buttons like edit and delete to mutate data, and filters like date, search and category to sort data. Try them out.
          </p>
        </div>

        {/* Testing areas */}
        <div className="space-y-5">
          {AREAS.map((area) => (
            <div key={area.id} className={`rounded-2xl border p-6 ${area.color}`}>
              <div className="mb-4 flex items-center gap-3">
                <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${area.badge}`}>
                  {area.number}
                </span>
                <h2 className="text-base font-semibold text-slate-900">{area.title}</h2>
              </div>

              <ol className="space-y-2">
                {area.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-500 shadow-sm">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              <p className="mt-4 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-500">
                💡 {area.note}
              </p>
            </div>
          ))}
        </div>

        {/* Feedback section */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">When you're done, tell us:</h2>
          <ul className="mt-4 space-y-2">
            {FEEDBACK.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-blue-500">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-slate-400">
            No feedback format required — a call, voice note, WhatsApp message, or quick bullet points is perfectly fine.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-colors">
            Start testing now
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

      </main>
    </div>
  );
}
