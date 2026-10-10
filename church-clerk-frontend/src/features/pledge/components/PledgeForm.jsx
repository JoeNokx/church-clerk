import { useEffect, useState } from "react";
import Button from "../../../shared/components/Button/index.jsx";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import { createPledge } from "../services/pledge.api.js";
import { getMembers } from "../../member/services/member.api.js";
import { getVisitors } from "../../attendance/services/attendance.api.js";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

const SERVICE_TYPES = [
  "Sunday Service",
  "Sunday First Service",
  "Sunday Second Service",
  "Sunday Third Service",
  "Sunday Fourth Service",
  "Sunday Fifth Service",
  "Worship Service",
  "Bible Study",
  "Children Service",
  "Midweek Service",
  "Prayer Meeting",
  "Special Program"
];

// scope: { churchProject: id } or { event: id } — determines what the pledge is attached to.
function PledgeForm({ scope, disabled, onDone, onCancel }) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [personOptions, setPersonOptions] = useState([]);
  const [personSearching, setPersonSearching] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [pledgeQueue, setPledgeQueue] = useState([]);
  const [serviceType, setServiceType] = useState("");
  const [amount, setAmount] = useState("");
  const [pledgeDate, setPledgeDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { values: lookupServiceTypes, reload: reloadServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : SERVICE_TYPES;

  const debouncedPersonQuery = useDebouncedValue(personQuery, 300);

  useEffect(() => {
    if (selectedPerson) return;
    const q = String(debouncedPersonQuery || "").trim();

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!q) {
        setPersonOptions([]);
        return;
      }

      setPersonSearching(true);
      const [membersRes, visitorsRes] = await Promise.all([
        getMembers({ search: q, page: 1, limit: 8 }).catch(() => null),
        getVisitors({ search: q, page: 1, limit: 8 }).catch(() => null),
      ]);
      if (cancelled) return;
      const mPayload = membersRes?.data?.data ?? membersRes?.data;
      const vPayload = visitorsRes?.data?.data ?? visitorsRes?.data;
      const members = (Array.isArray(mPayload?.members) ? mPayload.members : []).map((m) => ({ ...m, _source: "member" }));
      const visitors = (Array.isArray(vPayload?.visitors) ? vPayload.visitors : []).map((v) => ({ ...v, _source: "visitor" }));
      setPersonOptions([...members, ...visitors].slice(0, 8));
      setPersonSearching(false);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [debouncedPersonQuery, selectedPerson]);

  const selectPerson = (p) => {
    if (!p) return;
    const isVisitor = p?._source === "visitor";
    const fullName = isVisitor
      ? (p?.fullName || "")
      : (`${String(p?.firstName || "").trim()} ${String(p?.lastName || "").trim()}`.trim() || p?.fullName || "");
    setSelectedPerson(p);
    setPersonQuery(fullName);
    setPersonOptions([]);
    setName(fullName);
    setPhoneNumber(p?.phoneNumber || "");
    setError("");
  };

  const clearPerson = () => {
    setSelectedPerson(null);
    setPersonQuery("");
    setPersonOptions([]);
  };

  const clearPersonEntry = () => {
    setName("");
    setPhoneNumber("");
    setAmount("");
    setNote("");
    clearPerson();
  };

  const validateEntry = () => {
    if (!String(name || "").trim()) {
      setError("Name is required.");
      return null;
    }

    if (!String(phoneNumber || "").trim()) {
      setError("Phone number is required.");
      return null;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setError("Invalid phone number");
      return null;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Amount is required.");
      return null;
    }

    if (!pledgeDate) {
      setError("Pledge date is required.");
      return null;
    }

    return {
      name: String(name).trim(),
      phoneNumber: String(phoneNumber).trim(),
      serviceType: String(serviceType || "").trim() || undefined,
      amount: Number(amount),
      pledgeDate,
      deadline: deadline || undefined,
      note: String(note || "").trim() || undefined
    };
  };

  const addAnother = () => {
    const entry = validateEntry();
    if (!entry) return;
    setError("");
    setPledgeQueue((prev) => [
      ...prev,
      { id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, ...entry }
    ]);
    clearPersonEntry();
  };

  const onEditQueuedPledge = (q) => {
    if (!q) return;
    setPledgeQueue((prev) => prev.filter((x) => x.id !== q.id));
    setName(q.name || "");
    setPhoneNumber(q.phoneNumber || "");
    setServiceType(q.serviceType || "");
    setAmount(q.amount ?? "");
    setPledgeDate(q.pledgeDate || "");
    setDeadline(q.deadline || "");
    setNote(q.note || "");
    clearPerson();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    if (!scope?.churchProject && !scope?.event) { setIsSubmitting(false); return; }

    const queue = Array.isArray(pledgeQueue) ? [...pledgeQueue] : [];
    const hasCurrent = Boolean(
      String(name || "").trim() ||
      String(phoneNumber || "").trim() ||
      String(amount || "").trim() ||
      String(note || "").trim()
    );
    if (hasCurrent) {
      const entry = validateEntry();
      if (!entry) {
        setIsSubmitting(false);
        return;
      }
      queue.push({ id: "current", ...entry });
    }

    if (!queue.length) {
      validateEntry();
      setIsSubmitting(false);
      return;
    }

    try {
      for (const item of queue) {
        await createPledge({
          ...(scope?.churchProject ? { churchProject: scope.churchProject } : {}),
          ...(scope?.event ? { event: scope.event } : {}),
          name: item.name,
          phoneNumber: item.phoneNumber,
          serviceType: item.serviceType,
          amount: item.amount,
          pledgeDate: item.pledgeDate,
          deadline: item.deadline,
          note: item.note,
          status: "In Progress"
        });
      }
      onDone?.("pledge");
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

      <div>
        <label className="block font-semibold text-gray-500 text-xs">Find a member or visitor</label>
        <div className="mt-0.5 text-gray-400 text-xs">Search for an existing member or visitor to autofill the details, or type the pledger's info manually below.</div>
        {selectedPerson ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
            <div className="min-w-0">
              <div className="font-semibold text-blue-900 truncate text-sm">{name || "—"}</div>
              <div className="text-blue-700 truncate text-xs">
                {`${selectedPerson?._source === "visitor" ? "Visitor" : "Member"}${selectedPerson?.phoneNumber || selectedPerson?.email ? ` • ${selectedPerson?.phoneNumber || selectedPerson?.email}` : ""}`}
              </div>
            </div>
            <button
              type="button"
              onClick={clearPerson}
              className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50 text-xs"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              value={personQuery}
              onChange={(e) => setPersonQuery(e.target.value)}
              type="text"
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              placeholder="Search member or visitor by name, phone, email"
            />
            {String(personQuery || "").trim() ? (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-200">
                {personSearching ? (
                  <div className="px-4 py-3 text-gray-600 text-sm">Searching...</div>
                ) : personOptions.length ? (
                  <div className="divide-y divide-gray-200">
                    {personOptions.map((p, idx) => {
                      const isVisitor = p?._source === "visitor";
                      const personName = isVisitor
                        ? (p?.fullName || "—")
                        : (`${String(p?.firstName || "").trim()} ${String(p?.lastName || "").trim()}`.trim() || p?.fullName || "—");
                      return (
                        <button
                          key={`${p?._source || "p"}-${p?._id ?? idx}`}
                          type="button"
                          onClick={() => selectPerson(p)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-gray-900 truncate text-sm">{personName}</div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold text-xs ${isVisitor ? "bg-yellow-50 text-yellow-700" : "bg-blue-50 text-blue-700"}`}>
                              {isVisitor ? "Visitor" : "Member"}
                            </span>
                          </div>
                          <div className="text-gray-500 truncate text-xs">{[p?.phoneNumber, p?.email].filter(Boolean).join(" • ")}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-gray-600 text-sm">No members or visitors found — fill the fields below to add them manually.</div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block font-semibold text-gray-500 text-xs">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            placeholder="e.g., John Doe"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
          <div className="mt-2">
            <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} error={Boolean(error)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block font-semibold text-gray-500 text-xs">Service Type</label>
            <AddLookupValueButton
              label="Add service"
              kind="serviceType"
              onCreated={async (value) => {
                await reloadServiceTypes();
                setServiceType(value);
              }}
            />
          </div>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
          >
            <option value="">Select service type</option>
            {serviceTypeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            type="number"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Date Pledged</label>
          <input
            value={pledgeDate}
            onChange={(e) => setPledgeDate(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            type="date"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Pledge Deadline</label>
          <input
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            type="date"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block font-semibold text-gray-500 text-xs">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            maxLength={500}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            placeholder="Optional (max 500 chars)"
          />
          <div className="mt-1 text-right text-gray-400 text-xs">{note.length}/500</div>
        </div>
      </div>

      {pledgeQueue?.length ? (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-600 text-xs">Queued Pledges</div>
          <div className="max-h-36 overflow-y-auto divide-y divide-gray-200">
            {pledgeQueue.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate text-sm">{q?.name || "—"}</div>
                  <div className="text-gray-600 truncate text-xs">{[q?.phoneNumber, q?.amount != null ? Number(q.amount).toLocaleString() : ""].filter(Boolean).join(" • ")}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => onEditQueuedPledge(q)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                    aria-label="Edit"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M13 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setPledgeQueue((prev) => prev.filter((x) => x.id !== q.id))}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-60"
                    aria-label="Remove"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path d="M4 7h16M9 7V5h6v2m-9 0 1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={addAnother}
          disabled={isSubmitting}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60 text-sm"
        >
          Add Another
        </button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          loadingText="Creating..."
          disabled={disabled}
          className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
        >
          {pledgeQueue?.length ? "Create All" : "Create Pledge"}
        </Button>
      </div>
    </form>
  );
}

export default PledgeForm;
