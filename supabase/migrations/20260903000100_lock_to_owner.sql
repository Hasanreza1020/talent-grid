-- Lock the workspace to a single owner.
--
-- The application already refuses anyone else at the middleware and again in
-- getCurrentUser, but the application is not the security boundary — this is.
-- Anything holding a valid anon key and speaking PostgREST directly bypasses
-- every line of TypeScript in the repository, so the rule has to exist here
-- too.
--
-- To add somebody later: insert their address into public.allowed_emails and
-- add it to GRID_ALLOWED_EMAILS in the deployment. Both, deliberately.

create table if not exists public.allowed_emails (
  email       text primary key,
  note        text,
  created_at  timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

-- Nobody reads or writes this from the client. It is administered through the
-- database, which is the point of it.
revoke all on public.allowed_emails from anon, authenticated;

insert into public.allowed_emails (email, note)
values ('hasanreza2950@gmail.com', 'Owner')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- Is the caller allowed here at all?
-- ---------------------------------------------------------------------------

create or replace function public.tg_is_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from auth.users u
    join public.allowed_emails a on lower(u.email) = a.email
    where u.id = auth.uid()
  );
$fn$;

-- ---------------------------------------------------------------------------
-- No new accounts, by any route.
-- ---------------------------------------------------------------------------

-- Signup is removed from the application, but the Supabase auth endpoint is
-- reachable with nothing but the anon key. This refuses the insert outright,
-- so a POST to /auth/v1/signup fails at the database rather than quietly
-- creating a viewer.
create or replace function public.tg_block_unlisted_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not exists (
    select 1 from public.allowed_emails where email = lower(new.email)
  ) then
    raise exception 'Registration is closed for this workspace.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created_guard on auth.users;
create trigger on_auth_user_created_guard
  before insert on auth.users
  for each row execute function public.tg_block_unlisted_signup();

-- ---------------------------------------------------------------------------
-- Remove everyone who is not the owner.
-- ---------------------------------------------------------------------------

-- Their shortlists survive with a null author rather than disappearing, which
-- is what the foreign key already specifies.
delete from public.users
where id in (
  select u.id
  from auth.users u
  left join public.allowed_emails a on lower(u.email) = a.email
  where a.email is null
);

delete from auth.users
where id in (
  select u.id
  from auth.users u
  left join public.allowed_emails a on lower(u.email) = a.email
  where a.email is null
);

-- ---------------------------------------------------------------------------
-- Every policy now requires membership as well as a role.
-- ---------------------------------------------------------------------------

-- A profile row that somehow existed for an unlisted account would otherwise
-- still satisfy the old policies. Re-stating them with tg_is_allowed() closes
-- that, and keeps the role checks doing their original job on top.
drop policy if exists users_read_self_or_admin on public.users;
create policy users_read_self_or_admin on public.users
  for select to authenticated
  using (public.tg_is_allowed() and (id = auth.uid() or public.tg_is_admin()));

drop policy if exists users_update_own_name on public.users;
create policy users_update_own_name on public.users
  for update to authenticated
  using (public.tg_is_allowed() and id = auth.uid())
  with check (
    public.tg_is_allowed() and id = auth.uid() and role = public.tg_role()
  );

drop policy if exists users_admin_write on public.users;
create policy users_admin_write on public.users
  for all to authenticated
  using (public.tg_is_allowed() and public.tg_is_admin())
  with check (public.tg_is_allowed() and public.tg_is_admin());

-- The role helpers are the gate every other table's policies are written
-- against, so tightening them covers creators, accounts, rates, contacts,
-- notes and shortlists in one place rather than restating a hundred policies.
create or replace function public.tg_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when not public.tg_is_allowed() then null
    else (select role from public.users where id = auth.uid())
  end;
$fn$;

create or replace function public.tg_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(public.tg_is_allowed() and public.tg_role() = 'admin', false);
$fn$;

create or replace function public.tg_is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(public.tg_is_allowed() and public.tg_role() in ('admin', 'editor'), false);
$fn$;
