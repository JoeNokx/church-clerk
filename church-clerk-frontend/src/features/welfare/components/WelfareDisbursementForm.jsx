import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import WelfareContext from "../welfare.store.js";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import Button from "../../../shared/components/Button/index.jsx";
import ImageLightbox from "../../../shared/components/ImageLightbox/index.jsx";
import ReceiptPicker from "../../../shared/components/ReceiptPicker/index.jsx";

const CATEGORY_OPTIONS = ["Birthday", "Wedding", "Funeral", "Hospital", "Emergency", "School", "Other"];
const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"];

function WelfareDisbursementForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(WelfareContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("welfare", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("welfare", "update") : false), [can]);

  const { values: lookupCategories, reload: reloadCategories } = useLookupValues("welfareDisbursementCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberOptions, setMemberOptions] = useState([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptRemoved, setReceiptRemoved] = useState(false);
  const [receiptLightbox, setReceiptLightbox] = useState(null);

  const memberName = (m) => `${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "-";

  const debouncedMemberQuery = useMemo(() => String(memberQuery || "").trim(), [memberQuery]);

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      const q = debouncedMemberQuery;
      if (q.length < 2) {
        setMemberOptions([]);
        return;
      }

      setMemberSearching(true);
      try {
        const members = await store?.searchMembers?.(q);
        setMemberOptions(Array.isArray(members) ? members : []);
      } catch {
        setMemberOptions([]);
      } finally {
        setMemberSearching(false);
      }
    };

    const id = setTimeout(run, 250);
    return () => clearTimeout(id);
  }, [debouncedMemberQuery, open, store]);

  const selectMember = (m) => {
    setSelectedMember(m || null);
    setBeneficiaryName(memberName(m) === "-" ? "" : memberName(m));
    setMemberQuery("");
    setMemberOptions([]);
  };

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setIsSubmitting(false);
    setMemberQuery("");
    setMemberOptions([]);
    setReceiptFile(null);
    setReceiptRemoved(false);

    if (mode === "edit" && initialData) {
      setBeneficiaryName(String(initialData.beneficiaryName || ""));
      setSelectedMember(initialData?.member && typeof initialData.member === "object" ? initialData.member : null);
      setCategory(String(initialData.category || ""));
      setAmount(initialData.amount ?? "");
      setDate(String(initialData.date || "").slice(0, 10));
      setDescription(String(initialData.description || ""));
      setPaymentMethod(String(initialData.paymentMethod || "Cash"));
      return;
    }

    setBeneficiaryName("");
    setSelectedMember(null);
    setCategory("");
    setAmount("");
    setDate("");
    setDescription("");
    setPaymentMethod("Cash");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    if (!String(beneficiaryName || "").trim()) {
      setFormError("Beneficiary name is required.");
      setIsSubmitting(false);
      return;
    }

    if (!String(category || "").trim()) {
      setFormError("Category is required.");
      setIsSubmitting(false);
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setFormError("Amount is required.");
      setIsSubmitting(false);
      return;
    }

    if (!date) {
      setFormError("Date is required.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      beneficiaryName: String(beneficiaryName).trim(),
      ...(selectedMember?._id ? { member: selectedMember._id } : {}),
      category: String(category).trim(),
      amount: Number(amount),
      date,
      description: String(description || "").trim(),
      paymentMethod,
      ...(receiptFile ? { receiptFile } : {}),
      ...(receiptRemoved && !receiptFile ? { removeReceipt: true } : {})
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateDisbursement?.(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createDisbursement?.(payload);
      }

      onSuccess?.();
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
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Disbursement" : "Add Disbursement"}</div>
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
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-500 text-xs">Search Member (optional)</label>
              {selectedMember ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate text-sm">{memberName(selectedMember)}</div>
                    <div className="text-gray-500 truncate text-xs">{[selectedMember?.phoneNumber, selectedMember?.email].filter(Boolean).join(" • ") || "—"}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    className="shrink-0 rounded-md px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 text-xs"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                    placeholder="Search name, phone, email..."
                  />
                  {debouncedMemberQuery.length >= 2 ? (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                      {memberSearching ? (
                        <div className="px-4 py-2.5 text-gray-600 text-sm">Searching members...</div>
                      ) : memberOptions.length ? (
                        <div className="divide-y divide-gray-200">
                          {memberOptions.map((m, idx) => (
                            <button
                              key={m?._id ?? `m-${idx}`}
                              type="button"
                              onClick={() => selectMember(m)}
                              className="w-full px-4 py-2.5 text-left hover:bg-gray-50"
                            >
                              <div className="font-semibold text-gray-900 truncate text-sm">{memberName(m)}</div>
                              <div className="text-gray-500 truncate text-xs">{[m?.phoneNumber, m?.email].filter(Boolean).join(" • ") || "—"}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 text-gray-500 text-sm">No members found — type the beneficiary name below.</div>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-500 text-xs">Beneficiary Name</label>
              <input
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-gray-500 text-xs">Category</label>
                {canCreate || canEdit ? (
                  <AddLookupValueButton
                    label="Add category"
                    kind="welfareDisbursementCategory"
                    onCreated={async (value) => {
                      await reloadCategories();
                      setCategory(value);
                    }}
                  />
                ) : null}
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              >
                <option value="" disabled>
                  Select category
                </option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

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
              <label className="block font-semibold text-gray-500 text-xs">Date Disbursed</label>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-500 text-xs">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder="Optional"
              />
            </div>

            <div className="md:col-span-2">
              <ReceiptPicker
                receiptFile={receiptFile}
                existingReceipt={mode === "edit" ? initialData?.receipt : null}
                removed={receiptRemoved}
                onPick={(f) => {
                  if (!f) return;
                  if (!String(f.type || "").startsWith("image/")) {
                    setFormError("Receipt must be an image file.");
                    return;
                  }
                  setFormError(null);
                  setReceiptFile(f);
                  setReceiptRemoved(false);
                }}
                onClearFile={() => setReceiptFile(null)}
                onRemoveExisting={() => setReceiptRemoved(true)}
                onUndoRemove={() => setReceiptRemoved(false)}
                onPreview={(url, name) => setReceiptLightbox({ url, name })}
              />
            </div>
          </div>

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
              {mode === "edit" ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </div>
      <ImageLightbox url={receiptLightbox?.url} name={receiptLightbox?.name} onClose={() => setReceiptLightbox(null)} />
    </div>
  );
}

export default WelfareDisbursementForm;
