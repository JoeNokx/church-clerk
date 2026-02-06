import { useEffect, useMemo, useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import { getEvent as apiGetEvent, updateEvent as apiUpdateEvent } from "../services/event.api.js";

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

function EventEditPage() {
  const { can } = useContext(PermissionContext) || {};
  const canEdit = useMemo(() => (typeof can === "function" ? can("events", "update") : false), [can]);

  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const eventId = params.get("id");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [organizers, setOrganizers] = useState("");
  const [description, setDescription] = useState("");

  const goBack = () => {
    const from = location?.state?.from;
    if (from === "programs-events") {
      navigate("/dashboard?page=programs-events");
      return;
    }
    if (from === "event-details" && eventId) {
      navigate(`/dashboard?page=event-details&id=${eventId}`);
      return;
    }
    navigate(-1);
  };

  useEffect(() => {
    if (!eventId) {
      setError("Event id is missing");
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetEvent(eventId);
        const payload = res?.data?.data ?? res?.data;
        const e = payload?.event ?? payload;

        if (cancelled) return;

        setTitle(e?.title || "");
        setCategory(e?.category || "");
        setDateFrom(e?.dateFrom ? String(e.dateFrom).slice(0, 10) : "");
        setDateTo(e?.dateTo ? String(e.dateTo).slice(0, 10) : "");
        setTime(e?.time || "");
        setVenue(e?.venue || "");
        setOrganizers(Array.isArray(e?.organizers) ? e.organizers.join(", ") : "");
        setDescription(e?.description || "");
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load event");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!canEdit) {
      setError("You do not have permission to edit events.");
      return;
    }

    if (!eventId) {
      setError("Event id is missing");
      return;
    }

    if (!title || !dateFrom || !venue) {
      setError("Title, Date and Venue are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title,
      category: category || undefined,
      dateFrom,
      dateTo: dateTo || undefined,
      time: time || undefined,
      venue,
      organizers: organizers
        ? organizers
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : undefined,
      description: description || undefined
    };

    try {
      await apiUpdateEvent(eventId, payload);
      navigate(`/dashboard?page=event-details&id=${eventId}`, { replace: true, state: { from: "programs-events" } });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
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

            <h2 className="text-2xl font-semibold text-gray-900">Edit Event</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">Update event information</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">Event Information</div>
          <div className="mt-1 text-xs text-gray-500">Edit the details below</div>
        </div>

        <form onSubmit={onSubmit} className="p-5">
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {!canEdit ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You do not have permission to edit events.
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">Loading...</div>
          ) : (
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

              <Field label="Time">
                <input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  placeholder="10:00AM - 1:00PM"
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
                <Field label="Organizers (comma-separated)">
                  <input
                    value={organizers}
                    onChange={(e) => setOrganizers(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                    placeholder="e.g. John Doe, Jane Doe"
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
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canEdit || loading || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventEditPage;
