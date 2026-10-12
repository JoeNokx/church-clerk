import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../../permissions/permission.store.js";
import ChurchContext from "../../../church/church.store.js";
import {
  getEventSupport,
  createEventSupport,
  updateEventSupport,
  searchSupportPeople,
} from "../../services/outreach.api.js";
import Button from "../../../../shared/components/Button/index.jsx";
import FilterBar from "../../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../../shared/components/MobileFilterBar/index.jsx";
import EmptyState from "../../../../shared/components/EmptyState/index.jsx";
import Pagination from "../../../../shared/components/Pagination/index.jsx";
import TableKebabMenu from "../../../../shared/components/TableKebabMenu/index.jsx";
import { SkeletonTableRows } from "../../../../shared/components/Skeleton/index.jsx";
import { useGuardedAction } from "../../../../shared/context/SubscriptionLockContext.jsx";
import { formatMoney } from "../../../../shared/utils/formatMoney.js";
import { truncateMobileName, truncateDesktopName } from "../../../../shared/utils/truncateTableText.js";

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"];

const PERSON_TYPE_STYLES = {
  member: "bg-blue-100 text-blue-700",
  visitor: "bg-amber-100 text-amber-700",
  guest: "bg-gray-100 text-gray-500",
};

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function personName(record) {
  if (record?.member) return `${record.member.firstName || ""} ${record.member.lastName || ""}`.trim() || "—";
  if (record?.visitor) return record.visitor.fullName || "—";
  return record?.name || "—";
}

function personType(record) {
  if (record?.visitor) return "visitor";
  if (record?.member) return "member";
  return "guest";
}

function PersonBadge({ type }) {
  return (
    <span className={`ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${PERSON_TYPE_STYLES[type] || "bg-gray-100 text-gray-600"}`}>
      {type}
    </span>
  );
}

// ─── Support Form Modal ──────────────────────────────────────────
function SupportFormModal({ open, mode, initialData, eventId, onClose, onSaved, canCreate, canUpdate }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [manualName, setManualName] = useState("");
  const [pendingEntries, setPendingEntries] = useState([]);

  const debouncedQuery = useMemo(() => String(query || "").trim(), [query]);

  const personOptionLabel = useCallback((p) => {
    const meta = [p?.phoneNumber, p?.email, p?.city].filter(Boolean).join(" • ");
    const name = p?.displayName || "—";
    return meta ? `${name} — ${meta}` : name;
  }, []);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setIsSubmitting(false);
    if (mode === "edit" && initialData) {
      setAmount(initialData.amount ?? "");
      setDate(String(initialData.date || "").slice(0, 10));
      setPaymentMethod(String(initialData.paymentMethod || "Cash"));
      setNote(String(initialData.note || ""));
      setManualName(String(initialData.name || ""));
      return;
    }
    setAmount("");
    setDate("");
    setPaymentMethod("Cash");
    setNote("");
    setQuery("");
    setOptions([]);
    setSelectedPerson(null);
    setManualName("");
    setPendingEntries([]);
  }, [open, mode, initialData]);

  useEffect(() => {
    if (!open || mode === "edit") return;
    const q = (debouncedQuery || "").trim();
    if (!q) {
      setOptions([]);
      return;
    }
    let alive = true;
    const id = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchSupportPeople(eventId, { search: q });
        const payload = res?.data ?? res;
        if (alive) setOptions(Array.isArray(payload?.people) ? payload.people : []);
      } catch {
        if (alive) setOptions([]);
      } finally {
        if (alive) setSearchLoading(false);
      }
    }, 250);
    return () => { alive = false; clearTimeout(id); };
  }, [debouncedQuery, open, mode, eventId]);

  const buildEntryPayload = () => {
    const hasPerson = Boolean(selectedPerson?._id);
    const hasName = Boolean(String(manualName || "").trim());
    if (!hasPerson && !hasName) {
      setFormError("Please select a member or visitor, or type a name.");
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
      ...(hasPerson
        ? (selectedPerson.type === "visitor" ? { visitorId: selectedPerson._id } : { memberId: selectedPerson._id })
        : { name: manualName.trim() }),
      amount: Number(amount),
      date,
      paymentMethod,
      note: String(note || "").trim(),
    };
  };

  const clearCurrentEntry = () => {
    setSelectedPerson(null);
    setManualName("");
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
    setPendingEntries((prev) => [
      ...prev,
      { payload: entry, person: selectedPerson, displayName: selectedPerson?.displayName || String(manualName || "").trim() }
    ]);
    clearCurrentEntry();
  };

  const editPending = (index) => {
    const entry = pendingEntries[index];
    if (!entry) return;
    setFormError(null);
    setSelectedPerson(entry.person || null);
    setManualName(entry.person ? "" : String(entry.displayName || ""));
    setAmount(entry.payload?.amount ?? "");
    setDate(String(entry.payload?.date || "").slice(0, 10));
    setPaymentMethod(String(entry.payload?.paymentMethod || "Cash"));
    setNote(String(entry.payload?.note || ""));
    setPendingEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (mode === "edit") {
        if (!canUpdate) return;
        if (!amount || Number(amount) <= 0) { setFormError("Amount is required."); return; }
        if (!date) { setFormError("Date is required."); return; }
        const isFreeText = Boolean(initialData?.name);
        if (isFreeText && !String(manualName || "").trim()) { setFormError("Name is required."); return; }
        await updateEventSupport(eventId, initialData?._id, {
          ...(isFreeText ? { name: manualName.trim() } : {}),
          amount: Number(amount),
          date,
          paymentMethod,
          note: String(note || "").trim(),
        });
        onSaved?.();
        return;
      }

      if (!canCreate) return;
      const hasCurrentInput = Boolean(selectedPerson || String(manualName || "").trim() || String(amount || "").trim() || date || String(note || "").trim());
      const payloads = pendingEntries.map((p) => p?.payload).filter(Boolean);
      if (hasCurrentInput) {
        const currentEntry = buildEntryPayload();
        if (!currentEntry) return;
        payloads.push(currentEntry);
      }
      if (!payloads.length) {
        setFormError("Please add at least one entry.");
        return;
      }
      await createEventSupport(eventId, payloads.length === 1 ? payloads[0] : { entries: payloads });
      onSaved?.();
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
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white rounded-t-xl px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Support" : "Record Support"}</div>
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
                <label className="block font-semibold text-gray-500 text-xs">Given By</label>
                {initialData?.name ? (
                  <input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                    placeholder="Name"
                  />
                ) : (
                  <div className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 flex items-center md:h-12 lg:h-11 lg:text-sm">
                    {personName(initialData)}
                    <PersonBadge type={personType(initialData)} />
                  </div>
                )}
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-500 text-xs">Given By</label>
                {selectedPerson ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                    <div className="min-w-0 font-semibold text-gray-900 truncate text-sm">
                      {selectedPerson.displayName}
                      <PersonBadge type={selectedPerson.type} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPerson(null)}
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
                        if (selectedPerson) setSelectedPerson(null);
                      }}
                      className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                      placeholder="Search member or visitor by name, phone, email"
                    />
                    {debouncedQuery.trim() || searchLoading ? (
                      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                        {searchLoading ? (
                          <div className="px-4 py-3 text-gray-600 text-sm">Searching...</div>
                        ) : options.length ? (
                          <div className="divide-y divide-gray-200">
                            {options.map((p, idx) => (
                              <button
                                key={p?._id ?? `p-${idx}`}
                                type="button"
                                onClick={() => {
                                  setSelectedPerson(p);
                                  setQuery("");
                                  setOptions([]);
                                }}
                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50"
                              >
                                <div className="font-semibold text-gray-900 truncate text-sm">
                                  {p.displayName}
                                  <PersonBadge type={p.type} />
                                </div>
                                {personOptionLabel(p) !== p.displayName ? (
                                  <div className="mt-0.5 text-gray-500 text-xs truncate">
                                    {[p?.phoneNumber, p?.email, p?.city].filter(Boolean).join(" • ")}
                                  </div>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-gray-600 text-sm">No members or visitors found — you can type their name below instead.</div>
                        )}
                      </div>
                    ) : null}

                    <input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="mt-3 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                      placeholder="Type their name if not a member or visitor"
                    />
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
                  <option key={m} value={m}>{m}</option>
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
                placeholder="e.g. Toward transport"
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
                          <div className="font-semibold text-gray-900 truncate text-sm">
                            {p?.displayName}
                            {p?.person?.type ? <PersonBadge type={p.person.type} /> : null}
                          </div>
                          <div className="mt-0.5 text-gray-600 text-xs">
                            {p?.payload?.amount || 0} • {p?.payload?.paymentMethod || "-"} • {(p?.payload?.date || "").slice(0, 10)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => editPending(i)}
                            className="font-semibold text-blue-700 hover:underline text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingEntries((prev) => prev.filter((_, idx) => idx !== i))}
                            className="font-semibold text-red-600 hover:underline text-xs"
                          >
                            Remove
                          </button>
                        </div>
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
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            {mode !== "edit" ? (
              <button
                type="button"
                onClick={addAnother}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
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

// ─── View Modal ──────────────────────────────────────────────────
function SupportViewModal({ open, record, currency, onClose }) {
  if (!open || !record) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white rounded-t-xl px-4 md:px-6 py-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">
              {personName(record)}
              <PersonBadge type={personType(record)} />
            </div>
            <div className="mt-0.5 font-mono text-xs text-gray-500">{record?.referenceId || ""}</div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><div className="font-semibold text-gray-500 text-xs">Amount</div><div className="mt-1 text-green-700 font-semibold">{formatMoney(record?.amount || 0, currency)}</div></div>
            <div><div className="font-semibold text-gray-500 text-xs">Date Received</div><div className="mt-1 text-gray-900">{formatDate(record?.date)}</div></div>
            <div><div className="font-semibold text-gray-500 text-xs">Date Recorded</div><div className="mt-1 text-gray-900">{formatDate(record?.createdAt)}</div></div>
            <div><div className="font-semibold text-gray-500 text-xs">Payment Method</div><div className="mt-1 text-gray-900">{record?.paymentMethod || "-"}</div></div>
            <div><div className="font-semibold text-gray-500 text-xs">Recorded By</div><div className="mt-1 text-gray-900">{record?.createdBy?.fullName || "-"}</div></div>
          </div>
          <div><div className="font-semibold text-gray-500 text-xs">Note</div><div className="mt-1 text-gray-700">{record?.note || "-"}</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── Support Tab ─────────────────────────────────────────────────
export default function OutreachSupportTab({ eventId }) {
  const guarded = useGuardedAction();
  const { can } = useContext(PermissionContext) || {};
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const canCreate = useMemo(() => (typeof can === "function" ? can("outreach", "create") : false), [can]);
  const canUpdate = useMemo(() => (typeof can === "function" ? can("outreach", "update") : false), [can]);

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, prevPage: null, nextPage: null });
  const [summary, setSummary] = useState({ total: 0 });
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedSearch = useDebouncedValue(search, 400);

  const [form, setForm] = useState({ open: false, mode: "create", data: null });
  const [viewRecord, setViewRecord] = useState(null);

  const fetchRecords = useCallback(async (overrides = {}) => {
    if (!eventId) return;
    const params = { page: overrides.page || 1, limit: overrides.limit || limit };
    const nextFrom = overrides.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
    const nextTo = overrides.dateTo !== undefined ? overrides.dateTo : dateTo;
    const nextSearch = overrides.search !== undefined ? overrides.search : debouncedSearch;
    if (nextFrom) params.dateFrom = nextFrom;
    if (nextTo) params.dateTo = nextTo;
    if (nextSearch) params.search = nextSearch;

    setLoading(true);
    setError("");
    try {
      const res = await getEventSupport(eventId, params);
      const payload = res?.data ?? res;
      setRecords(Array.isArray(payload?.support) ? payload.support : []);
      setPagination(payload?.pagination || { currentPage: 1, totalPages: 0, prevPage: null, nextPage: null });
      setSummary(payload?.summary || { total: 0 });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load support records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, limit, dateFrom, dateTo, debouncedSearch]);

  useEffect(() => {
    fetchRecords({ page: 1 });
  }, [eventId, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = Boolean(search || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    fetchRecords({ page: 1, search: "", dateFrom: "", dateTo: "" });
  };

  const onPageChange = (page) => { if (page) fetchRecords({ page }); };
  const onLimitChange = (n) => { setLimit(n); fetchRecords({ page: 1, limit: n }); };

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
        <div className="flex items-center gap-3 justify-between w-full md:w-auto">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Support</div>
            <div className="text-gray-500 text-xs">
              What members and visitors gave toward this outreach
              {summary.total ? ` • Total: ${formatMoney(summary.total, currency)}` : ""}
            </div>
          </div>
          {canCreate ? (
            <button
              type="button"
              onClick={() => guarded(() => setForm({ open: true, mode: "create", data: null }))}
              className="md:hidden inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm h-10"
            >
              <span className="leading-none text-lg">+</span>
              Record Support
            </button>
          ) : null}
        </div>

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search member or visitor"
          searchWidth="md:w-[200px]"
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); fetchRecords({ page: 1, dateFrom: from, dateTo: to }); }}
        >
          {canCreate ? (
            <button
              type="button"
              onClick={() => guarded(() => setForm({ open: true, mode: "create", data: null }))}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm h-10"
            >
              <span className="leading-none text-lg">+</span>
              Record Support
            </button>
          ) : null}
        </FilterBar>
        <MobileFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search member or visitor"
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); fetchRecords({ page: 1, dateFrom: from, dateTo: to }); }}
          className="w-full"
        />
      </div>

      {error ? <div className="p-4 text-red-700 md:p-6 lg:p-8 text-sm">{error}</div> : null}

      {loading ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <tbody className="divide-y divide-gray-200">
              <SkeletonTableRows rows={5} widths={["w-28", "w-16", "w-20", "w-24", "w-16", "w-10"]} cellClass="py-1.5 px-4 md:px-6" />
            </tbody>
          </table>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          compact
          illustration={hasFilters ? "search" : "contributions"}
          title={hasFilters ? "No support records found" : "No support yet"}
          description={hasFilters
            ? "We couldn't find any support records matching your current filters or date range."
            : "Record the first support given toward this outreach to start tracking giving."}
          actionLabel={hasFilters ? "Clear Filters" : null}
          onAction={hasFilters ? clearFilters : undefined}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Given By</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date Received</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Payment Method</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Ref ID</th>
                  <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((row, index) => (
                  <tr key={row?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                    <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={personName(row)}>
                      <span className="sm:hidden">{truncateMobileName(personName(row))}</span>
                      <span className="hidden sm:inline">{truncateDesktopName(personName(row))}</span>
                    </td>
                    <td className="max-md:px-4 py-1.5 text-green-700 whitespace-nowrap px-4 md:px-6">{formatMoney(row?.amount || 0, currency)}</td>
                    <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.date)}</td>
                    <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{row?.paymentMethod || "-"}</td>
                    <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                      {row?.referenceId ? (
                        <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{row.referenceId}</span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6 text-right">
                      <TableKebabMenu items={[
                        { label: "View", onClick: () => setViewRecord(row) },
                        canUpdate && { label: "Edit", onClick: () => guarded(() => setForm({ open: true, mode: "edit", data: row })) }
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={pagination}
            rowsCount={records.length}
            limit={limit}
            onLimitChange={onLimitChange}
            onPageChange={onPageChange}
            itemName="records"
            filtered={hasFilters}
          />
        </>
      )}

      <SupportFormModal
        open={form.open}
        mode={form.mode}
        initialData={form.data}
        eventId={eventId}
        canCreate={canCreate}
        canUpdate={canUpdate}
        onClose={() => setForm({ open: false, mode: "create", data: null })}
        onSaved={() => { setForm({ open: false, mode: "create", data: null }); fetchRecords({ page: 1 }); }}
      />

      <SupportViewModal
        open={!!viewRecord}
        record={viewRecord}
        currency={currency}
        onClose={() => setViewRecord(null)}
      />
    </div>
  );
}
