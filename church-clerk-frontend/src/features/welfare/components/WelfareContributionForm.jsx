import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import WelfareContext from "../welfare.store.js";

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"];

function WelfareContributionForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(WelfareContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("welfare", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("welfare", "update") : false), [can]);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [formError, setFormError] = useState(null);

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
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

    if (mode === "edit" && initialData) {
      setAmount(initialData.amount ?? "");
      setDate(String(initialData.date || "").slice(0, 10));
      setPaymentMethod(String(initialData.paymentMethod || "Cash"));
      return;
    }

    setAmount("");
    setDate("");
    setPaymentMethod("Cash");

    setQuery("");
    setOptions([]);
    setSelectedMemberId("");
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

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!amount || Number(amount) <= 0) {
      setFormError("Amount is required.");
      return;
    }

    if (!date) {
      setFormError("Date is required.");
      return;
    }

    if (mode !== "edit") {
      if (!selectedMemberId) {
        setFormError("Please select a member.");
        return;
      }
    }

    const payload = {
      amount: Number(amount),
      date,
      paymentMethod
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateContribution?.(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createContribution?.({ ...payload, memberId: selectedMemberId });
      }

      onSuccess?.();
    } catch (e2) {
      setFormError(e2?.response?.data?.message || e2?.message || "Request failed");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
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
                <label className="block font-semibold text-gray-500 text-xs">Members</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                  placeholder="Type name, phone, email..."
                />

                <div ref={listRef} className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                  {searchLoading ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">Searching...</div>
                  ) : options.length ? (
                    <div className="divide-y divide-gray-200">
                      {options.map((m, idx) => (
                        <label key={m?._id ?? `m-${idx}`} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="welfare_member"
                            checked={selectedMemberId === m._id}
                            onChange={() => setSelectedMemberId(m._id)}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate text-sm">{memberOptionLabel(m)}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : debouncedQuery.trim() ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">No members found.</div>
                  ) : (
                    <div className="px-4 py-3 text-gray-600 text-sm">Start typing to search members.</div>
                  )}
                </div>

                <div className="mt-2 text-gray-500 text-xs">Selected: {selectedMemberId ? 1 : 0}</div>
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
              <label className="block font-semibold text-gray-500 text-xs">Date</label>
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
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={store?.loading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {store?.loading ? (mode === "edit" ? "Updating..." : "Saving...") : mode === "edit" ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WelfareContributionForm;
