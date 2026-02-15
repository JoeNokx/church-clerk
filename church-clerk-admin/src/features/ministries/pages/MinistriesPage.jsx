import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import { getGroups, createGroup, updateGroup, deleteGroup } from "../../group/services/group.api.js";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentKPI
} from "../../department/services/department.api.js";
import { getCells, createCell, updateCell, deleteCell } from "../../cell/services/cell.api.js";

function safeText(value) {
  return typeof value === "string" ? value : "";
}

function normalizeMeetingSchedule(item) {
  const ms = item?.meetingSchedule;
  if (Array.isArray(ms)) return ms;

  const day = safeText(item?.mainMeetingDay).trim();
  const time = safeText(item?.meetingTime).trim();
  const venue = safeText(item?.meetingVenue).trim();
  if (day && time && venue) {
    return [{ meetingDay: day, meetingTime: time, meetingVenue: venue }];
  }
  return [];
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{typeof value === "number" ? value : 0}</div>
    </div>
  );
}

function MinistryTypeIcon({ type }) {
  if (type === "cell") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-orange-600">
        <path d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 11a2 2 0 100-4 2 2 0 000 4Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === "department") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-purple-700">
        <path d="M4 20V8l8-4 8 4v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-700">
      <path d="M8 12a4 4 0 108 0 4 4 0 00-8 0Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Chip({ color = "gray", children }) {
  const styles =
    color === "blue"
      ? "bg-blue-100 text-blue-700"
      : color === "orange"
        ? "bg-orange-100 text-orange-700"
        : color === "purple"
          ? "bg-purple-100 text-purple-700"
          : "bg-gray-100 text-gray-700";

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>{children}</span>;
}

function MinistryCard({ row, type, onView, onEdit, onDelete }) {
  const meetings = normalizeMeetingSchedule(row);
  const firstMeeting = meetings?.[0] || null;

  const typeColor = type === "group" ? "blue" : type === "cell" ? "orange" : "purple";
  const typeLabel = type === "group" ? "Group" : type === "cell" ? "Cell" : "Department";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-200 hover:bg-blue-50/30 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Chip color={typeColor}>{typeLabel}</Chip>
            {row?.status ? <Chip>{row.status}</Chip> : null}
          </div>
          <div className="mt-3 text-base font-semibold text-gray-900 truncate">{row?.name || "—"}</div>
        </div>

        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            type === "group" ? "bg-blue-50" : type === "cell" ? "bg-orange-50" : "bg-purple-50"
          }`}
        >
          <MinistryTypeIcon type={type} />
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{row?.description || "—"}</div>

      {firstMeeting ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-3 text-xs">
            <div className="text-gray-600">
              <span className="font-semibold text-gray-700">Day:</span> {firstMeeting?.meetingDay || "—"}
            </div>
            <div className="text-gray-600">
              <span className="font-semibold text-gray-700">Time:</span> {firstMeeting?.meetingTime || "—"}
            </div>
            <div className="text-gray-600 sm:text-right">
              <span className="font-semibold text-gray-700">Venue:</span> {firstMeeting?.meetingVenue || "—"}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onView}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          View
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-gray-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function MinistryForm({ open, type, mode, initialData, onClose, onSuccess }) {
  const [formError, setFormError] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [meetingSchedule, setMeetingSchedule] = useState([{ meetingDay: "", meetingTime: "", meetingVenue: "" }]);
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  const meetingDays = useMemo(() => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], []);

  useEffect(() => {
    if (!open) return;

    setFormError(null);

    const init = initialData || {};
    setName(safeText(init?.name));
    setDescription(safeText(init?.description));

    const ms = normalizeMeetingSchedule(init);
    if (Array.isArray(ms) && ms.length) {
      setMeetingSchedule(
        ms.map((m) => ({
          meetingDay: safeText(m?.meetingDay),
          meetingTime: safeText(m?.meetingTime),
          meetingVenue: safeText(m?.meetingVenue)
        }))
      );
    } else {
      setMeetingSchedule([{ meetingDay: "", meetingTime: "", meetingVenue: "" }]);
    }

    setStatus(safeText(init?.status) || "active");
  }, [open, initialData]);

  const title = useMemo(() => {
    const entity = type === "group" ? "Group" : type === "cell" ? "Cell" : "Department";
    return mode === "edit" ? `Edit ${entity}` : `Add ${entity}`;
  }, [mode, type]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }

    const invalidMeeting = (Array.isArray(meetingSchedule) ? meetingSchedule : []).find(
      (m) => !String(m?.meetingDay || "").trim() || !String(m?.meetingTime || "").trim() || !String(m?.meetingVenue || "").trim()
    );
    if (invalidMeeting) {
      setFormError("Meeting day, time, and venue are required.");
      return;
    }

    const cleanSchedule = meetingSchedule.map((m) => ({
      meetingDay: String(m.meetingDay || "").trim(),
      meetingTime: String(m.meetingTime || "").trim(),
      meetingVenue: String(m.meetingVenue || "").trim()
    }));

    const payload = {
      name: name.trim(),
      description,
      meetingSchedule: cleanSchedule,
      mainMeetingDay: cleanSchedule?.[0]?.meetingDay,
      meetingTime: cleanSchedule?.[0]?.meetingTime,
      meetingVenue: cleanSchedule?.[0]?.meetingVenue
    };

    if (type === "cell" || type === "department") {
      payload.status = status;
    }

    setSaving(true);
    try {
      if (type === "group") {
        if (mode === "edit") {
          await updateGroup(initialData?._id, payload);
        } else {
          await createGroup(payload);
        }
      }

      if (type === "department") {
        if (mode === "edit") {
          await updateDepartment(initialData?._id, payload);
        } else {
          await createDepartment(payload);
        }
      }

      if (type === "cell") {
        if (mode === "edit") {
          await updateCell(initialData?._id, payload);
        } else {
          await createCell(payload);
        }
      }

      onSuccess?.();
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
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

        <form onSubmit={submit} className="p-5">
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="e.g. Youth Ministry"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-gray-500">Meeting Schedule</div>
                <button
                  type="button"
                  onClick={() =>
                    setMeetingSchedule((prev) => [...(Array.isArray(prev) ? prev : []), { meetingDay: "", meetingTime: "", meetingVenue: "" }])
                  }
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  Add another meeting
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {(Array.isArray(meetingSchedule) ? meetingSchedule : []).map((m, idx) => (
                  <div key={`meeting-${idx}`} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Day</label>
                      <select
                        value={m?.meetingDay || ""}
                        onChange={(e) =>
                          setMeetingSchedule((prev) => prev.map((row, i) => (i === idx ? { ...row, meetingDay: e.target.value } : row)))
                        }
                        className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                      >
                        <option value="">Select day</option>
                        {meetingDays.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Time</label>
                      <input
                        value={m?.meetingTime || ""}
                        onChange={(e) =>
                          setMeetingSchedule((prev) => prev.map((row, i) => (i === idx ? { ...row, meetingTime: e.target.value } : row)))
                        }
                        type="time"
                        className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Venue</label>
                      <input
                        value={m?.meetingVenue || ""}
                        onChange={(e) =>
                          setMeetingSchedule((prev) => prev.map((row, i) => (i === idx ? { ...row, meetingVenue: e.target.value } : row)))
                        }
                        className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                        placeholder="Venue"
                      />
                    </div>

                    {meetingSchedule.length > 1 ? (
                      <div className="sm:col-span-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setMeetingSchedule((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Remove meeting
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {type === "cell" || type === "department" ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {mode === "edit" ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
        </div>
        <div className="px-5 py-4 text-sm text-gray-700">{message}</div>
        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function MinistriesPage() {
  const { toPage } = useDashboardNavigator();

  const [activeTab, setActiveTab] = useState("groups");
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpi, setKpi] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [cells, setCells] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formType, setFormType] = useState("group");
  const [editingRow, setEditingRow] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);

  const activeRows = useMemo(() => {
    if (activeTab === "departments") return departments;
    if (activeTab === "cells") return cells;
    return groups;
  }, [activeTab, departments, cells, groups]);

  const filteredRows = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return activeRows;
    return activeRows.filter((r) => {
      const name2 = safeText(r?.name).toLowerCase();
      const desc = safeText(r?.description).toLowerCase();
      return name2.includes(q) || desc.includes(q);
    });
  }, [activeRows, search]);

  const badges = useMemo(
    () => ({
      groups: Array.isArray(groups) ? groups.length : 0,
      departments: Array.isArray(departments) ? departments.length : 0,
      cells: Array.isArray(cells) ? cells.length : 0
    }),
    [groups, departments, cells]
  );

  const loadKpi = useCallback(async () => {
    setKpiLoading(true);
    try {
      const res = await getDepartmentKPI();
      const payload = res?.data?.data ?? res?.data;
      const summary = payload?.summary || payload;
      setKpi(summary || null);
    } catch {
      setKpi(null);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const loadLists = useCallback(async (tab) => {
    setLoading(true);
    setError("");

    try {
      if (tab === "groups") {
        const res = await getGroups();
        const payload = res?.data?.data ?? res?.data;
        const list = payload?.groups || payload?.data?.groups || [];
        setGroups(Array.isArray(list) ? list : []);
      }

      if (tab === "departments") {
        const res = await getDepartments();
        const payload = res?.data?.data ?? res?.data;
        const list = payload?.departments || payload?.data?.departments || [];
        setDepartments(Array.isArray(list) ? list : []);
      }

      if (tab === "cells") {
        const res = await getCells();
        const payload = res?.data?.data ?? res?.data;
        const list = payload?.cells || payload?.data?.cells || [];
        setCells(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      const status2 = e?.response?.status;
      if (status2 === 404) {
        if (tab === "groups") setGroups([]);
        if (tab === "departments") setDepartments([]);
        if (tab === "cells") setCells([]);
      } else {
        setError(e?.response?.data?.message || e?.message || "Failed to load ministries");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKpi();
  }, [loadKpi]);

  useEffect(() => {
    loadLists(activeTab);
  }, [activeTab, loadLists]);

  const tabClass = useCallback(
    (value) => {
      const isActive = activeTab === value;
      return `px-4 py-1.5 text-sm font-semibold rounded-md inline-flex items-center gap-2 ${
        isActive ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
      }`;
    },
    [activeTab]
  );

  const openCreate = () => {
    const type = activeTab === "groups" ? "group" : activeTab === "cells" ? "cell" : "department";
    setFormType(type);
    setFormMode("create");
    setEditingRow(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    if (!row?._id) return;
    const type = activeTab === "groups" ? "group" : activeTab === "cells" ? "cell" : "department";
    setFormType(type);
    setFormMode("edit");
    setEditingRow(row);
    setFormOpen(true);
  };

  const openDelete = (row) => {
    if (!row?._id) return;
    setConfirmRow(row);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const row = confirmRow;
    setConfirmOpen(false);
    setConfirmRow(null);
    if (!row?._id) return;

    try {
      if (activeTab === "groups") {
        await deleteGroup(row._id);
        await loadLists("groups");
      }

      if (activeTab === "departments") {
        await deleteDepartment(row._id);
        await loadLists("departments");
      }

      if (activeTab === "cells") {
        await deleteCell(row._id);
        await loadLists("cells");
      }

      await loadKpi();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Delete failed");
    }
  };

  const title = activeTab === "groups" ? "Groups" : activeTab === "cells" ? "Cells" : "Departments";

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Ministries</h2>
          <p className="mt-2 text-sm text-gray-600">Manage groups, departments and cells in your church</p>

          <div className="mt-4 inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button type="button" onClick={() => setActiveTab("groups")} className={tabClass("groups")}>
              Groups
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                {badges.groups}
              </span>
            </button>
            <button type="button" onClick={() => setActiveTab("departments")} className={`ml-1 ${tabClass("departments")}`}>
              Departments
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-semibold text-white">
                {badges.departments}
              </span>
            </button>
            <button type="button" onClick={() => setActiveTab("cells")} className={`ml-1 ${tabClass("cells")}`}>
              Cells
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-600 px-1.5 text-xs font-semibold text-white">
                {badges.cells}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <span className="text-lg leading-none">+</span>
            Add {activeTab === "groups" ? "Group" : activeTab === "cells" ? "Cell" : "Department"}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpiLoading ? (
            <div className="text-sm text-gray-600 sm:col-span-2 lg:col-span-4">Loading KPI...</div>
          ) : (
            <>
              <KpiCard label="Total Groups" value={Number(kpi?.totalGroups || 0)} />
              <KpiCard label="Total Departments" value={Number(kpi?.totalDepartments || 0)} />
              <KpiCard label="Total Cells" value={Number(kpi?.totalCells || 0)} />
              <KpiCard label="Total Ministries" value={Number(kpi?.totalMinistry || 0)} />
            </>
          )}
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">{title} Records</div>
            <div className="text-xs text-gray-500">All {title.toLowerCase()} and their details</div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-10 w-full sm:w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-gray-600">Loading...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">No record found.</div>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRows.map((row, index) => {
                const ministryType = activeTab === "groups" ? "group" : activeTab === "cells" ? "cell" : "department";
                return (
                  <MinistryCard
                    key={row?._id ?? `row-${index}`}
                    row={row}
                    type={ministryType}
                    onView={() => {
                      if (!row?._id) return;
                      toPage("ministry-details", { type: ministryType, id: row._id });
                    }}
                    onEdit={() => openEdit(row)}
                    onDelete={() => openDelete(row)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <MinistryForm
        open={formOpen}
        type={formType}
        mode={formMode}
        initialData={editingRow}
        onClose={() => {
          setFormOpen(false);
          setEditingRow(null);
        }}
        onSuccess={async () => {
          setFormOpen(false);
          setEditingRow(null);
          await loadLists(activeTab);
          await loadKpi();
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Record"
        message="Are you sure you want to delete this record?"
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmRow(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default MinistriesPage;
