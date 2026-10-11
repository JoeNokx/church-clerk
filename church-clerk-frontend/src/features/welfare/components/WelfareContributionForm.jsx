import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import WelfareContext from "../welfare.store.js";
import Button from "../../../shared/components/Button/index.jsx";

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"];

function WelfareContributionForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(WelfareContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("welfare", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("welfare", "update") : false), [can]);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [pendingEntries, setPendingEntries] = useState([]);
  const listRef = useRef(null);

  const debouncedQuery = useMemo(() => String(query || "").trim(), [query]);

  const memberOptionLabel = useCallback((member) => {
    const name = `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
    const meta = [member?.phoneNumber, member?.email, member?.city].filter(Boolean).join(" • ");
    if (meta) return `${name || "-"} — ${meta}`;
    return name || "-";
  }, []);

  const memberLabel = useMemo(() => {
    const name = `${initialData?.member?.firstName || ""} ${initialData?.member?.lastName || ""}`.trim();
    return name || "";
  }, [initialData]);

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setIsSubmitting(false);

    if (mode === "edit" && initialData) {
      setAmount(initialData.amount ?? "");
      setDate(String(initialData.date || "").slice(0, 10));
      setPaymentMethod(String(initialData.paymentMethod || "Cash"));
      setNote(String(initialData.note || ""));
      return;
    }

    setAmount("");
    setDate("");
    setPaymentMethod("Cash");
    setNote("");

    setQuery("");
    setOptions([]);
    setSelectedMemberId("");
    setSelectedMember(null);
    setPendingEntries([]);
  }, [open, mode, initialData]);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit") return;

    const run = async () => {
      const q = (debouncedQuery || "").trim();
      if (!q) {
        setOptions([]);
        return;
      }

      setSearchLoading(true);
      try {
        const members = await store?.searchMembers?.(q);
        setOptions(Array.isArray(members) ? members : []);
      } catch {
        setOptions([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const id = setTimeout(run, 250);
    return () => clearTimeout(id);
  }, [debouncedQuery, open, mode, store]);

  const buildEntryPayload = () => {
    if (!selectedMember?._id) {
      setFormError("Please search and select a member.");
      return null;
    }
    if (!amount || Number(amount) <= 0) {
      setFormError("Amount is required.");
      return null;
    }
    if (!date) {
      setFormError("Date is required.");
      return null;
    }
    return {
      memberId: selectedMember._id,
      amount: Number(amount),
      date,
      paymentMethod,
      note: String(note || "").trim()
    };
  };

  const clearCurrentEntry = () => {
    setSelectedMember(null);
    setSelectedMemberId("");
    setQuery("");
    setOptions([]);
    setAmount("");
    setDate("");
    setPaymentMethod("Cash");
    setNote("");
  };

  const addAnother = () => {
    setFormError(null);
    const entry = buildEntryPayload();
    if (!entry) return;
    setPendingEntries((prev) => [...prev, { payload: entry, member: selectedMember }]);
    clearCurrentEntry();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    if (mode === "edit") {
      if (!amount || Number(amount) <= 0) {
        setFormError("Amount is required.");
        setIsSubmitting(false);
        return;
      }
      if (!date) {
        setFormError("Date is required.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        amount: Number(amount),
        date,
        paymentMethod,
        note: String(note || "").trim()
      };

      try {
        if (!canEdit) return;
        await store?.updateContribution?.(initialData?._id, payload);
        onSuccess?.();
      } catch (e2) {
        setFormError(e2?.response?.data?.message || e2?.message || "Request failed");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const hasCurrentInput = Boolean(selectedMember || String(amount || "").trim() || date || String(note || "").trim());
    const payloads = pendingEntries.map((p) => p?.payload).filter(Boolean);
    if (hasCurrentInput) {
      const currentEntry = buildEntryPayload();
      if (!currentEntry) {
        setIsSubmitting(false);
        return;
      }
      payloads.push(currentEntry);
    }

    if (!payloads.length) {
      setFormError("Please add at least one member entry.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (!canCreate) return;
      await store?.createContribution?.(payloads.length === 1 ? payloads[0] : { entries: payloads });
      onSuccess?.();
    } catch (e2) {
      setFormError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Contribution" : "Add Contribution"}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-4 md:p-6 lg:p-8">
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {mode === "edit" ? (
              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-500 text-xs">Member</label>
                <div className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 flex items-center md:h-12 lg:h-11 lg:text-sm">
                  {memberLabel || "-"}
                </div>
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-500 text-xs">Member</label>

                {selectedMember ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                    <div className="min-w-0 font-semibold text-gray-900 truncate text-sm">{memberOptionLabel(selectedMember)}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(null);
                        setSelectedMemberId("");
                      }}
                      className="shrink-0 rounded-md px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 text-xs"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        if (selectedMemberId) {
                          setSelectedMemberId("");
                          setSelectedMember(null);
                        }
                      }}
                      className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                      placeholder="Search name, phone, email..."
                    />

                    <div ref={listRef} className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                      {searchLoading ? (
                        <div className="px-4 py-3 text-gray-600 text-sm">Searching...</div>
                      ) : options.length ? (
                        <div className="divide-y divide-gray-200">
                          {options.map((m, idx) => (
                            <button
                              key={m?._id ?? `m-${idx}`}
                              type="button"
                              onClick={() => {
                                setSelectedMemberId(m._id);
                                setSelectedMember(m);
                                setQuery("");
                                setOptions([]);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-gray-50"
                            >
                              <div className="font-semibold text-gray-900 truncate text-sm">{memberOptionLabel(m)}</div>
                            </button>
                          ))}
                        </div>
                      ) : debouncedQuery.trim() ? (
                        <div className="px-4 py-3 text-gray-600 text-sm">No members found.</div>
                      ) : (
                        <div className="px-4 py-3 text-gray-600 text-sm">Start typing to search members.</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Amount</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Date Received</label>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-500 text-xs">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-500 text-xs">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                type="text"
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder="e.g. Monthly welfare dues"
              />
            </div>

            {mode !== "edit" && pendingEntries.length ? (
              <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="font-semibold text-gray-700 text-xs">Pending entries ({pendingEntries.length})</div>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <div className="space-y-2">
                    {pendingEntries.map((p, i) => (
                      <div key={`pending-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate text-sm">{memberOptionLabel(p?.member)}</div>
                          <div className="mt-0.5 text-gray-600 text-xs">
                            {p?.payload?.amount || 0} • {p?.payload?.paymentMethod || "-"} • {(p?.payload?.date || "").slice(0, 10)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingEntries((prev) => prev.filter((_, idx) => idx !== i))}
                          className="shrink-0 font-semibold text-red-600 hover:underline text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>

            {mode !== "edit" ? (
              <button
                type="button"
                onClick={addAnother}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
              >
                Add Another
              </button>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              loadingText={mode === "edit" ? "Updating..." : "Saving..."}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {mode === "edit" ? "Update" : pendingEntries.length ? "Save All" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WelfareContributionForm;
