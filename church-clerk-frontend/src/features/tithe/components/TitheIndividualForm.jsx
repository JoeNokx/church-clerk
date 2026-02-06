import { useContext, useEffect, useMemo, useRef, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import TitheContext from "../tithe.store.js";

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque", "Card"];

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

function memberLabel(member) {
  const name = `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
  const meta = [member?.phoneNumber, member?.email, member?.city].filter(Boolean).join(" • ");
  if (meta) return `${name || "-"} — ${meta}`;
  return name || "-";
}

function TitheIndividualForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(TitheContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("tithe", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("tithe", "update") : false), [can]);

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [date, setDate] = useState("");
  const [formError, setFormError] = useState(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [searchLoading, setSearchLoading] = useState(false);
  const [options, setOptions] = useState([]);

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [pendingEntries, setPendingEntries] = useState([]);

  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setQuery("");
    setOptions([]);
    setSelectedMemberId("");
    setPendingEntries([]);

    if (mode === "edit" && initialData) {
      setAmount(initialData.amount ?? "");
      setPaymentMethod(initialData.paymentMethod || "Cash");
      setDate((initialData.date || "").slice(0, 10));
      if (initialData?.member?._id) setSelectedMemberId(initialData.member._id);
      return;
    }

    setAmount("");
    setPaymentMethod("Cash");
    setDate("");
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

    run();
  }, [debouncedQuery, open, mode, store]);

  const clearCurrentEntry = () => {
    setAmount("");
    setPaymentMethod("Cash");
    setDate("");
    setQuery("");
    setOptions([]);
    setSelectedMemberId("");
  };

  const buildEntryPayload = () => {
    if (!date) {
      setFormError("Date is required.");
      return null;
    }

    if (!amount || Number(amount) <= 0) {
      setFormError("Amount is required.");
      return null;
    }

    if (!paymentMethod) {
      setFormError("Payment method is required.");
      return null;
    }

    if (!selectedMemberId) {
      setFormError("Please select a member.");
      return null;
    }

    return {
      amount: Number(amount),
      paymentMethod,
      date,
      memberIds: [selectedMemberId]
    };
  };

  const addAnother = () => {
    setFormError(null);
    const entry = buildEntryPayload();
    if (!entry) return;

    const member = options.find((m) => m?._id === selectedMemberId) || null;
    setPendingEntries((prev) => [...prev, { payload: entry, member }]);
    clearCurrentEntry();
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (mode === "edit") {
      if (!canEdit) return;

      if (!date) {
        setFormError("Date is required.");
        return;
      }

      if (!amount || Number(amount) <= 0) {
        setFormError("Amount is required.");
        return;
      }

      if (!paymentMethod) {
        setFormError("Payment method is required.");
        return;
      }

      const payload = {
        amount: Number(amount),
        paymentMethod,
        date
      };

      try {
        await store?.updateTitheIndividual?.(initialData?._id, payload);
        onSuccess?.();
      } catch (e2) {
        const message = e2?.response?.data?.message || e2?.message || "Request failed";
        setFormError(message);
      }

      return;
    }

    if (!canCreate) return;

    if (pendingEntries.length) {
      const hasAnyCurrentInput = Boolean(selectedMemberId || String(amount || "").trim() || date);
      const currentEntry = hasAnyCurrentInput ? buildEntryPayload() : null;
      if (hasAnyCurrentInput && !currentEntry) return;

      const payloads = [
        ...pendingEntries.map((p) => p?.payload).filter(Boolean),
        ...(currentEntry ? [currentEntry] : [])
      ];

      try {
        await store?.createTitheIndividualsBulk?.(payloads);
        onSuccess?.();
      } catch (e2) {
        const message = e2?.response?.data?.message || e2?.message || "Request failed";
        setFormError(message);
      }

      return;
    }

    const entry = buildEntryPayload();
    if (!entry) return;

    try {
      await store?.createTitheIndividuals?.(entry);
      onSuccess?.();
    } catch (e2) {
      const message = e2?.response?.data?.message || e2?.message || "Request failed";
      setFormError(message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{mode === "edit" ? "Edit Individual Tithe" : "Record Individual Tithe"}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-5">
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500">Amount</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Date</label>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>
          </div>

          {mode !== "edit" ? (
            <div className="mt-5">
              <label className="block text-xs font-semibold text-gray-500">Members</label>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Type name, phone, email..."
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />

              <div ref={listRef} className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-600">Searching...</div>
                ) : options.length ? (
                  <div className="divide-y divide-gray-200">
                    {options.map((m, idx) => (
                      <label key={m?._id ?? `m-${idx}`} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="tithe_member"
                          checked={selectedMemberId === m._id}
                          onChange={() => setSelectedMemberId(m._id)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{memberLabel(m)}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : debouncedQuery.trim() ? (
                  <div className="px-4 py-3 text-sm text-gray-600">No members found.</div>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-600">Start typing to search members.</div>
                )}
              </div>

              <div className="mt-2 text-xs text-gray-500">Selected: {selectedMemberId ? 1 : 0}</div>

              {pendingEntries.length ? (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700">Pending entries ({pendingEntries.length})</div>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {pendingEntries.map((p, i) => (
                        <div key={`pending-${i}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <div className="text-sm font-semibold text-gray-900 truncate">{memberLabel(p?.member)}</div>
                          <div className="mt-1 text-xs text-gray-600">
                            GHS {Number(p?.payload?.amount || 0).toLocaleString()} • {p?.payload?.paymentMethod || "-"} • {(p?.payload?.date || "").slice(0, 10)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>

            {mode !== "edit" ? (
              <button
                type="button"
                onClick={addAnother}
                disabled={store?.loading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Add Another
              </button>
            ) : null}

            <button
              type="submit"
              disabled={store?.loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {mode === "edit" ? "Update" : pendingEntries.length ? "Save All" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TitheIndividualForm;
