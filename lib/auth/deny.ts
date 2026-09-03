import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * End a session that is authenticated but not permitted, and say so.
 *
 * Redirecting such a person to /login without signing them out would loop:
 * the middleware sends anyone holding a session away from /login. Clearing the
 * session first breaks the cycle and is the honest outcome anyway — if you are
 * not allowed in, you should not still be carrying a token for the place.
 */
export async function denyAccess(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?denied=1");
}
