import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import TitheContext, { TitheProvider } from "../tithe.store.js";
import TitheIndividualTable from "../components/TitheIndividualTable.jsx";
import TitheAggregateTable from "../components/TitheAggregateTable.jsx";
import TitheIndividualForm from "../components/TitheIndividualForm.jsx";
import TitheAggregateForm from "../components/TitheAggregateForm.jsx";

function formatCurrency(value) {
  return `GHS ${Number(value || 0).toLocaleString()}`;
}

function monthLabel(date = new Date()) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function yearLabel(date = new Date()) {
  return `${date.getFullYear()} YTD`;
}

function toISODate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function dateRangeFromPreset(preset) {
  const now = new Date();
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { dateFrom: toISODate(start), dateTo: toISODate(end) };
  }
  if (preset === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { dateFrom: toISODate(start), dateTo: toISODate(end) };
  }
  return { dateFrom: "", dateTo: "" };
}

function DateRangePopover({ valueFrom, valueTo, onApply, onClear }) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(valueFrom || "");
  const [draftTo, setDraftTo] = useState(valueTo || "");

  useEffect(() => {
    if (!open) return;
    setDraftFrom(valueFrom || "");
    setDraftTo(valueTo || "");
  }, [open, valueFrom, valueTo]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <span className="inline-flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Date
        </span>
        <span className="text-xs text-gray-500">
          {valueFrom || valueTo ? "Filtered" : "All"}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">Filter by date range</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500">From</label>
                <input
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  type="date"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500">To</label>
                <input
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  type="date"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onClear?.();
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onApply?.({ dateFrom: draftFrom, dateTo: draftTo });
                }}
                className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-800"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PillIcon({ color = "blue", children }) {
  const cls =
    color === "green"
      ? "bg-green-100 text-green-700"
      : color === "purple"
        ? "bg-purple-100 text-purple-700"
        : "bg-blue-100 text-blue-700";
  return <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cls}`}>{children}</div>;
}

function ModeBanner({ mode, onChangeMode }) {
  const isAggregate = mode === "aggregate";
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-blue-700">
            {isAggregate ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div className="text-sm font-semibold text-gray-900">
            Tithe Mode: {isAggregate ? "Aggregate Recording" : "Individual Recording"}
          </div>
        </div>

        <button type="button" onClick={onChangeMode} className="text-sm font-semibold text-blue-700 hover:underline">
          Change Mode
        </button>
      </div>
    </div>
  );
}

function SimpleModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-gray-500">{subtitle}</div> : null}
          </div>
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
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ open, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10.3 4.6 3.5 17.4A2 2 0 0 0 5.3 20h13.4a2 2 0 0 0 1.8-2.6L13.7 4.6a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-gray-900">Switch Tithe Recording Mode</div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 text-sm text-gray-600">
          <div>Changing your tithe recording mode will affect how new tithe records are entered.</div>
          <div className="mt-3 font-semibold text-gray-700">Your previous records will remain safe.</div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-lg bg-red-600 px-8 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            Switch Mode
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeSelectCard({ kind, onSelect, disabled = false }) {
  const isAggregate = kind === "aggregate";
  return (
    <div className={`rounded-2xl border bg-white p-8 shadow-sm ${isAggregate ? "border-green-200" : "border-gray-200"}`}>
      <div className="flex flex-col items-center text-center">
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${isAggregate ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
          {isAggregate ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
              <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
              <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <div className="mt-5 text-xl font-semibold text-blue-900">{isAggregate ? "Aggregate" : "Individual"} Recording</div>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          {isAggregate ? (
            <>
              <div>Record only the total collected</div>
              <div>No individual names</div>
              <div>Works for bulk collection</div>
            </>
          ) : (
            <>
              <div>Record by member name</div>
              <div>Track individual tithe patterns</div>
              <div>Works for named tithe entries</div>
            </>
          )}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect?.(kind)}
          className={`mt-7 h-12 w-full rounded-xl px-6 text-sm font-semibold text-white shadow-sm disabled:opacity-60 ${
            isAggregate ? "bg-green-700 hover:bg-green-800" : "bg-blue-700 hover:bg-blue-800"
          }`}
        >
          Use {isAggregate ? "Aggregate" : "Individual"} Mode
        </button>
      </div>
    </div>
  );
}

function ModeSwitchCards({ currentMode, onPick }) {
  const cardClass = (active) =>
    `rounded-2xl border p-6 transition ${active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`;

  const isCurrentIndividual = currentMode !== "aggregate";

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => {
          if (!isCurrentIndividual) onPick?.("individual");
        }}
        className={cardClass(isCurrentIndividual)}
      >
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="mt-4 text-base font-semibold text-blue-900">Individual Recording</div>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <div>Record by member name</div>
            <div>Track individual patterns</div>
            <div>Named tithe entries</div>
          </div>
          {isCurrentIndividual ? (
            <div className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-blue-700 px-5 text-xs font-semibold text-white">
              Current Mode
            </div>
          ) : null}
        </div>
      </button>

      <button
        type="button"
        onClick={() => {
          if (isCurrentIndividual) onPick?.("aggregate");
        }}
        className={cardClass(!isCurrentIndividual)}
      >
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="mt-4 text-base font-semibold text-blue-900">Aggregate Recording</div>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <div>Record total collected</div>
            <div>No individual names</div>
            <div>Bulk collection</div>
          </div>
          {!isCurrentIndividual ? (
            <div className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-blue-700 px-5 text-xs font-semibold text-white">
              Current Mode
            </div>
          ) : null}
        </div>
      </button>
    </div>
  );
}

function TithePageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(TitheContext);

  const [kpi, setKpi] = useState(null);
  const [view, setView] = useState("landing"); // landing | individual | aggregate

  const [isIndividualFormOpen, setIsIndividualFormOpen] = useState(false);
  const [isAggregateFormOpen, setIsAggregateFormOpen] = useState(false);
  const [editingIndividual, setEditingIndividual] = useState(null);
  const [editingAggregate, setEditingAggregate] = useState(null);

  const [changeModeOpen, setChangeModeOpen] = useState(false);
  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  const [searchValue, setSearchValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const mode = view === "aggregate" ? "aggregate" : "individual";

  const canCreate = useMemo(() => (typeof can === "function" ? can("tithe", "create") : false), [can]);
  const canUpdateMode = useMemo(() => (typeof can === "function" ? can("tithe", "update") : false), [can]);

  const refreshKpi = useCallback(async () => {
    if (!store?.activeChurchId) return;
    if (view === "landing") return;

    try {
      const res = mode === "aggregate" ? await store?.getAggregateKPI?.() : await store?.getIndividualKPI?.();
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      setKpi(data || null);
    } catch {
      setKpi(null);
    }
  }, [store?.activeChurchId, mode, store?.getAggregateKPI, store?.getIndividualKPI, view]);

  useEffect(() => {
    if (!store?.activeChurchId) return;
    if (view === "landing") return;
    if (mode === "aggregate") store?.fetchAggregates?.();
    else store?.fetchIndividuals?.();
  }, [store?.activeChurchId, mode, view]);

  useEffect(() => {
    refreshKpi();
  }, [refreshKpi]);

  useEffect(() => {
    if (view === "landing") return;
    setSearchValue("");
    setDateFrom("");
    setDateTo("");
  }, [view]);

  const openCreateIndividual = () => {
    setEditingIndividual(null);
    setIsIndividualFormOpen(true);
  };

  const openEditIndividual = (row) => {
    setEditingIndividual(row || null);
    setIsIndividualFormOpen(true);
  };

  const closeIndividualForm = () => {
    setIsIndividualFormOpen(false);
    setEditingIndividual(null);
  };

  const openCreateAggregate = () => {
    setEditingAggregate(null);
    setIsAggregateFormOpen(true);
  };

  const openEditAggregate = (row) => {
    setEditingAggregate(row || null);
    setIsAggregateFormOpen(true);
  };

  const closeAggregateForm = () => {
    setIsAggregateFormOpen(false);
    setEditingAggregate(null);
  };

  const applyFilters = useCallback(
    async (next) => {
      if (view === "landing") return;
      if (mode === "aggregate") await store?.fetchAggregates?.(next);
      else await store?.fetchIndividuals?.(next);
    },
    [mode, store, view]
  );

  const onSearchChange = async (value) => {
    setSearchValue(value);
    if (mode === "aggregate") await applyFilters({ search: value, page: 1 });
    else await applyFilters({ search: value, page: 1 });
  };

  const applyDateRange = async (range) => {
    const nextFrom = range?.dateFrom || "";
    const nextTo = range?.dateTo || "";
    setDateFrom(nextFrom);
    setDateTo(nextTo);
    await applyFilters({ dateFrom: nextFrom, dateTo: nextTo, page: 1 });
  };

  const clearDateRange = async () => {
    setDateFrom("");
    setDateTo("");
    await applyFilters({ dateFrom: "", dateTo: "", page: 1 });
  };

  const openChangeMode = () => {
    if (!canUpdateMode) return;
    setPendingMode(null);
    setConfirmSwitchOpen(false);
    setChangeModeOpen(true);
  };

  const closeChangeMode = () => {
    setChangeModeOpen(false);
    setPendingMode(null);
    setConfirmSwitchOpen(false);
  };

  const pickModeToSwitch = (nextMode) => {
    if (!nextMode) return;
    if (nextMode === mode) return;
    setPendingMode(nextMode);
    setConfirmSwitchOpen(true);
  };

  const confirmSwitch = async () => {
    const next = pendingMode;
    if (!next) return;
    await store?.setRecordingMode?.(next);
    setView(next);
    closeChangeMode();
  };

  const kpiThisMonth = kpi?.thisMonth || 0;
  const kpiThisYear = kpi?.thisYear || 0;

  const thirdLabel = mode === "aggregate" ? "Total Records" : "Members Paid";
  const thirdValue = mode === "aggregate" ? Number(kpi?.thisMonthRecords || 0) : Number(kpi?.membersPaidThisMonth || 0);

  return (
    <div className="max-w-6xl">
      {view === "landing" ? (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
                  <path
                    d="M7 7h12v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path d="M7 9H5a2 2 0 0 0 0 4h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M10 6a2 2 0 0 1 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="mt-5 text-3xl font-semibold text-blue-900">Tithes</div>
              <div className="mt-2 text-sm text-gray-600">Choose how you want to record tithes. You can change this later.</div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
              <ModeSelectCard
                kind="individual"
                disabled={!canUpdateMode || store?.loading}
                onSelect={async () => {
                  await store?.setRecordingMode?.("individual");
                  setView("individual");
                }}
              />
              <ModeSelectCard
                kind="aggregate"
                disabled={!canUpdateMode || store?.loading}
                onSelect={async () => {
                  await store?.setRecordingMode?.("aggregate");
                  setView("aggregate");
                }}
              />
            </div>

            <div className="mt-10 text-center text-xs text-gray-500">
              You can switch your tithe recording mode anytime from the settings.
            </div>
          </div>
        </div>
      ) : (
        <>
          <ModeBanner mode={mode} onChangeMode={openChangeMode} />

          <div className="mt-8 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Tithes</h2>
              <p className="mt-2 text-sm text-gray-600">
                {mode === "aggregate" ? "Track and manage aggregate tithe collections" : "Track and manage individual member tithes"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {canCreate && mode === "individual" ? (
                <button
                  type="button"
                  onClick={openCreateIndividual}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  <span className="text-lg leading-none">+</span>
                  Record Tithe
                </button>
              ) : null}

              {canCreate && mode === "aggregate" ? (
                <button
                  type="button"
                  onClick={openCreateAggregate}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  <span className="text-lg leading-none">+</span>
                  Record Tithe
                </button>
              ) : null}
            </div>
          </div>

          {kpi ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">This Month</div>
                    <div className="mt-2 text-2xl font-semibold text-blue-900">{formatCurrency(kpiThisMonth)}</div>
                    <div className="mt-1 text-xs text-gray-500">{monthLabel()}</div>
                  </div>
                  <PillIcon color="blue">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M8 3v3M16 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </PillIcon>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">This Year</div>
                    <div className="mt-2 text-2xl font-semibold text-green-700">{formatCurrency(kpiThisYear)}</div>
                    <div className="mt-1 text-xs text-gray-500">{yearLabel()}</div>
                  </div>
                  <PillIcon color="green">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M5 15l5-5 4 4 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </PillIcon>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">{thirdLabel}</div>
                    <div className="mt-2 text-2xl font-semibold text-purple-700">{Number(thirdValue || 0).toLocaleString()}</div>
                    <div className="mt-1 text-xs text-gray-500">This month</div>
                  </div>
                  <PillIcon color="purple">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </PillIcon>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Filter by Date</div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={mode === "aggregate" ? "Search recorded by..." : "Search by name..."}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
              <DateRangePopover valueFrom={dateFrom} valueTo={dateTo} onApply={applyDateRange} onClear={clearDateRange} />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-5">
              <div className="text-sm font-semibold text-gray-900">Tithe Records</div>
              <div className="text-xs text-gray-500">{mode === "aggregate" ? "All aggregate tithe collections" : "All individual tithe payments"}</div>
            </div>

            {mode === "aggregate" ? (
              <TitheAggregateTable onEdit={openEditAggregate} onDeleted={refreshKpi} />
            ) : (
              <TitheIndividualTable onEdit={openEditIndividual} onDeleted={refreshKpi} />
            )}
          </div>
        </>
      )}

      <SimpleModal
        open={changeModeOpen}
        title="Change Tithe Recording Mode"
        subtitle="Select how you want to record tithes going forward"
        onClose={closeChangeMode}
      >
        <ModeSwitchCards currentMode={mode} onPick={pickModeToSwitch} />
      </SimpleModal>

      <ConfirmModal
        open={confirmSwitchOpen}
        onCancel={() => {
          setConfirmSwitchOpen(false);
          setPendingMode(null);
        }}
        onConfirm={confirmSwitch}
      />

      <TitheIndividualForm
        open={isIndividualFormOpen}
        mode={editingIndividual ? "edit" : "create"}
        initialData={editingIndividual}
        onClose={closeIndividualForm}
        onSuccess={() => {
          closeIndividualForm();
          refreshKpi();
        }}
      />

      <TitheAggregateForm
        open={isAggregateFormOpen}
        mode={editingAggregate ? "edit" : "create"}
        initialData={editingAggregate}
        onClose={closeAggregateForm}
        onSuccess={() => {
          closeAggregateForm();
          refreshKpi();
        }}
      />
    </div>
  );
}

function TithePage() {
  return (
    <TitheProvider>
      <TithePageInner />
    </TitheProvider>
  );
}

export default TithePage;
