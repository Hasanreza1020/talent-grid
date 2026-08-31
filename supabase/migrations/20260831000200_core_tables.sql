-- ---------------------------------------------------------------------------
-- Talent Grid: users, creators, taxonomy and platform accounts.
-- ---------------------------------------------------------------------------

-- users ---------------------------------------------------------------------

set search_path = public, extensions;

create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.tg_set_updated_at();

-- Every authenticated account gets a profile row, defaulting to viewer.
-- Roles are raised deliberately by an admin, never on signup.
create or replace function public.tg_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.users (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$fn$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_auth_user();

-- Role helpers. SECURITY DEFINER so that policies on public.users itself do
-- not recurse when a policy on another table asks for the caller's role.
create or replace function public.tg_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $fn$
  select role from public.users where id = auth.uid();
$fn$;

create or replace function public.tg_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(public.tg_role() = 'admin', false);
$fn$;

create or replace function public.tg_is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(public.tg_role() in ('admin', 'editor'), false);
$fn$;

-- creators ------------------------------------------------------------------

create table public.creators (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  display_name            text not null,
  legal_name              text,
  bio_short               text check (char_length(bio_short) <= 160),
  bio_long                text,
  portrait_url            text,
  cover_url               text,
  gender                  public.gender not null default 'undisclosed',
  city                    text,
  country                 text not null default 'Bangladesh',
  primary_language        public.language not null default 'bangla',
  -- tier and primary_platform are derived on write from the highest follower
  -- count across the accounts. Both stay null while no follower data exists:
  -- null is not zero, and the UI renders "No data".
  tier                    public.tier,
  primary_platform        public.platform,
  status                  public.creator_status not null default 'active',
  accepts_barter          boolean,
  typical_turnaround_days integer check (typical_turnaround_days is null or typical_turnaround_days >= 0),
  data_confidence         public.data_confidence not null default 'unverified',
  source                  public.creator_source not null default 'manual',
  -- Creators are never hard-deleted.
  deleted_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index creators_status_idx on public.creators (status) where deleted_at is null;
create index creators_tier_idx on public.creators (tier) where deleted_at is null;
create index creators_city_idx on public.creators (city) where deleted_at is null;
create index creators_name_trgm_idx on public.creators using gin (display_name gin_trgm_ops);
create index creators_normalised_name_idx on public.creators (public.tg_normalise_name(display_name));

create trigger creators_set_updated_at
  before update on public.creators
  for each row execute function public.tg_set_updated_at();

-- categories ----------------------------------------------------------------

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  parent_id   uuid references public.categories (id) on delete set null,
  description text,
  cover_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index categories_parent_idx on public.categories (parent_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.tg_set_updated_at();

create table public.creator_categories (
  creator_id  uuid not null references public.creators (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (creator_id, category_id)
);

-- Exactly one primary category per creator.
create unique index creator_categories_one_primary_idx
  on public.creator_categories (creator_id) where is_primary;

create index creator_categories_category_idx on public.creator_categories (category_id);

create trigger creator_categories_set_updated_at
  before update on public.creator_categories
  for each row execute function public.tg_set_updated_at();

-- tags ----------------------------------------------------------------------

-- Stored without the leading hash; the UI renders it.
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  label      text not null unique,
  slug       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.tg_set_updated_at();

create table public.creator_tags (
  creator_id uuid not null references public.creators (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (creator_id, tag_id)
);

create index creator_tags_tag_idx on public.creator_tags (tag_id);

-- accounts ------------------------------------------------------------------

create table public.accounts (
  id             uuid primary key default gen_random_uuid(),
  creator_id     uuid not null references public.creators (id) on delete cascade,
  platform       public.platform not null,
  -- Stored without the @. Nullable only because a number of legacy rows carry
  -- a post permalink instead of a profile link, and a post id is not a handle.
  -- The importer reports every such row; it never fabricates one.
  handle         text,
  profile_url    text not null,             -- tracking parameters stripped
  is_primary     boolean not null default false,
  verified_badge boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint accounts_one_row_per_platform unique (creator_id, platform),
  constraint accounts_handle_no_at check (handle not like '@%')
);

create index accounts_creator_idx on public.accounts (creator_id);
create index accounts_handle_idx on public.accounts (lower(handle));

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.tg_set_updated_at();
