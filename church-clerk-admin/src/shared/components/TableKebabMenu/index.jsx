import { createPortal } from "react-dom";
import { useState } from "react";

function TableKebabMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: null, bottom: null, right: 0 });

  const visible = items.filter(Boolean);
  if (!visible.length) return null;

  const handleOpen = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    const estimatedHeight = visible.length * 44 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < estimatedHeight + 8) {
      setPos({ top: null, bottom: window.innerHeight - rect.top + 4, right });
    } else {
      setPos({ top: rect.bottom + 4, bottom: null, right });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <div className="lg:hidden flex justify-end">
        <button
          type="button"
          onClick={handleOpen}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200"
          aria-label="More actions"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      <div className="hidden lg:flex items-center justify-end gap-2">
        {visible.map((item, i) => (
          <button
            key={i}
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            className={
              item.desktopClassName ||
              (item.danger
                ? "rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 text-xs"
                : "rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-xs")
            }
          >
            {item.desktopContent ?? item.label}
          </button>
        ))}
      </div>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] min-w-[144px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
            style={pos.bottom != null ? { bottom: pos.bottom, right: pos.right } : { top: pos.top, right: pos.right }}
          >
            {visible.map((item, i) => (
              <button
                key={i}
                type="button"
                disabled={item.disabled}
                onClick={() => { setOpen(false); item.onClick?.(); }}
                className={`cck-allow-icons block w-full px-4 py-2.5 text-left text-sm font-medium disabled:opacity-50 hover:bg-gray-50 active:bg-gray-100 ${item.danger ? "text-red-600" : "text-gray-700"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

export default TableKebabMenu;
