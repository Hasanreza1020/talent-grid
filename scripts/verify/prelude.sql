-- Local-only stand-in for the parts of a Supabase database that the migrations
-- depend on but do not create: the auth and storage schemas, and the anon and
-- authenticated roles. Used by scripts/verify/run.sh to prove the migrations
-- and the RLS policies behave, against a plain Postgres container.
--
-- This file is never applied to a real Supabase project.

create schema if not exists auth;
create schema if not exists storage;

-- Supabase keeps extensions in their own schema rather than in public, and
-- code that works against a plain Postgres can still fail there because of it.
-- Creating the schema here makes this harness reproduce that layout, so a
-- schema-qualification mistake fails locally instead of on first deploy.
create schema if not exists extensions;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Supabase resolves the caller from the JWT. Here it comes from a session
-- setting so the tests can switch identities.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text,
  owner     uuid
);

alter table storage.objects enable row level security;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema public, storage to anon, authenticated;

-- Mirrors Supabase, which grants table privileges broadly and relies on RLS
-- to do the actual gating.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
grant select, insert, update, delete on all tables in schema storage to authenticated;
