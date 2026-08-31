-- ---------------------------------------------------------------------------
-- Talent Grid: enums, shared helper functions and triggers.
-- ---------------------------------------------------------------------------

-- Supabase keeps extensions in an "extensions" schema; a plain Postgres puts
-- them in public. Both are supported so the same migrations run either place.
set search_path = public, extensions;

do $ext$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions') then
    execute 'create extension if not exists "pgcrypto" with schema extensions';
    execute 'create extension if not exists "pg_trgm" with schema extensions';
    execute 'create extension if not exists "unaccent" with schema extensions';
  else
    execute 'create extension if not exists "pgcrypto"';
    execute 'create extension if not exists "pg_trgm"';
    execute 'create extension if not exists "unaccent"';
  end if;
end
$ext$;

-- Enums ---------------------------------------------------------------------

create type public.gender as enum ('male', 'female', 'other', 'undisclosed');
create type public.language as enum ('bangla', 'english', 'mixed');
create type public.tier as enum ('nano', 'micro', 'mid', 'macro', 'mega');
create type public.creator_status as enum ('active', 'inactive', 'unreachable', 'blacklisted');
create type public.platform as enum ('facebook', 'instagram', 'tiktok', 'youtube');
create type public.rate_platform as enum ('facebook', 'instagram', 'tiktok', 'youtube', 'cross_platform');
create type public.data_confidence as enum ('unverified', 'partial', 'verified');
create type public.creator_source as enum ('legacy_import', 'manual', 'api');
create type public.snapshot_source as enum ('manual', 'media_kit', 'api', 'legacy_import');
create type public.deliverable as enum (
  'reel', 'short_video', 'long_video', 'story_set', 'static_post',
  'carousel', 'live', 'event_appearance', 'ugc_only', 'package'
);
create type public.contact_type as enum ('creator', 'manager', 'agency');
create type public.preferred_channel as enum ('whatsapp', 'phone', 'email', 'instagram_dm');
create type public.user_role as enum ('admin', 'editor', 'viewer');
create type public.audit_action as enum ('insert', 'update', 'delete');

-- updated_at ----------------------------------------------------------------

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tier thresholds are fixed by the spec and live in exactly one place.
-- nano < 10k | micro 10k-99,999 | mid 100k-499,999 | macro 500k-999,999 | mega >= 1m
create or replace function public.tg_tier_for(p_followers integer)
returns public.tier
language sql
immutable
as $$
  select case
    when p_followers is null then null
    when p_followers < 10000 then 'nano'::public.tier
    when p_followers < 100000 then 'micro'::public.tier
    when p_followers < 500000 then 'mid'::public.tier
    when p_followers < 1000000 then 'macro'::public.tier
    else 'mega'::public.tier
  end;
$$;

-- Normalised form used by the dedup matcher: lowercase alphanumeric only.
create or replace function public.tg_normalise_name(p_name text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

-- Slug helper. Latin names slugify normally; scripts fall back to the primary
-- handle when a name is entirely non-Latin (several creator names are Bangla).
--
-- unaccent is called unqualified with an explicit search_path, because Supabase
-- installs extensions into the "extensions" schema while a plain Postgres puts
-- them in public. Marked STABLE rather than IMMUTABLE because unaccent depends
-- on a dictionary; nothing indexes on this, so STABLE costs nothing.
create or replace function public.tg_slugify(p_text text)
returns text
language sql
stable
set search_path = public, extensions
as $fn$
  select trim(both '-' from regexp_replace(
    lower(unaccent(coalesce(p_text, ''))), '[^a-z0-9]+', '-', 'g'
  ));
$fn$;
