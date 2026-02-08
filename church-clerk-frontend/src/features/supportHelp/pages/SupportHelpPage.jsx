import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

function SupportHelpPage() {
  const location = useLocation();

  const categories = useMemo(
    () => ["Billing", "Technical Issue", "Account", "Data", "Feature Request", "Other"],
    []
  );

  const [form, setForm] = useState({
    subject: "",
    category: categories[0] || "Other",
    churchName: "",
    name: "",
    description: ""
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    if (!location?.hash) return;
    const id = location.hash.replace("#", "");
    if (!id) return;

    const el = document.getElementById(id);
    if (!el) return;

    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);

    return () => clearTimeout(t);
  }, [location?.hash]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage("");

    if (!form.subject.trim() || !form.description.trim()) {
      setSubmitMessage("Please provide a subject and description.");
      return;
    }

    try {
      setSubmitting(true);
      await new Promise((r) => setTimeout(r, 500));
      setSubmitMessage("Support request submitted. We will get back to you shortly.");
      setForm((prev) => ({
        ...prev,
        subject: "",
        description: ""
      }));
    } catch (err) {
      setSubmitMessage(err?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl">
        <div className="text-2xl font-semibold text-gray-900">Help &amp; Support</div>
        <div className="mt-1 text-sm text-gray-600">
          Submit a request or reach out to us using the contact details below.
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Support Request</div>
            <div className="mt-1 text-xs text-gray-500">
              Fields marked required should be filled before submitting.
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.subject}
                  onChange={(e) => setField("subject", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="E.g. Cannot export report"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Church Name</label>
                  <input
                    value={form.churchName}
                    onChange={(e) => setField("churchName", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Your church"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Describe the issue in detail..."
                />
              </div>

              {submitMessage ? (
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    submitMessage.toLowerCase().includes("submitted")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {submitMessage}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Contact Us</div>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-500">Email Support</div>
                <div className="mt-1 space-y-1">
                  <a className="text-blue-800 hover:underline" href="mailto:nokaeldev@gmail.com">
                    nokaeldev@gmail.com
                  </a>
                  <div>
                    <a className="text-blue-800 hover:underline" href="mailto:stephenui1864@gmail.com">
                      stephenui1864@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500">Phone Support</div>
                <div className="mt-1 space-y-1">
                  <a className="text-blue-800 hover:underline" href="tel:+233546022758">
                    0546022758
                  </a>
                  <div>
                    <a className="text-blue-800 hover:underline" href="tel:+233548592769">
                      0548592769
                    </a>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">Sunday - Saturday, 9am - 6pm</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500">Live Chat</div>
                <a
                  className="mt-1 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  href="https://wa.me/233546022758"
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-500">
                    <path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M10 7h7v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div id="faq" className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-sm font-semibold text-gray-900">FAQ</div>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Why can’t I see action buttons?</div>
              <div className="mt-1 text-sm text-gray-600">
                If your account is deactivated, the system is read-only for you. Contact your administrator to activate your account.
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Why do I get “Read-only” when switching church?</div>
              <div className="mt-1 text-sm text-gray-600">
                Some churches are configured as read-only based on your access. You can still view allowed data.
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">How do I change my password?</div>
              <div className="mt-1 text-sm text-gray-600">
                Use the account menu in the top-right corner and select “Change Password”.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportHelpPage;
