export function focusFirstInvalid(form) {
  requestAnimationFrame(() => {
    const el = form?.querySelector('[data-invalid="true"]');
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const input = el.querySelector('input[type="tel"]') || el.querySelector('input:not([type="hidden"]), select, textarea');
    input?.focus({ preventScroll: true });
  });
}

export function fieldFromServerMessage(message, keywordsByField) {
  const text = String(message || "").toLowerCase();
  for (const [field, keywords] of Object.entries(keywordsByField)) {
    if (keywords.some((k) => text.includes(k))) return field;
  }
  return null;
}
