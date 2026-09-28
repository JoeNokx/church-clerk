import PledgeForm from "./PledgeForm.jsx";

function BaseModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
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

// scope: { churchProject: id } or { event: id }
export default function CreatePledgeModal({ open, onClose, scope, disabled, onSuccess, subtitle }) {
  return (
    <BaseModal
      open={open}
      title="Add Pledge"
      subtitle={subtitle || "Record a pledge"}
      onClose={onClose}
    >
      {open ? (
        <PledgeForm
          scope={scope}
          disabled={disabled}
          onDone={onSuccess}
          onCancel={onClose}
        />
      ) : null}
    </BaseModal>
  );
}
