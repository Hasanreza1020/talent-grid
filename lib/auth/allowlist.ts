import "server-only";

import { cache } from "react";
import { createAdminClient, hasServiceKey } from "@/lib/supabase/admin";

/**
 * An optional lock on who may hold an account, off unless it is configured.
 *
 * With nothing set, the product behaves as it always did: anyone can create an
 * account, it starts as a viewer, and an admin raises the role deliberately.
 * That is the default because it is what the product is for.
 *
 * Set `GRID_ALLOWED_EMAILS` — or fill `public.allowed_emails` in the database —
 * and it becomes an allowlist instead: anybody not on it is signed out on their
 * next request whatever their profile row says. One environment variable turns
 * the whole workspace private, and removing it opens it again, so locking down
 * is a deployment setting rather than a code change.
 *
 * Reading the table needs the service role, because a list of who has access
 * is not something a signed-in browser should be able to enumerate.
 */
function normalise(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** Addresses from the environment. Empty means "no restriction configured". */
export function bootstrapEmails(): string[] {
  const raw = process.env.GRID_ALLOWED_EMAILS;
  if (!raw) return [];
  return raw.split(",").map(normalise).filter(Boolean);
}

/**
 * Addresses from the database, or null when there is no table to read.
 *
 * Null and empty are not the same. Null is "this deployment has no allowlist
 * table" and leaves the door as the environment found it. An empty table would
 * be "nobody at all", which would lock everyone out of their own product on a
 * bad migration, so that also reads as no restriction.
 */
const storedEmails = cache(async (): Promise<string[] | null> => {
  if (!hasServiceKey()) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("allowed_emails").select("email");
    if (error || !data || data.length === 0) return null;
    return data.map((row) => normalise(row.email as string));
  } catch {
    return null;
  }
});

export async function isAuthorisedEmail(email: string | null | undefined): Promise<boolean> {
  const candidate = normalise(email);
  if (!candidate) return false;

  const configured = bootstrapEmails();
  if (configured.includes(candidate)) return true;

  const stored = await storedEmails();

  // Neither source is configured, so there is no allowlist to fail. Open.
  if (configured.length === 0 && stored === null) return true;

  return stored !== null && stored.includes(candidate);
}
