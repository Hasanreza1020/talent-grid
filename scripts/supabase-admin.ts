/**
 * Privileged Supabase client for the import and seed scripts.
 *
 * This file lives under scripts/ on purpose. The service role key bypasses
 * every RLS policy, so it must never be reachable from anything under app/.
 *
 * Two ways to authenticate, in order of preference:
 *
 *   1. SUPABASE_SERVICE_ROLE_KEY. Bypasses RLS entirely. Simplest, and what
 *      the build spec calls for.
 *   2. SUPABASE_ADMIN_EMAIL and SUPABASE_ADMIN_PASSWORD. Signs in as a real
 *      admin and runs under that person's RLS policies. Strictly less
 *      privileged than the service role, so it is a safe fallback when the
 *      service key is not to hand, and it leaves a real user id on every
 *      audit_log row rather than a null one.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function requireUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local and fill it in.",
    );
  }
  return url;
}

/** Service-role client. Throws if the key is not configured. */
export function createAdminClient(): SupabaseClient {
  const url = requireUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Either set it, or set " +
        "SUPABASE_ADMIN_EMAIL and SUPABASE_ADMIN_PASSWORD and use " +
        "createWriteClient() instead.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A client that can write, however it can get there: the service role if the
 * key is present, otherwise a signed-in admin session.
 */
export async function createWriteClient(): Promise<SupabaseClient> {
  const url = requireUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) return createAdminClient();

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.SUPABASE_ADMIN_EMAIL;
  const password = process.env.SUPABASE_ADMIN_PASSWORD;

  const missing = [
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !email && "SUPABASE_ADMIN_EMAIL",
    !password && "SUPABASE_ADMIN_PASSWORD",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `No SUPABASE_SERVICE_ROLE_KEY, and the admin sign-in fallback is missing: ` +
        `${missing.join(", ")}.`,
    );
  }

  const client = createClient(url, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: email!,
    password: password!,
  });
  if (error) throw new Error(`Admin sign-in failed: ${error.message}`);

  const { data: profile } = await client
    .from("users")
    .select("role")
    .eq("id", data.user!.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    throw new Error(
      `${email} signed in but has the "${profile?.role ?? "unknown"}" role, which ` +
        `cannot write. Promote the account first.`,
    );
  }

  return client;
}
