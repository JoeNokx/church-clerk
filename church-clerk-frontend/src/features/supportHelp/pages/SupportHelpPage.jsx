import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

function SupportHelpPage() {
  const location = useLocation();

  const supportEmails = useMemo(() => ["nokaeldev@gmail.com", "stephenui1864@gmail.com"], []);
  const supportPhones = useMemo(() => ["+233546022758", "+233548592769"], []);
  const whatsappPhone = useMemo(() => "+233546022758", []);

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
            <div className="mt-1 text-xs text-gray-500">Choose the fastest way to reach our support team.</div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">Email</div>
                    <div className="mt-1 text-xs text-gray-500">Best for screenshots and detailed issues.</div>
                    <div className="mt-2 space-y-1 text-sm">
                      {supportEmails.map((email) => (
                        <div key={email} className="truncate">
                          <a className="text-blue-800 hover:underline" href={`mailto:${email}`}>
                            {email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-900">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path
                        d="M8 3h8v4l-1 2v12H9V9L8 7V3Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path d="M9 9h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Phone</div>
                        <div className="mt-1 text-xs text-gray-500">Sunday - Saturday, 9am - 6pm</div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {supportPhones.map((phone) => (
                        <div key={phone} className="truncate">
                          <a className="text-blue-800 hover:underline" href={`tel:${phone}`}>
                            {phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                      <path d="M20.52 3.48A11.82 11.82 0 0 0 12 .02C5.37.02.02 5.37.02 12c0 2.11.55 4.16 1.6 5.98L0 24l6.19-1.62A11.9 11.9 0 0 0 12 23.98c6.63 0 11.98-5.35 11.98-11.98 0-3.2-1.25-6.21-3.46-8.52ZM12 21.9c-1.87 0-3.71-.5-5.32-1.44l-.38-.23-3.67.96.98-3.58-.25-.37A9.87 9.87 0 0 1 2.1 12C2.1 6.52 6.52 2.1 12 2.1c2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.91 7c0 5.48-4.42 9.9-9.9 9.9Zm5.73-7.42c-.31-.16-1.83-.9-2.12-1-.29-.1-.5-.16-.71.16-.21.31-.81 1-.99 1.2-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.36.46-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.54-.08-.16-.71-1.71-.97-2.34-.26-.62-.53-.54-.71-.55h-.61c-.21 0-.54.08-.82.39-.28.31-1.08 1.06-1.08 2.59s1.1 3.01 1.25 3.22c.16.21 2.16 3.29 5.23 4.61.73.31 1.3.5 1.74.64.73.23 1.4.2 1.93.12.59-.09 1.83-.75 2.09-1.48.26-.73.26-1.35.18-1.48-.08-.13-.29-.21-.6-.36Z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900">WhatsApp</div>
                    <div className="mt-1 text-xs text-gray-500">Fastest response for quick questions.</div>
                    <a
                      className="mt-3 inline-flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      href={`https://wa.me/${String(whatsappPhone || "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="truncate">Chat on WhatsApp ({whatsappPhone})</span>
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-500">
                        <path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M10 7h7v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </div>
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
