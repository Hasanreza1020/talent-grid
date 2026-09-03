import "server-only";

import { cache } from "react";
import { createAdminClient, hasServiceKey } from "@/lib/supabase/admin";

/**
 * Who is allowed into this deployment.
 *
 * There are two sources, checked in that order.
 *
 * 1. `public.allowed_emails` in the database, which the admin screen writes to
 *    when it creates or revokes an account. This is the real list once the
 *    lock-to-owner migration has been applied, and it is what makes managing
 *    people from the interface possible at all — an environment variable
 *    cannot be edited by a form.
 *
 * 2. The environment, as a bootstrap. It is what holds the door before that
 *    migration runs, and it is the way back in if the table is ever emptied by
 *    accident. The owner should stay in it permanently for exactly that
 *    reason.
 *
 * Reading the table needs the service role, because the table is deliberately
 * unreadable by `anon` and `authenticated`: a list of who has access is not
 * something a signed-in browser should be able to enumerate.
 */
const DEFAULT_ALLOWED = ["hasanreza2950@gmail.com"];

function normalise(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** The bootstrap list. Never empty: an empty override falls back to the owner. */
export function bootstrapEmails(): string[] {
  const raw = process.env.GRID_ALLOWED_EMAILS;
  if (!raw) return DEFAULT_ALLOWED;
  const parsed = raw.split(",").map(normalise).filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED;
}

/**
 * The addresses in the database, or null when there is no table to read yet.
 *
 * Null and empty mean different things here and must not be conflated. Null is
 * "this deployment has no allowlist table", which falls back to the bootstrap.
 * An empty array would be "the table exists and nobody is in it", which would
 * lock everybody out — so that case also falls back, rather than bricking the
 * product on a bad migration.
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

  // The bootstrap always holds. Losing access to your own product because a
  // row was deleted is a worse failure than one extra address being allowed.
  if (bootstrapEmails().includes(candidate)) return true;

  const stored = await storedEmails();
  return stored !== null && stored.includes(candidate);
}
