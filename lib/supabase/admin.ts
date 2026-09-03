import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The service-role client.
 *
 * This key bypasses row level security completely, so it exists in exactly one
 * module, is never imported by anything under `components/`, and is only ever
 * reached from a server action that has already established the caller is an
 * admin. It is read from the environment on the server and never returned,
 * logged, or serialised into a payload.
 *
 * Creating an account is the only thing in this product that genuinely needs
 * it: Supabase will not mint an auth user for anyone but the service role.
 */
export function hasServiceKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured, so accounts cannot be created.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
