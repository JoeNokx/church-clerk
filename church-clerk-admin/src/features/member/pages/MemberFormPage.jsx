import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../Permissions/permission.store.js";
import MemberContext, { MemberProvider } from "../member.store.js";
import { getMember as apiGetMember } from "../services/member.api.js";
import { getCells, createCell as apiCreateCell } from "../../cell/services/cell.api.js";
import { getDepartments, createDepartment as apiCreateDepartment } from "../../department/services/department.api.js";
import { getGroups, createGroup as apiCreateGroup } from "../../group/services/group.api.js";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Visitor", value: "visitor" },
  { label: "Former", value: "former" }
];

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" }
];

const MARITAL_STATUS_OPTIONS = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Divorced", value: "divorced" },
  { label: "Widowed", value: "widowed" },
  { label: "Other", value: "other" }
];

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatusChipPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_OPTIONS.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange?.(s.value)}
            className={
              active
                ? "rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                : "rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            }
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function SimpleModal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
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
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function MemberFormPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { toPage } = useDashboardNavigator();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const memberId = params.get("id");

  const canCreate = useMemo(() => (typeof can === "function" ? can("members", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("members", "update") : false), [can]);

  const [pageMode, setPageMode] = useState(memberId ? "edit" : "create");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [nationality, setNationality] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");

  const [churchRole, setChurchRole] = useState("");
  const [dateJoined, setDateJoined] = useState("");

  const [cells, setCells] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);

  const [cellId, setCellId] = useState("");
  const [departmentSelectId, setDepartmentSelectId] = useState("");
  const [departmentIds, setDepartmentIds] = useState([]);
  const [groupSelectId, setGroupSelectId] = useState("");
  const [groupIds, setGroupIds] = useState([]);

  const [status, setStatus] = useState("active");
  const [note, setNote] = useState("");
  const [visitorId, setVisitorId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [ministryLoading, setMinistryLoading] = useState(false);

  const [addCellOpen, setAddCellOpen] = useState(false);
  const [addCellName, setAddCellName] = useState("");
  const [addCellError, setAddCellError] = useState(null);

  const [addDepartmentOpen, setAddDepartmentOpen] = useState(false);
  const [addDepartmentName, setAddDepartmentName] = useState("");
  const [addDepartmentError, setAddDepartmentError] = useState(null);

  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addGroupName, setAddGroupName] = useState("");
  const [addGroupMeetingDay, setAddGroupMeetingDay] = useState("");
  const [addGroupMeetingTime, setAddGroupMeetingTime] = useState("");
  const [addGroupMeetingVenue, setAddGroupMeetingVenue] = useState("");
  const [addGroupDescription, setAddGroupDescription] = useState("");
  const [addGroupError, setAddGroupError] = useState(null);

  const hydrateFromMember = useCallback((m) => {
    if (!m) return;

    setFirstName(m.firstName || "");
    setLastName(m.lastName || "");
    setPhoneNumber(m.phoneNumber || "");
    setEmail(m.email || "");

    setGender(m.gender || "");
    setOccupation(m.occupation || "");
    setNationality(m.nationality || "");
    setDateOfBirth((m.dateOfBirth || "").slice(0, 10));

    setStreetAddress(m.streetAddress || "");
    setCity(m.city || "");
    setRegion(m.region || "");
    setCountry(m.country || "");
    setMaritalStatus(m.maritalStatus || "");

    setChurchRole(m.churchRole || "");
    setDateJoined((m.dateJoined || "").slice(0, 10));

    const cell = Array.isArray(m.cell) ? m.cell : [];
    const depts = Array.isArray(m.department) ? m.department : [];
    const grps = Array.isArray(m.group) ? m.group : [];

    setCellId(cell?.[0]?._id || "");
    setDepartmentIds(depts.map((d) => d?._id).filter(Boolean));
    setGroupIds(grps.map((g) => g?._id).filter(Boolean));

    setStatus(m.status || "active");
    setNote(m.note || "");
    setVisitorId(m.visitorId || null);
  }, []);

  useEffect(() => {
    const state = location.state;
    const prefillMember = state?.prefillMember || null;

    if (!prefillMember) return;

    hydrateFromMember(prefillMember);
    setVisitorId(prefillMember?.visitorId || null);

    navigate(location.pathname, {
      replace: true,
      state: {}
    });
  }, [location.pathname, location.state, navigate, hydrateFromMember]);

  const fetchMinistry = useCallback(async () => {
    setMinistryLoading(true);
    try {
      const [cellsRes, deptRes, groupRes] = await Promise.all([
        getCells({ page: 1, limit: 1000 }),
        getDepartments({ page: 1, limit: 1000 }),
        getGroups({ page: 1, limit: 1000 })
      ]);

      const cPayload = cellsRes?.data?.data ?? cellsRes?.data;
      const dPayload = deptRes?.data?.data ?? deptRes?.data;
      const gPayload = groupRes?.data?.data ?? groupRes?.data;

      setCells(cPayload?.cells || []);
      setDepartments(dPayload?.departments || []);
      setGroups(gPayload?.groups || []);
    } catch {
      setCells([]);
      setDepartments([]);
      setGroups([]);
    } finally {
      setMinistryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!store?.activeChurch) return;
    fetchMinistry();
  }, [store?.activeChurch, fetchMinistry]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!store?.activeChurch) return;

      if (!memberId) {
        setPageMode("create");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await apiGetMember(memberId);
        const payload = res?.data?.data ?? res?.data;
        const m = payload?.member || payload;
        if (cancelled) return;
        hydrateFromMember(m);
        setPageMode("edit");
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || "Failed to fetch member");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [memberId, store?.activeChurch, hydrateFromMember]);

  const createNewCell = async () => {
    setAddCellError(null);
    if (!addCellName?.trim()) {
      setAddCellError("Cell name is required.");
      return;
    }

    try {
      await apiCreateCell({ name: addCellName.trim() });
      setAddCellOpen(false);
      setAddCellName("");
      await fetchMinistry();
    } catch (e) {
      setAddCellError(e?.response?.data?.message || e?.message || "Failed to create cell");
    }
  };

  const createNewDepartment = async () => {
    setAddDepartmentError(null);
    if (!addDepartmentName?.trim()) {
      setAddDepartmentError("Department name is required.");
      return;
    }

    try {
      await apiCreateDepartment({ name: addDepartmentName.trim() });
      setAddDepartmentOpen(false);
      setAddDepartmentName("");
      await fetchMinistry();
    } catch (e) {
      setAddDepartmentError(e?.response?.data?.message || e?.message || "Failed to create department");
    }
  };

  const createNewGroup = async () => {
    setAddGroupError(null);

    if (!addGroupName?.trim()) {
      setAddGroupError("Group name is required.");
      return;
    }

    if (!addGroupMeetingDay?.trim() || !addGroupMeetingTime?.trim() || !addGroupMeetingVenue?.trim()) {
      setAddGroupError("Meeting day, time and venue are required.");
      return;
    }

    try {
      await apiCreateGroup({
        name: addGroupName.trim(),
        description: addGroupDescription?.trim() || undefined,
        meetingSchedule: [
          {
            meetingDay: addGroupMeetingDay.trim(),
            meetingTime: addGroupMeetingTime.trim(),
            meetingVenue: addGroupMeetingVenue.trim()
          }
        ]
      });
      setAddGroupOpen(false);
      setAddGroupName("");
      setAddGroupDescription("");
      setAddGroupMeetingDay("");
      setAddGroupMeetingTime("");
      setAddGroupMeetingVenue("");
      await fetchMinistry();
    } catch (e) {
      setAddGroupError(e?.response?.data?.message || e?.message || "Failed to create group");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!firstName?.trim() || !lastName?.trim() || !phoneNumber?.trim()) {
      setError("First name, last name and phone number are required.");
      return;
    }

    const payload = {
      firstName,
      lastName,
      phoneNumber,
      email,
      gender: gender || undefined,
      occupation: occupation || undefined,
      nationality: nationality || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,

      streetAddress: streetAddress || undefined,
      city,
      region: region || undefined,
      country: country || undefined,
      maritalStatus: maritalStatus || undefined,

      churchRole: churchRole || undefined,
      dateJoined: dateJoined ? new Date(dateJoined).toISOString() : undefined,

      department: departmentIds,
      group: groupIds,
      cell: cellId ? [cellId] : [],

      status,
      note,
      visitorId: visitorId || null
    };

    try {
      if (pageMode === "edit") {
        if (!canEdit) return;
        await store?.updateMember(memberId, payload);
      } else {
        if (!canCreate) return;
        await store?.createMember(payload);
      }

      toPage("members");
    } catch (e2) {
      const message = e2?.response?.data?.error || e2?.response?.data?.message || e2?.message || "Request failed";
      setError(message);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{pageMode === "edit" ? "Edit Member" : "Add Member"}</h2>
          <p className="mt-2 text-sm text-gray-600">Fill in member details</p>
        </div>

        <button
          type="button"
          onClick={() => toPage("members")}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">Loading...</div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <Section title="Personal Information" subtitle="Basic information about the member">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First Name">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  />
                </Field>

                <Field label="Last Name">
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  />
                </Field>

                <Field label="Phone Number">
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  />
                </Field>

                <Field label="Email">
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                </Field>

                <Field label="Gender">
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Date of Birth">
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                </Field>

                <Field label="Occupation">
                  <input value={occupation} onChange={(e) => setOccupation(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                </Field>

                <Field label="Nationality">
                  <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                </Field>

                <Field label="Marital Status">
                  <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
                    <option value="">Select status</option>
                    {MARITAL_STATUS_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <StatusChipPicker value={status} onChange={setStatus} />
                </Field>
              </div>
            </Section>

            <Section title="Address Information" subtitle="Where the member lives">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Street Address">
                    <input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                  </Field>
                </div>

                <Field label="City">
                  <input value={city} onChange={(e) => setCity(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                </Field>

                <Field label="Region">
                  <input value={region} onChange={(e) => setRegion(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                </Field>

                <Field label="Country">
                  <input value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                </Field>
              </div>
            </Section>

            <Section title="Church Information" subtitle="Role and membership dates">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Church Role">
                  <input value={churchRole} onChange={(e) => setChurchRole(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                </Field>

                <Field label="Date Joined">
                  <input type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Note">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700" rows={3} />
                  </Field>
                </div>
              </div>
            </Section>

            <Section title="Ministry Information" subtitle="Cells, departments and groups">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-500">Cell</label>
                    <button type="button" onClick={() => setAddCellOpen(true)} className="text-xs font-semibold text-blue-700 hover:underline">
                      Add cell
                    </button>
                  </div>
                  <select
                    value={cellId}
                    onChange={(e) => setCellId(e.target.value)}
                    disabled={ministryLoading}
                    className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 disabled:opacity-50"
                  >
                    <option value="">Select cell</option>
                    {cells.map((c) => (
                      <option key={c?._id} value={c?._id}>
                        {c?.name || "-"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-500">Departments</label>
                    <button type="button" onClick={() => setAddDepartmentOpen(true)} className="text-xs font-semibold text-blue-700 hover:underline">
                      Add department
                    </button>
                  </div>
                  <select
                    value={departmentSelectId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setDepartmentSelectId(nextId);
                      if (!nextId) return;
                      setDepartmentIds((prev) => (prev.includes(nextId) ? prev : [...prev, nextId]));
                      setDepartmentSelectId("");
                    }}
                    disabled={ministryLoading}
                    className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 disabled:opacity-50"
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d?._id} value={d?._id}>
                        {d?.name || "-"}
                      </option>
                    ))}
                  </select>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {departmentIds.length ? (
                      departmentIds.map((id) => {
                        const label = departments.find((d) => d?._id === id)?.name || id;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700"
                          >
                            {label}
                            <button
                              type="button"
                              onClick={() => setDepartmentIds((prev) => prev.filter((x) => x !== id))}
                              className="text-gray-500 hover:text-gray-900"
                              aria-label="Remove department"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <div className="text-xs text-gray-500">No department selected</div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-500">Groups</label>
                    <button type="button" onClick={() => setAddGroupOpen(true)} className="text-xs font-semibold text-blue-700 hover:underline">
                      Add group
                    </button>
                  </div>
                  <select
                    value={groupSelectId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setGroupSelectId(nextId);
                      if (!nextId) return;
                      setGroupIds((prev) => (prev.includes(nextId) ? prev : [...prev, nextId]));
                      setGroupSelectId("");
                    }}
                    disabled={ministryLoading}
                    className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 disabled:opacity-50"
                  >
                    <option value="">Select group</option>
                    {groups.map((g) => (
                      <option key={g?._id} value={g?._id}>
                        {g?.name || "-"}
                      </option>
                    ))}
                  </select>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {groupIds.length ? (
                      groupIds.map((id) => {
                        const label = groups.find((g) => g?._id === id)?.name || id;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700"
                          >
                            {label}
                            <button
                              type="button"
                              onClick={() => setGroupIds((prev) => prev.filter((x) => x !== id))}
                              className="text-gray-500 hover:text-gray-900"
                              aria-label="Remove group"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <div className="text-xs text-gray-500">No group selected</div>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={store?.loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {pageMode === "edit" ? "Update" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>

      <SimpleModal
        open={addCellOpen}
        title="Add Cell"
        onClose={() => {
          setAddCellOpen(false);
          setAddCellError(null);
        }}
      >
        {addCellError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addCellError}</div>}
        <Field label="Cell Name">
          <input value={addCellName} onChange={(e) => setAddCellName(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
        </Field>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={() => setAddCellOpen(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={createNewCell} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            Save
          </button>
        </div>
      </SimpleModal>

      <SimpleModal
        open={addDepartmentOpen}
        title="Add Department"
        onClose={() => {
          setAddDepartmentOpen(false);
          setAddDepartmentError(null);
        }}
      >
        {addDepartmentError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addDepartmentError}</div>}
        <Field label="Department Name">
          <input value={addDepartmentName} onChange={(e) => setAddDepartmentName(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
        </Field>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={() => setAddDepartmentOpen(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={createNewDepartment} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            Save
          </button>
        </div>
      </SimpleModal>

      <SimpleModal
        open={addGroupOpen}
        title="Add Group"
        onClose={() => {
          setAddGroupOpen(false);
          setAddGroupError(null);
        }}
      >
        {addGroupError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addGroupError}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Group Name">
            <input value={addGroupName} onChange={(e) => setAddGroupName(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
          </Field>

          <Field label="Meeting Day">
            <input value={addGroupMeetingDay} onChange={(e) => setAddGroupMeetingDay(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" placeholder="e.g. Sunday" />
          </Field>

          <Field label="Meeting Time">
            <input value={addGroupMeetingTime} onChange={(e) => setAddGroupMeetingTime(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" placeholder="e.g. 6:00pm" />
          </Field>

          <Field label="Meeting Venue">
            <input value={addGroupMeetingVenue} onChange={(e) => setAddGroupMeetingVenue(e.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" placeholder="e.g. Church Hall" />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea value={addGroupDescription} onChange={(e) => setAddGroupDescription(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700" rows={3} />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={() => setAddGroupOpen(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={createNewGroup} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            Save
          </button>
        </div>
      </SimpleModal>
    </div>
  );
}

export default function MemberFormPage() {
  return (
    <MemberProvider>
      <MemberFormPageInner />
    </MemberProvider>
  );
}
