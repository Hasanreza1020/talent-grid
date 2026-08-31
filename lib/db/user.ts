import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@/lib/types";

/**
 * The signed-in user's profile row, including their role. Cached per request so
 * that the many components asking "can this person see rates?" cost one query.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, fullName: data.full_name, role: data.role as UserRole };
});

export function isEditor(user: AppUser | null): boolean {
  return user?.role === "admin" || user?.role === "editor";
}

export function isAdmin(user: AppUser | null): boolean {
  return user?.role === "admin";
}

export async function listUsers(): Promise<AppUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, role")
    .order("full_name", { nullsFirst: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    role: row.role as UserRole,
  }));
}
