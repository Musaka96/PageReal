/**
 * Rejects cross-origin POSTs as a CSRF guard. SameSite=Lax cookies already
 * block most cross-site form submissions, but this catches the rest (e.g.
 * fetch() with credentials from another origin in browsers that don't
 * enforce SameSite strictly).
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin requests from some clients omit Origin
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
