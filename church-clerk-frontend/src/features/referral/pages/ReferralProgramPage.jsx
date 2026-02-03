import { useEffect, useMemo, useState } from "react";

import { getMyReferralCode, getMyReferralHistory } from "../services/referral.api.js";

function ReferralProgramPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [earned, setEarned] = useState(0);
  const [used, setUsed] = useState(0);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  const remaining = useMemo(() => Math.max(0, Number(earned || 0) - Number(used || 0)), [earned, used]);

  const shareMessage = useMemo(() => {
    if (!referralCode) return "";
    return `Join ChurchClerk using my referral code: ${referralCode}`;
  }, [referralCode]);

  const shareUrl = useMemo(() => {
    try {
      return window.location.origin;
    } catch {
      return "";
    }
  }, []);

  const load = async () => {
    setError("");
    setLoading(true);

    try {
      const [codeRes, historyRes] = await Promise.all([getMyReferralCode(), getMyReferralHistory()]);

      const codePayload = codeRes?.data || {};
      const historyPayload = historyRes?.data || {};

      setReferralCode(codePayload.referralCode || "");
      setEarned(Number(codePayload.totalFreeMonthsEarned || 0));
      setUsed(Number(codePayload.totalFreeMonthsUsed || 0));
      setHistory(Array.isArray(historyPayload.referrals) ? historyPayload.referrals : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load referral program");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const openShare = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="text-2xl font-semibold text-gray-900">Referral Program</div>
        <div className="mt-2 text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div>
        <div className="text-2xl font-semibold text-gray-900">Referral Program</div>
        <div className="mt-1 text-sm text-gray-600">Earn free subscription months by inviting churches to join.</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/30 p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-white ring-1 ring-blue-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-blue-700">
              <path d="M12 3l8 4v10l-8 4-8-4V7l8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-blue-900">Simple and Rewarding</div>
            <div className="mt-3 space-y-2 text-sm text-blue-900/80">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-5 w-5 inline-flex items-center justify-center rounded-full bg-white ring-1 ring-blue-100 text-green-600">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.415l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 011.415-1.415l2.492 2.492 6.492-6.492a1 1 0 011.416 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <div>Invite churches to use the platform.</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-5 w-5 inline-flex items-center justify-center rounded-full bg-white ring-1 ring-blue-100 text-green-600">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.415l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 011.415-1.415l2.492 2.492 6.492-6.492a1 1 0 011.416 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <div>When a referred church subscribes, you earn one free subscription month.</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-5 w-5 inline-flex items-center justify-center rounded-full bg-white ring-1 ring-blue-100 text-green-600">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.415l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 011.415-1.415l2.492 2.492 6.492-6.492a1 1 0 011.416 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <div>Rewards accumulate automatically.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Your Referral Code</div>
            <div className="mt-1 text-sm text-gray-600">Share this code with churches you invite.</div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 text-center tracking-wider">
                {referralCode || "—"}
              </div>
              <button
                type="button"
                onClick={onCopy}
                disabled={!referralCode}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500">Share via</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openShare(`mailto:?subject=${encodeURIComponent("ChurchClerk Referral")}&body=${encodeURIComponent(shareMessage)}`)}
                  disabled={!referralCode}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => openShare(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`)}
                  disabled={!referralCode}
                  className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 hover:bg-green-100 disabled:opacity-60"
                >
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`)}
                  disabled={!referralCode || !shareUrl}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  <span>Facebook</span>
                </button>

                <button
                  type="button"
                  onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`)}
                  disabled={!referralCode || !shareUrl}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                >
                  <span>Twitter</span>
                </button>

                <button
                  type="button"
                  onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`)}
                  disabled={!referralCode || !shareUrl}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  <span>LinkedIn</span>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Referral History</div>
            <div className="mt-1 text-sm text-gray-600">Track churches you’ve referred</div>

            <div className="mt-4 space-y-3">
              {history.length ? (
                history.map((item, idx) => {
                  const status = String(item?.status || "").toLowerCase();
                  const isRewarded = status === "rewarded" || status === "subscribed";

                  return (
                    <div key={`${item?.churchEmail || "row"}-${idx}`} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-gray-900 truncate">{item?.churchName || "Unknown church"}</div>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                isRewarded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {isRewarded ? "Subscribed" : "Pending"}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600 truncate">{item?.churchEmail || "—"}</div>

                          <div className="mt-2 text-xs text-gray-500">
                            <span>Referred: {formatDate(item?.referredAt)}</span>
                            {isRewarded ? <span className="ml-3 text-green-700">Subscribed: {formatDate(item?.subscribedAt)}</span> : null}
                          </div>
                        </div>

                        <div className={`text-xs font-semibold ${isRewarded ? "text-green-700" : "text-yellow-700"}`}>
                          +1 month
                          <div className="text-[11px] font-medium text-gray-500 text-right">{isRewarded ? "Earned" : "Pending"}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No referrals yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Reward Wallet</div>
            <div className="mt-1 text-sm text-gray-600">Your free subscription months</div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-xs font-semibold text-gray-500">Total Free Months Earned</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{earned}</div>
                <div className="mt-1 text-xs text-gray-500">months</div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-xs font-semibold text-gray-500">Free Months Used</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{used}</div>
                <div className="mt-1 text-xs text-gray-500">months</div>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="text-xs font-semibold text-green-800">Free Months Remaining</div>
                <div className="mt-2 text-3xl font-semibold text-green-900">{remaining}</div>
                <div className="mt-1 text-xs text-green-800">months available</div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
                Free months are applied automatically to future billing cycles.
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">How Rewards Are Applied</div>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-blue-50 ring-1 ring-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold">1</div>
                <div>Rewards are earned only after a church subscribes.</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-blue-50 ring-1 ring-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold">2</div>
                <div>Free months accumulate without limit.</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-blue-50 ring-1 ring-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold">3</div>
                <div>Free months are automatically applied before paid billing.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReferralProgramPage;
