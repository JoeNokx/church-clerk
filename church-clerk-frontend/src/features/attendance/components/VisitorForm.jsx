import { useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import AttendanceContext from "../attendance.store.js";
import { getVisitors } from "../services/attendance.api.js";
import debounce from "../../../shared/utils/debounce.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import Button from "../../../shared/components/Button/index.jsx";

function formatSessionDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function VisitorForm({ open, mode, initialData, session, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(AttendanceContext);

  const sessionContext = session
    || (Array.isArray(initialData?.attendance) ? initialData.attendance[0] : null)
    || (initialData?.attendance && typeof initialData.attendance === "object" ? initialData.attendance : null);

  const canCreate = useMemo(() => (typeof can === "function" ? can("visitors", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("visitors", "update") : false), [can]);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedExisting, setSelectedExisting] = useState(null);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (q) => {
        if (!q || q.trim().length < 2) {
          setSearchResults([]);
          setSearchLoading(false);
          return;
        }
        try {
          const res = await getVisitors({ search: q.trim(), page: 1, limit: 5 });
          const payload = res?.data?.data ?? res?.data;
          setSearchResults(Array.isArray(payload?.visitors) ? payload.visitors : []);
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 350),
    []
  );

  useEffect(() => () => debouncedSearch.cancel?.(), [debouncedSearch]);

  const onSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim().length >= 2) setSearchLoading(true);
    debouncedSearch(q);
  };

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setIsSubmitting(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchLoading(false);
    setSelectedExisting(null);

    if (initialData) {
      setFullName(initialData.fullName || "");
      setPhoneNumber(initialData.phoneNumber || "");
      setEmail(initialData.email || "");
      setLocation(initialData.location || "");
      setInvitedBy(initialData.invitedBy || "");
      setSource(initialData.source || "");
      setNote(initialData.note || "");
      return;
    }

    setFullName("");
    setPhoneNumber("");
    setEmail("");
    setLocation("");
    setInvitedBy("");
    setSource("");
    setNote("");
  }, [open, mode, initialData, session]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    if (selectedExisting) {
      if (!sessionContext?._id) {
        setFormError("This visitor already exists in the system.");
        setIsSubmitting(false);
        return;
      }
      try {
        if (!canEdit) {
          setIsSubmitting(false);
          return;
        }
        await store?.updateVisitor(selectedExisting._id, { attendance: sessionContext._id });
        onSuccess?.();
      } catch (e2) {
        const message = e2?.response?.data?.error || e2?.response?.data?.message || e2?.message || "Request failed";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!fullName?.trim()) {
      setFormError("Full name is required.");
      setIsSubmitting(false);
      return;
    }

    if (!phoneNumber?.trim()) {
      setFormError("Phone number is required.");
      setIsSubmitting(false);
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setFormError("Invalid phone number");
      setIsSubmitting(false);
      return;
    }

    if (!location?.trim()) {
      setFormError("Location is required.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      fullName,
      phoneNumber,
      email,
      location,
      invitedBy,
      source,
      note
    };

    const sessionId = sessionContext?._id || (typeof initialData?.attendance === "string" ? initialData.attendance : "");
    if (sessionId) {
      payload.attendance = sessionId;
    }

    try {
      if (mode === "edit") {
        if (!canEdit) {
          setIsSubmitting(false);
          return;
        }
        await store?.updateVisitor(initialData?._id, payload);
      } else {
        if (!canCreate) {
          setIsSubmitting(false);
          return;
        }
        await store?.createVisitor(payload);
      }

      onSuccess?.();
    } catch (e2) {
      const message = e2?.response?.data?.error || e2?.response?.data?.message || e2?.message || "Request failed";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Visitor" : "Add Visitor"}</div>
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
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{formError}</div>
          )}

          {sessionContext ? (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800 text-sm">
              {mode === "edit" ? "This visitor belongs to the session" : "Adding to session"}: <span className="font-semibold">{sessionContext.serviceType || "-"}</span> — {formatSessionDate(sessionContext.date)}
            </div>
          ) : null}

          {mode !== "edit" ? (
            <div className="mb-4">
              <label className="block font-semibold text-gray-500 text-xs">Search existing visitor first</label>
              <input
                value={searchQuery}
                onChange={onSearchChange}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="Search by name or phone number"
              />
              {searchLoading ? (
                <div className="mt-2 text-gray-500 text-xs">Searching…</div>
              ) : null}
              {!searchLoading && searchResults.length > 0 ? (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-200">
                  {searchResults.map((v) => (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => setSelectedExisting(v)}
                      className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50 last:border-b-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-gray-900 text-sm">{v.fullName}</span>
                        <span className="block truncate text-gray-500 text-xs">{v.phoneNumber || "-"}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 text-xs">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                <div className="mt-2 text-gray-500 text-xs">No existing visitor found — fill the details below to add a new one.</div>
              ) : null}
            </div>
          ) : null}

          {selectedExisting ? (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-green-900 text-sm">{selectedExisting.fullName}</div>
                  <div className="text-green-700 text-xs">{selectedExisting.phoneNumber || "-"}</div>
                  <div className="mt-1 text-green-700 text-xs">This visitor already exists. Saving will add them to this session.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedExisting(null)}
                  className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block font-semibold text-gray-500 text-xs">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
              <div className="mt-2">
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  error={Boolean(formError)}
                  flagOnlySelectedCountry
                  countryMenuSearchBar
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder=""
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder=""
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Invited By</label>
              <input
                value={invitedBy}
                onChange={(e) => setInvitedBy(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder=""
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">How did you hear about the church?</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              >
                <option value="">Select a source</option>
                <option value="Church member">Church member</option>
                <option value="Friend or family">Friend or family</option>
                <option value="Church outreach">Church outreach</option>
                <option value="Church program">Church program</option>
                <option value="Social media">Social media</option>
                <option value="Church website">Church website</option>
                <option value="Online search">Online search</option>
                <option value="Flyer">Flyer</option>
                <option value="Radio or television">Radio or television</option>
                <option value="Passed by">Passed by</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-500 text-xs">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
                rows={3}
              />
            </div>
          </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              loadingText={mode === "edit" ? "Updating..." : "Saving..."}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {mode === "edit" ? "Update" : selectedExisting ? "Add to Session" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VisitorForm;
