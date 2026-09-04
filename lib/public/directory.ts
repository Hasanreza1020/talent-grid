import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Platform } from "@/lib/types";

/**
 * Everything the public site can read, and the only way it reads anything.
 *
 * These call three SECURITY DEFINER functions with the anonymous key. No table
 * is granted to `anon`, so a mistake in a component here cannot widen what is
 * visible: the shape below is fixed in the database, and adding a field to it
 * is a migration somebody has to write on purpose.
 */
export type PublicCreator = {
  slug: string;
  name: string;
  portraitUrl: string | null;
  city: string | null;
  category: string | null;
  categorySlug: string | null;
  totalReach: number | null;
  platforms: { platform: Platform; followers: number | null }[];
};

/**
 * The detail view carries handles and profile links; the list does not. Omit
 * rather than extend, or the intersection keeps the narrower list shape and
 * the extra fields are invisible to the type checker.
 */
export type PublicCreatorDetail = Omit<PublicCreator, "platforms"> & {
  bio: string | null;
  platforms: {
    platform: Platform;
    handle: string | null;
    url: string | null;
    followers: number | null;
  }[];
};

export type PublicCategory = { slug: string; name: string; creatorCount: number };

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured for the public site.");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * A failure here renders an empty showcase rather than an error page.
 *
 * The two ways this fails are the migration not being applied yet and the
 * database being unreachable. Neither is something a visitor can act on, and
 * a marketing site with nothing on it is a smaller failure than a stack trace
 * on somebody's first visit.
 */
export const publicDirectory = cache(async (): Promise<PublicCreator[]> => {
  try {
    const { data, error } = await anonClient().rpc("public_directory");
    if (error) throw error;
    return (data ?? []) as PublicCreator[];
  } catch (failure) {
    console.error("public_directory unavailable:", failure);
    return [];
  }
});

export const publicCategories = cache(async (): Promise<PublicCategory[]> => {
  try {
    const { data, error } = await anonClient().rpc("public_categories");
    if (error) throw error;
    return (data ?? []) as PublicCategory[];
  } catch (failure) {
    console.error("public_categories unavailable:", failure);
    return [];
  }
});

export const publicCreator = cache(async (slug: string): Promise<PublicCreatorDetail | null> => {
  try {
    const { data, error } = await anonClient().rpc("public_creator", { p_slug: slug });
    if (error) throw error;
    return (data ?? null) as PublicCreatorDetail | null;
  } catch (failure) {
    console.error("public_creator unavailable:", failure);
    return null;
  }
});
