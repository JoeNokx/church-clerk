import { useEffect, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import { useContext } from "react";
import Skeleton from "react-loading-skeleton";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import {
  createBusinessVenture,
  deleteBusinessVenture,
  getBusinessKPI,
  getBusinessVentures,
  updateBusinessVenture
} from "../services/businessVentures.api.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";

function BaseModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4 md:py-5 lg:py-6 px-4 md:px-6">
          <div>
            <div className="font-semibold text-gray-900 text-lg">{title}</div>
            {subtitle ? <div className="mt-1 text-gray-500 text-sm">{subtitle}</div> : null}
          </div>
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
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ open, title, message, confirmLabel, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{title}</div>
        </div>
        <div className="px-4 md:px-5 lg:px-6 py-4 text-gray-700 text-sm">{message}</div>
        <div className="flex items-center justify-end gap-3 px-4 md:px-5 lg:px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-red-700 text-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBusinessModal({ open, onClose, onSuccess }) {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [manager, setManager] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusinessName("");
    setDescription("");
    setManager("");
    setPhoneNumber("");
    setStartDate("");
    setError("");
    setSaving(false);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!String(businessName || "").trim()) {
      setError("Business name is required.");
      return;
    }

    if (!String(description || "").trim()) {
      setError("Description is required.");
      return;
    }

    if (String(phoneNumber || "").trim() && !isValidPhoneNumber(phoneNumber)) {
      setError("Invalid phone number");
      return;
    }

    setSaving(true);
    try {
      await createBusinessVenture({
        businessName: String(businessName).trim(),
        description: String(description).trim(),
        manager: String(manager || "").trim(),
        phoneNumber: String(phoneNumber || "").trim(),
        ...(startDate ? { startDate } : {})
      });
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal open={open} title="Add Business Venture" subtitle="Create a new venture" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Business Name</label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            placeholder="e.g., Bookshop"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
            placeholder="What does this venture do?"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Manager</label>
            <input
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
            <div className="mt-2">
              <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} error={Boolean(error)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Start Date</label>
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
          >
            Add
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function EditBusinessModal({ open, initialData, onClose, onSuccess }) {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [manager, setManager] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusinessName(String(initialData?.businessName || ""));
    setDescription(String(initialData?.description || ""));
    setManager(String(initialData?.manager || ""));
    setPhoneNumber(String(initialData?.phoneNumber || ""));
    setError("");
    setSaving(false);
  }, [open, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const id = initialData?._id;
    if (!id) return;

    if (!String(businessName || "").trim()) {
      setError("Business name is required.");
      return;
    }

    if (!String(description || "").trim()) {
      setError("Description is required.");
      return;
    }

    setSaving(true);
    try {
      await updateBusinessVenture(id, {
        businessName: String(businessName).trim(),
        description: String(description).trim(),
        manager: String(manager || "").trim(),
        phoneNumber: String(phoneNumber || "").trim()
      });
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal open={open} title="Edit Business Venture" subtitle="Update venture details" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Business Name</label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Manager</label>
            <input
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
            <div className="mt-2">
              <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} error={Boolean(error)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
          >
            Save
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function safeListPayload(res) {
  const payload = res?.data?.data ?? res?.data;
  const data = payload?.data ?? payload;
  const rows = data?.businessVentures ?? payload?.businessVentures;
  return Array.isArray(rows) ? rows : [];
}

function safeKpiPayload(res) {
  const payload = res?.data?.data ?? res?.data;
  const data = payload?.data ?? payload;
  return data?.businessKPI ?? payload?.businessKPI ?? null;
}

function BusinessVenturesPage() {
  const { toPage } = useDashboardNavigator();

  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;
  const currency = String(activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const canEdit = activeChurch?._id ? activeChurch?.canEdit !== false : true;

  const { can } = useContext(PermissionContext) || {};
  const canView = useMemo(() => (typeof can === "function" ? can("businessVentures", "view") : false), [can]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ventures, setVentures] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [searchValue, setSearchValue] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");

    const [venturesRes, kpiRes] = await Promise.allSettled([
      getBusinessVentures({ page: 1, limit: 50 }),
      getBusinessKPI()
    ]);

    if (venturesRes.status === "fulfilled") {
      setVentures(safeListPayload(venturesRes.value));
    } else {
      setVentures([]);
    }

    if (kpiRes.status === "fulfilled") {
      setKpi(safeKpiPayload(kpiRes.value));
    } else {
      setKpi(null);
    }

    if (venturesRes.status !== "fulfilled") {
      setError(venturesRes.reason?.response?.data?.message || venturesRes.reason?.message || "Failed to load business ventures");
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const rows = Array.isArray(ventures) ? ventures : [];
    const totalVentures = rows.length;

    const totalIncome = Number(kpi?.totalIncome ?? 0);
    const totalExpenses = Number(kpi?.totalExpenses ?? 0);
    const net = Number(kpi?.net ?? (totalIncome - totalExpenses));

    return { totalVentures, totalIncome, totalExpenses, net };
  }, [ventures, kpi]);

  const filteredVentures = useMemo(() => {
    if (!searchValue.trim()) return ventures;
    const searchLower = searchValue.toLowerCase();
    return ventures.filter((v) =>
      String(v?.businessName || "").toLowerCase().includes(searchLower)
    );
  }, [ventures, searchValue]);

  const viewDetails = (row) => {
    if (!row?._id) return;
    toPage("business-venture-details", { id: row._id });
  };

  const viewIncome = (row) => {
    if (!row?._id) return;
    toPage("business-venture-details", { id: row._id, tab: "incomes" });
  };

  const viewExpenses = (row) => {
    if (!row?._id) return;
    toPage("business-venture-details", { id: row._id, tab: "expenses" });
  };

  const openEdit = (row) => {
    setEditRow(row || null);
    setEditOpen(true);
  };

  const openDelete = (row) => {
    setConfirmDeleteRow(row || null);
    setConfirmDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDeleteRow?._id) return;
    try {
      await deleteBusinessVenture(confirmDeleteRow._id);
      setConfirmDeleteOpen(false);
      setConfirmDeleteRow(null);
      load();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Business Ventures</div>
          <div className="mt-2 text-gray-600 text-sm">Track venture income and expenses</div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 md:px-5 lg:px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              Add Venture
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="font-semibold text-gray-500 text-xs">Total Ventures</div>
          <div className="mt-3 font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">{totals.totalVentures}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="font-semibold text-gray-500 text-xs">Total Income</div>
          <div className="mt-3 font-semibold text-green-700 md:text-3xl lg:text-4xl text-xl md:text-2xl">{formatMoney(totals.totalIncome, currency)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="font-semibold text-gray-500 text-xs">Total Expenses</div>
          <div className="mt-3 font-semibold text-orange-600 md:text-3xl lg:text-4xl text-xl md:text-2xl">{formatMoney(totals.totalExpenses, currency)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="font-semibold text-gray-500 text-xs">Net</div>
          <div className="mt-3 font-semibold text-blue-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">{formatMoney(totals.net, currency)}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold text-gray-900 text-sm">Business Ventures</div>
          <div className="text-gray-500 text-xs">All ventures and financials</div>
        </div>
        <input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-56 text-sm"
          placeholder="Search business name"
        />
      </div>

      {loading ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <Skeleton height={14} count={4} />
        </div>
      ) : filteredVentures.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 text-sm">
          {searchValue ? "No business ventures matching your search." : "No business ventures found. Click Add Venture to get started."}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredVentures.map((v, idx) => (
            <div key={v?._id ?? `v-${idx}`} className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate text-sm">{v?.businessName || "—"}</div>
                  {v?.description ? <div className="mt-0.5 text-gray-500 text-xs truncate">{v.description}</div> : null}
                </div>
              </div>

              {(v?.manager || v?.phoneNumber) ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  {v?.manager ? <span>Manager: <span className="font-medium text-gray-700">{v.manager}</span></span> : null}
                  {v?.phoneNumber ? <span>{v.phoneNumber}</span> : null}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Income</div>
                  <div className="mt-1 font-semibold text-green-700 text-sm">{formatMoney(v?.totalIncome, currency)}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Expenses</div>
                  <div className="mt-1 font-semibold text-orange-600 text-sm">{formatMoney(v?.totalExpenses, currency)}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Net</div>
                  <div className="mt-1 font-semibold text-blue-900 text-sm">{formatMoney(v?.net, currency)}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 flex-wrap">
                {canView ? (
                  <>
                    <button type="button" onClick={() => viewIncome(v)} className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-green-700 shadow-sm hover:bg-gray-50 text-xs">Income</button>
                    <button type="button" onClick={() => viewExpenses(v)} className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-orange-600 shadow-sm hover:bg-gray-50 text-xs">Expenses</button>
                    <button type="button" onClick={() => viewDetails(v)} className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-xs">View</button>
                  </>
                ) : null}
                {canEdit ? (
                  <>
                    <button type="button" onClick={() => openEdit(v)} className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-xs">Edit</button>
                    <button type="button" onClick={() => openDelete(v)} className="whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold text-red-600 shadow-sm hover:bg-red-50 text-xs">Delete</button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddBusinessModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          load();
        }}
      />

      <EditBusinessModal
        open={editOpen}
        initialData={editRow}
        onClose={() => {
          setEditOpen(false);
          setEditRow(null);
        }}
        onSuccess={() => {
          setEditOpen(false);
          setEditRow(null);
          load();
        }}
      />

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title="Delete Venture"
        message={`Are you sure you want to delete "${confirmDeleteRow?.businessName || "this venture"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setConfirmDeleteRow(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default BusinessVenturesPage;
