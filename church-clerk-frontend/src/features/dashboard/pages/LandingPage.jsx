import React from "react";
import { Link } from "react-router-dom";
import LandingHeader from "../components/landing/LandingHeader.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import PricingCard from "../components/landing/PricingCard.jsx";

function LandingPage() {
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

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <PricingCard
                name="Basic"
                price="$19"
                features={[
                  "Member directory",
                  "Attendance tracking",
                  "Standard reports",
                  "Email support"
                ]}
              />

              <PricingCard
                name="Standard"
                price="$49"
                featured
                features={[
                  "Everything in Basic",
                  "Multiple departments",
                  "Financial summaries",
                  "Priority support"
                ]}
              />

              <PricingCard
                name="Premium"
                price="$99"
                features={[
                  "Everything in Standard",
                  "Multi-branch management",
                  "Advanced permissions",
                  "Dedicated onboarding"
                ]}
              />
            </div>
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
