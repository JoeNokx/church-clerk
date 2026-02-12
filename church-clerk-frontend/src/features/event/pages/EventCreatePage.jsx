import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import { createEvent as apiCreateEvent, getEvent as apiGetEvent, updateEvent as apiUpdateEvent } from "../services/event.api.js";

const CATEGORY_OPTIONS = [
  "Conference",
  "Service",
  "Worship",
  "Prayers",
  "Outreach",
  "Bible Study",
  "Serminary",
  "Retreat",
  "Workshop",
  "Camp Meeting"
];

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function EventCreatePage({ open, onClose, onSuccess, mode = "create", eventId }) {
  const { can } = useContext(PermissionContext) || {};
  const canCreate = useMemo(() => (typeof can === "function" ? can("events", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("events", "update") : false), [can]);

  const navigate = useNavigate();
  const location = useLocation();
  const { toPage } = useDashboardNavigator();

  const isModal = typeof open === "boolean";
  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [venue, setVenue] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [description, setDescription] = useState("");

  const [initialLoading, setInitialLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isModal) return;
    if (!open) return;
    setTitle("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setTimeFrom("");
    setTimeTo("");
    setVenue("");
    setOrganizer("");
    setDescription("");
    setInitialLoading(false);
    setLoading(false);
    setError(null);

    if (!isEdit) return;
    if (!eventId) return;

    let cancelled = false;

    (async () => {
      setInitialLoading(true);
      try {
        const res = await apiGetEvent(eventId);
        const payload = res?.data?.data ?? res?.data;
        const e = payload?.event ?? payload;
        if (cancelled) return;

        setTitle(e?.title || "");
        setCategory(e?.category || "");
        setDateFrom(e?.dateFrom ? String(e.dateFrom).slice(0, 10) : "");
        setDateTo(e?.dateTo ? String(e.dateTo).slice(0, 10) : "");

        const tf = e?.timeFrom || "";
        const tt = e?.timeTo || "";
        if (tf || tt) {
          setTimeFrom(tf);
          setTimeTo(tt);
        } else {
          const raw = String(e?.time || "");
          const parts = raw.split("-").map((x) => x.trim()).filter(Boolean);
          setTimeFrom(parts?.[0] || raw);
          setTimeTo(parts?.[1] || "");
        }

        const org =
          typeof e?.organizers === "string"
            ? e.organizers
            : Array.isArray(e?.organizers)
              ? e.organizers[0]
              : "";
        setOrganizer(org || "");

        setVenue(e?.venue || "");
        setDescription(e?.description || "");
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load event");
      } finally {
        if (cancelled) return;
        setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isModal, open, isEdit, eventId]);

  const goBack = useCallback(() => {
    if (isModal) {
      onClose?.();
      return;
    }
    const from = location?.state?.from;
    if (from === "programs-events") {
      toPage("programs-events");
      return;
    }
    navigate(-1);
  }, [isModal, onClose, location?.state?.from, navigate, toPage]);

  const closeModal = useCallback(() => {
    if (loading) return;
    goBack();
  }, [loading, goBack]);

  useEffect(() => {
    if (!isModal) return;
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeModal();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isModal, open, closeModal]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (isEdit) {
      if (!canEdit) {
        setError("You do not have permission to edit events.");
        return;
      }
    } else {
      if (!canCreate) {
        setError("You do not have permission to create events.");
        return;
      }
    }

    if (isEdit && !eventId) {
      setError("Event id is missing");
      return;
    }

    if (!title || !dateFrom || !venue) {
      setError("Title, Date and Venue are required.");
      return;
    }

    setLoading(true);
    setError(null);

    const safeOrganizer = String(organizer || "").trim();

    const safeTimeFrom = String(timeFrom || "").trim();
    const safeTimeTo = String(timeTo || "").trim();
    const computedTime =
      safeTimeFrom && safeTimeTo
        ? `${safeTimeFrom} - ${safeTimeTo}`
        : safeTimeFrom || safeTimeTo || "";

    const payload = {
      title,
      category: category || undefined,
      dateFrom,
      dateTo: dateTo || undefined,
      timeFrom: safeTimeFrom || undefined,
      timeTo: safeTimeTo || undefined,
      time: computedTime || undefined,
      venue,
      organizers: safeOrganizer || undefined,
      description: description || undefined
    };

    try {
      if (isEdit) {
        await apiUpdateEvent(eventId, payload);
      } else {
        await apiCreateEvent(payload);
      }
      if (typeof onSuccess === "function") {
        await onSuccess();
        return;
      }
      if (isModal) {
        onClose?.();
        return;
      }
      toPage("programs-events", undefined, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  if (isModal && !open) return null;

  const content = (
    <div className={isModal ? "w-full max-w-2xl" : "max-w-4xl"}>
      <div className={isModal ? "rounded-2xl border border-gray-200 bg-white shadow-xl max-h-[90vh] flex flex-col overflow-hidden" : ""}>
        {isModal ? (
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Event" : "Create Event"}</div>
              <div className="mt-1 text-sm text-gray-600">{isEdit ? "Update event information" : "Add a new church event"}</div>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <span className="text-base leading-none">←</span>
                  Back
                </button>

                <h2 className="text-2xl font-semibold text-gray-900">{isEdit ? "Edit Event" : "Create Event"}</h2>
              </div>
              <p className="mt-2 text-sm text-gray-600">{isEdit ? "Update event information" : "Add a new church event"}</p>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className={isModal ? "flex flex-col min-h-0" : "mt-6 rounded-xl border border-gray-200 bg-white"}>
          {isModal ? null : (
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="text-sm font-semibold text-gray-900">Event Information</div>
              <div className="mt-1 text-xs text-gray-500">Fill the details below to create an event</div>
            </div>
          )}

          <div className={isModal ? "p-5 overflow-y-auto min-h-0" : "p-5"}>
            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            {isEdit ? (!canEdit ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You do not have permission to edit events.
              </div>
            ) : null) : (!canCreate ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You do not have permission to create events.
              </div>
            ) : null)}

            {initialLoading ? (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">Loading...</div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  placeholder="Event title"
                />
              </Field>

              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Date From">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
              </Field>

              <Field label="Date To">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
              </Field>

              <Field label="Time From">
                <input
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  placeholder="10:00AM"
                />
              </Field>

              <Field label="Time To">
                <input
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  placeholder="1:00PM"
                />
              </Field>

              <Field label="Venue">
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  placeholder="Event venue"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Organizer">
                  <input
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                    placeholder="e.g. John Doe"
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Description">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[120px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                    placeholder="Optional event description"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className={isModal ? "border-t border-gray-200 px-5 py-4 bg-white" : "border-t border-gray-200 px-5 py-4"}>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={(isEdit ? !canEdit : !canCreate) || initialLoading || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (!isModal) return content;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        closeModal();
      }}
    >
      <div className="w-full flex justify-center">
        {content}
      </div>
    </div>
  );
}

export default EventCreatePage;
