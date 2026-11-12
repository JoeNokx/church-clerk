import { useContext, useEffect, useMemo, useState } from "react";
import ChurchContext from "../../church/church.store.js";
import PermissionContext from "../../permissions/permission.store.js";
import Button from "../../../shared/components/Button/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import {
  getOpeningBalances,
  createOpeningBalance,
  updateOpeningBalance
} from "../services/financialStatement.api.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

const INPUT_CLS =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";

// Same input styling without w-full — for fields sized by flex/width classes.
const INPUT_CLS_FLEX =
  "h-11 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";

const ACCOUNT_TYPES = ["Cash", "Bank", "Mobile Money", "Other"];

// Money-in modules — where the opening funds came from.
const SOURCE_OPTIONS = [
  "Offerings",
  "Tithes",
  "Special Funds",
  "Welfare",
  "Programs",
  "Business Ventures",
  "Fundraising",
  "Others"
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const emptyForm = () => ({
  accountName: "",
  accountType: "Cash",
  balanceAsOf: "",
  amount: "",
  note: "",
  hasBreakdown: false,
  breakdown: [{ source: "", amount: "" }],
  confirmed: false
});

export default function OpeningBalanceContent({ formOpen, setFormOpen }) {
  const { can } = useContext(PermissionContext) || {};
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const money = useMemo(() => (v) => formatMoney(v || 0, currency), [currency]);

  const guarded = useGuardedAction();
  const canUpdate = useMemo(
    () => (typeof can === "function" ? can("offerings", "update") : false),
    [can]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getOpeningBalances();
      setAccounts(res?.data?.accounts ?? res?.data?.data?.accounts ?? []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load opening balance accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Reset the modal state when the tab unmounts.
  useEffect(() => () => setFormOpen?.(false), [setFormOpen]);

  const breakdownTotal = useMemo(
    () => form.breakdown.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
    [form.breakdown]
  );

  const setBreakdownRow = (i, patch) =>
    setForm((f) => ({
      ...f,
      breakdown: f.breakdown.map((b, idx) => (idx === i ? { ...b, ...patch } : b))
    }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError("");
    setFormOpen?.(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setError("");
    setForm({
      accountName: row.accountName || "",
      accountType: row.accountType || "Cash",
      balanceAsOf: row.balanceAsOf ? String(row.balanceAsOf).slice(0, 10) : "",
      amount: row.amount ?? "",
      note: row.note || "",
      hasBreakdown: Array.isArray(row.breakdown) && row.breakdown.length > 0,
      breakdown:
        Array.isArray(row.breakdown) && row.breakdown.length
          ? row.breakdown.map((b) => ({ source: b.source || "", amount: b.amount ?? "" }))
          : [{ source: "", amount: "" }],
      confirmed: false
    });
    setFormOpen?.(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!canUpdate) { guarded(undefined, "offerings", "update"); return; }
    setError("");

    if (!form.accountName.trim()) return setError("Account name is required.");
    if (!form.balanceAsOf) return setError("Please choose the balance as of date.");
    if (!(Number(form.amount) >= 0) || form.amount === "") return setError("Please enter the account balance.");
    const rows = form.hasBreakdown
      ? form.breakdown.filter((b) => b.source && Number(b.amount) > 0)
      : [];
    if (form.hasBreakdown && !rows.length)
      return setError("Add at least one breakdown source with an amount, or uncheck breakdown.");
    if (breakdownTotal > Number(form.amount))
      return setError("Breakdown amounts cannot exceed the account balance.");
    if (!form.confirmed) return setError("Please confirm the details are true before saving.");

    const payload = {
      accountName: form.accountName.trim(),
      accountType: form.accountType,
      balanceAsOf: form.balanceAsOf,
      amount: Number(form.amount),
      breakdown: rows,
      note: form.note,
      confirmed: true
    };

    setSaving(true);
    try {
      if (editing?._id) {
        await updateOpeningBalance(editing._id, payload);
      } else {
        await createOpeningBalance(payload);
      }
      setFormOpen?.(false);
      setEditing(null);
      setForm(emptyForm());
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const grandTotal = accounts.reduce((s, a) => s + (Number(a.amount) || 0), 0);

  const totalPages = Math.max(1, Math.ceil(accounts.length / limit));
  const currentPage = Math.min(page, totalPages);
  const paged = accounts.slice((currentPage - 1) * limit, currentPage * limit);
  const pagination = {
    totalResult: accounts.length,
    totalPages,
    currentPage,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
    nextPage: currentPage < totalPages ? currentPage + 1 : null
  };

  if (loading) {
    return (
      <div className="mt-2 rounded-xl border border-gray-200 bg-white p-6 animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-gray-200" />
        <div className="h-3 w-64 rounded bg-gray-200" />
        {[0, 1, 2].map((i) => <div key={i} className="h-11 rounded-lg bg-gray-200" />)}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 md:px-6 py-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Opening Balance</div>
            <div className="mt-1 text-gray-500 text-xs">
              The money your church already had before you started recording it here.
            </div>
          </div>
          {accounts.length ? (
            <div className="text-right">
              <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Total across {accounts.length} account{accounts.length === 1 ? "" : "s"}:
              </span>
              <span className="ml-2 font-bold text-blue-700 text-sm">{money(grandTotal)}</span>
            </div>
          ) : null}
        </div>

        {error && !formOpen ? (
          <div className="mx-4 md:mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        ) : null}

        {!accounts.length ? (
          <div className="p-4 md:p-6">
            <EmptyState
              illustration="offering"
              title="No opening balances yet"
              description="Opening balance is the money your church already had before you started recording it here. Add it so your reports show the full picture."
              actionLabel="Add Open Balance"
              onAction={() => guarded(openCreate, "offerings", "update")}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left font-semibold text-gray-500 text-xs">
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Account</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Opening Balance</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Open Balance Date</th>
                    <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paged.map((a) => (
                    <tr key={a._id} className="max-md:text-xs text-gray-700 text-sm">
                      <td className="max-md:px-4 py-2.5 text-gray-900 font-medium whitespace-nowrap px-4 md:px-6">
                        {a.accountName}
                      </td>
                      <td className="max-md:px-4 py-2.5 whitespace-nowrap px-4 md:px-6">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                          {a.accountType}
                        </span>
                      </td>
                      <td className="max-md:px-4 py-2.5 text-blue-700 font-semibold whitespace-nowrap px-4 md:px-6">
                        {money(a.amount)}
                      </td>
                      <td className="max-md:px-4 py-2.5 whitespace-nowrap px-4 md:px-6">
                        {formatDate(a.balanceAsOf)}
                      </td>
                      <td className="max-md:px-4 py-2.5 whitespace-nowrap px-4 md:px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewRow(a)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                          >
                            View
                          </button>
                          {(<button
                              type="button"
                              onClick={() => guarded(() => openEdit(a), "offerings", "update")}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                            >
                              Edit
                            </button>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={pagination}
              rowsCount={paged.length}
              limit={limit}
              onLimitChange={(n) => { setLimit(n); setPage(1); }}
              onPageChange={setPage}
              itemName="accounts"
            />
          </>
        )}
      </div>

      {/* Add / Edit Open Balance modal */}
      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-white px-4 md:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">
                {editing ? "Edit Open Balance" : "Add Open Balance"}
              </div>
              <button
                type="button"
                onClick={() => { setFormOpen?.(false); setEditing(null); setError(""); }}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block font-semibold text-gray-500 text-xs">Account Type <span className="text-red-500">*</span></label>
                  <select
                    value={form.accountType}
                    onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}
                    className={`mt-2 ${INPUT_CLS}`}
                  >
                    {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 text-xs">Account Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.accountName}
                    onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                    className={`mt-2 ${INPUT_CLS}`}
                    placeholder="e.g. Main offering bag, MoMo wallet"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 text-xs">Amount <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className={`mt-2 ${INPUT_CLS}`}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 text-xs">Balance As Of <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.balanceAsOf}
                    onChange={(e) => setForm((f) => ({ ...f, balanceAsOf: e.target.value }))}
                    className={`mt-2 ${INPUT_CLS}`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-500 text-xs">Note (optional)</label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    className={`mt-2 ${INPUT_CLS}`}
                    placeholder="e.g. Balance carried over from previous records"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.hasBreakdown}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      hasBreakdown: e.target.checked,
                      breakdown: e.target.checked ? [{ source: "", amount: "" }] : []
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                />
                <span className="text-sm text-gray-700">Add breakdown</span>
              </label>

              {form.hasBreakdown ? (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {form.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={b.source}
                        onChange={(e) => setBreakdownRow(i, { source: e.target.value })}
                        className={`${INPUT_CLS_FLEX} min-w-0 flex-1`}
                      >
                        <option value="">Select source</option>
                        {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={b.amount}
                        onChange={(e) => setBreakdownRow(i, { amount: e.target.value })}
                        className={`${INPUT_CLS_FLEX} w-28 shrink-0`}
                        placeholder="0.00"
                      />
                      {form.breakdown.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, breakdown: f.breakdown.filter((_, idx) => idx !== i) }))}
                          className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"
                          aria-label="Remove"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, breakdown: [...f.breakdown, { source: "", amount: "" }] }))}
                      className="text-blue-700 font-semibold text-xs hover:underline"
                    >
                      + Add another source
                    </button>
                    <span className={`text-xs ${breakdownTotal > Number(form.amount) ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                      Breakdown total: <span className="font-semibold">{money(breakdownTotal)}</span>
                    </span>
                  </div>
                </div>
              ) : null}

              <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={(e) => setForm((f) => ({ ...f, confirmed: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                />
                <span className="text-sm text-gray-700">
                  I confirm this is true <span className="text-red-500">*</span>
                  <span className="mt-0.5 block text-xs text-gray-400">The account and amount reflect the church's actual opening balances.</span>
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setFormOpen?.(false); setEditing(null); setError(""); }}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  loadingText="Saving..."
                  className="rounded-lg px-4 py-2 shadow-sm text-sm"
                  disabled={!form.confirmed}
                >
                  {editing ? "Save Changes" : "Save Open Balance"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* View modal */}
      {viewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-white px-4 md:px-6 py-4">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{viewRow.accountName}</div>
                <div className="mt-1">
                  <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                    {viewRow.referenceId || "-"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Type</div>
                  <div className="mt-1 text-gray-900 text-sm">{viewRow.accountType}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Open Balance Date</div>
                  <div className="mt-1 text-gray-900 text-sm">{formatDate(viewRow.balanceAsOf)}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Recorded By</div>
                  <div className="mt-1 text-gray-900 text-sm">{viewRow.createdBy?.fullName || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Recorded Date</div>
                  <div className="mt-1 text-gray-900 text-sm">{formatDate(viewRow.createdAt)}</div>
                </div>
              </div>
              {viewRow.note ? (
                <div className="text-gray-600 text-sm">
                  <span className="font-semibold text-gray-500 text-xs">Note: </span>
                  {viewRow.note}
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <span className="font-semibold text-blue-800 text-sm">Total Amount</span>
                <span className="font-bold text-blue-800">{money(viewRow.amount)}</span>
              </div>
              {Array.isArray(viewRow.breakdown) && viewRow.breakdown.length ? (
                <div>
                  <div className="font-semibold text-gray-500 text-xs mb-2">Breakdown</div>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {viewRow.breakdown.map((b, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <span className="text-gray-700 text-sm">{b.source}</span>
                        <span className="font-semibold text-gray-900 text-sm">{money(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {Array.isArray(viewRow.history) && viewRow.history.length ? (
                <div>
                  <div className="font-semibold text-gray-500 text-xs mb-2">Adjustment History</div>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {[...viewRow.history].reverse().map((h, i) => (
                      <div key={i} className="px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 text-sm">{money(h.amount)}</span>
                          <span className="text-gray-400 text-xs">{formatDate(h.at)}</span>
                        </div>
                        <div className="mt-0.5 text-gray-400 text-xs">
                          {h.accountType || "—"} · opened {formatDate(h.balanceAsOf)}
                          {h.changedBy?.fullName ? ` · changed by ${h.changedBy.fullName}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
