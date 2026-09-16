/**
 * Delegate session bootstrap.
 *
 * When a system admin clicks "View Church" in the admin app, the backend
 * issues a short-lived JWT and opens the church-facing frontend with
 * ?delegateToken=xxx&churchId=yyy in the URL.
 *
 * This module runs before React mounts, stores the token as the normal
 * auth token (so the existing http interceptor picks it up), sets the
 * active church, and strips the sensitive params from the URL so they
 * don't leak into history, logs, or screenshots.
 *
 * The token is stored in sessionStorage (not localStorage) so it is
 * automatically cleared when the delegated tab is closed.
 */

const AUTH_TOKEN_KEY = "cckAuthToken";
const ACTIVE_CHURCH_KEY = "activeChurch";

export function bootstrapDelegateSession() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const delegateToken = params.get("delegateToken");
  const churchId = params.get("churchId");

  if (!delegateToken || !churchId) return;

  // Store the delegated token in sessionStorage so it dies with the tab.
  sessionStorage.setItem(AUTH_TOKEN_KEY, delegateToken);
  localStorage.removeItem(AUTH_TOKEN_KEY);

  // Set the active church so the http interceptor sends x-active-church.
  localStorage.setItem(ACTIVE_CHURCH_KEY, churchId);

  // Mark this as a delegated session so the UI can show a banner / limit
  // features later if needed.
  sessionStorage.setItem("cckDelegateSession", "1");
  sessionStorage.setItem("cckDelegateChurch", churchId);

  // Strip the sensitive params from the URL.
  params.delete("delegateToken");
  params.delete("churchId");
  const remaining = params.toString();

  // Redirect to the dashboard (strip the delegate params from the URL
  // so they don't leak into history, logs, or screenshots).
  const targetPath = "/dashboard";
  const newUrl =
    targetPath + (remaining ? `?${remaining}` : "") + window.location.hash;

  window.history.replaceState({}, "", newUrl);
}

export function isDelegateSession() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("cckDelegateSession") === "1";
}

export function getDelegateChurchId() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("cckDelegateChurch") || null;
}

export function clearDelegateSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem("cckDelegateSession");
  sessionStorage.removeItem("cckDelegateChurch");
  localStorage.removeItem(ACTIVE_CHURCH_KEY);
}
