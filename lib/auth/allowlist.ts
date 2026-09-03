/**
 * Who is allowed into this deployment at all.
 *
 * The product is a single-operator tool for the time being. Rather than trying
 * to keep a role column honest across every screen, the gate is an allowlist of
 * email addresses checked at the door: anyone not on it is signed out on their
 * next request, whatever their profile row says and whatever they type.
 *
 * This is one of three layers, not the only one. The middleware turns people
 * away, `getCurrentUser` refuses to describe them as signed in, and — once the
 * migration alongside this is applied — the database refuses to create the
 * account in the first place. A gap in any one of those should not be enough.
 *
 * `GRID_ALLOWED_EMAILS` overrides the default (comma separated) so that adding
 * somebody is a deploy setting rather than a code change. It is read on the
 * server only and never reaches the browser.
 */
const DEFAULT_ALLOWED = ["hasanreza2950@gmail.com"];

function configured(): string[] {
  const raw = process.env.GRID_ALLOWED_EMAILS;
  if (!raw) return DEFAULT_ALLOWED;
  const parsed = raw
    .split(",")
    .map((entry) => normalise(entry))
    .filter(Boolean);
  // An empty or whitespace-only override must not silently open the door; it
  // falls back to the owner rather than to nobody or to everybody.
  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED;
}

function normalise(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isAuthorisedEmail(email: string | null | undefined): boolean {
  const candidate = normalise(email);
  if (!candidate) return false;
  return configured().includes(candidate);
}

/** For copy and for the migration. Never rendered to an unauthenticated page. */
export function allowedEmails(): string[] {
  return configured();
}
