/**
 * Truncate a name/title for MOBILE table display.
 * If text is long (>20 chars):
 *   - If >2 words: show first + last name (drops middle names)
 *   - If <=2 words: show first 2 words + "…"
 * Otherwise return full text.
 */
export function truncateMobileName(text) {
  if (!text) return "—";
  const str = String(text).trim();
  if (!str) return "—";
  if (str.length <= 20) return str;
  const words = str.split(/\s+/);
  if (words.length > 2) {
    return `${words[0]} ${words[words.length - 1]}`;
  }
  return `${words.slice(0, 2).join(" ")}…`;
}

/**
 * Truncate a name/title for DESKTOP table display.
 * If text is long (>40 chars): truncate to 40 chars + "…"
 * Otherwise return full text.
 */
export function truncateDesktopName(text) {
  if (!text) return "—";
  const str = String(text).trim();
  if (!str) return "—";
  if (str.length <= 40) return str;
  return str.slice(0, 40) + "…";
}
