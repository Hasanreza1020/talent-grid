-- ---------------------------------------------------------------------------
-- Talent Grid: metric snapshots, audience profiles, and the derived fields
-- (creators.tier, creators.primary_platform, accounts.is_primary) that are
-- recomputed on write from them.
-- ---------------------------------------------------------------------------

-- metric_snapshots ----------------------------------------------------------

set search_path = public, extensions;

create table public.metric_snapshots (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.accounts (id) on delete cascade,
  captured_on       date not null,
  followers         integer check (followers is null or followers >= 0),
  avg_views         integer check (avg_views is null or avg_views >= 0),
  avg_likes         integer check (avg_likes is null or avg_likes >= 0),
  avg_comments      integer check (avg_comments is null or avg_comments >= 0),
  avg_shares        integer check (avg_shares is null or avg_shares >= 0),
  posts_last_30d    integer check (posts_last_30d is null or posts_last_30d >= 0),
  engagement_rate   numeric(6, 3),
  source            public.snapshot_source not null default 'manual',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint metric_snapshots_one_per_day unique (account_id, captured_on)
);

comment on table public.metric_snapshots is
  'Append-only in normal operation. Never overwrite an existing snapshot to '
  'record a new follower count; insert a new dated row. Every growth and trend '
  'feature reads from this history. Correcting a typo in a past snapshot is an '
  'admin-only operation, enforced by RLS.';

create index metric_snapshots_account_captured_idx
  on public.metric_snapshots (account_id, captured_on desc);

create trigger metric_snapshots_set_updated_at
  before update on public.metric_snapshots
  for each row execute function public.tg_set_updated_at();

-- Moving captured_on would silently rewrite history, so it is refused outright.
create or replace function public.tg_metric_snapshot_immutable_date()
returns trigger
language plpgsql
as $fn$
begin
  if new.captured_on is distinct from old.captured_on then
    raise exception
      'metric_snapshots.captured_on is immutable. Insert a new dated snapshot '
      'instead of moving an existing one.';
  end if;
  return new;
end;
$fn$;

create trigger metric_snapshots_captured_on_immutable
  before update on public.metric_snapshots
  for each row execute function public.tg_metric_snapshot_immutable_date();

-- audience_profiles ---------------------------------------------------------

create table public.audience_profiles (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references public.accounts (id) on delete cascade,
  captured_on        date not null,
  age_brackets       jsonb,
  gender_split       jsonb,
  top_cities         jsonb,
  top_countries      jsonb,
  authenticity_score numeric(5, 2) check (
    authenticity_score is null or (authenticity_score >= 0 and authenticity_score <= 100)
  ),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Not named in the spec, but audience data is dated the same way metrics are
  -- and one profile per account per day keeps the history unambiguous.
  constraint audience_profiles_one_per_day unique (account_id, captured_on)
);

create index audience_profiles_account_captured_idx
  on public.audience_profiles (account_id, captured_on desc);

create trigger audience_profiles_set_updated_at
  before update on public.audience_profiles
  for each row execute function public.tg_set_updated_at();

-- Derived creator fields ----------------------------------------------------

-- Latest snapshot per account, which is what "current followers" means
-- everywhere in the product.
create or replace view public.account_latest_metrics
with (security_invoker = true) as
select distinct on (m.account_id)
  m.account_id,
  m.id as snapshot_id,
  m.captured_on,
  m.followers,
  m.avg_views,
  m.avg_likes,
  m.avg_comments,
  m.avg_shares,
  m.posts_last_30d,
  m.engagement_rate,
  m.source
from public.metric_snapshots m
order by m.account_id, m.captured_on desc, m.created_at desc;

-- Recomputes tier, primary_platform and accounts.is_primary from the highest
-- current follower count. Leaves them null when no follower data exists.
create or replace function public.tg_recompute_creator_derived(p_creator_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_winner_id       uuid;
  v_winner_platform public.platform;
  v_max_followers   integer;
  v_account_count   integer;
begin
  select count(*) into v_account_count
  from public.accounts where creator_id = p_creator_id;

  select a.id, a.platform, lm.followers
    into v_winner_id, v_winner_platform, v_max_followers
  from public.accounts a
  join public.account_latest_metrics lm on lm.account_id = a.id
  where a.creator_id = p_creator_id
    and lm.followers is not null
  order by lm.followers desc, a.created_at asc
  limit 1;

  -- With no follower data anywhere, a lone account is still unambiguously the
  -- primary one. With several and no data, we decline to guess.
  if v_winner_id is null and v_account_count = 1 then
    select id, platform into v_winner_id, v_winner_platform
    from public.accounts where creator_id = p_creator_id;
  end if;

  -- Written as `is not distinct from` because a plain `=` against a null
  -- winner yields null rather than false, and is_primary is NOT NULL. With no
  -- winner, every account correctly ends up not primary.
  update public.accounts a
     set is_primary = (v_winner_id is not null and a.id is not distinct from v_winner_id)
   where a.creator_id = p_creator_id
     and a.is_primary is distinct from
         (v_winner_id is not null and a.id is not distinct from v_winner_id);

  update public.creators c
     set primary_platform = v_winner_platform,
         tier = public.tg_tier_for(v_max_followers)
   where c.id = p_creator_id
     and (c.primary_platform is distinct from v_winner_platform
          or c.tier is distinct from public.tg_tier_for(v_max_followers));
end;
$fn$;

create or replace function public.tg_accounts_recompute()
returns trigger
language plpgsql
as $fn$
begin
  perform public.tg_recompute_creator_derived(
    coalesce(new.creator_id, old.creator_id)
  );
  return null;
end;
$fn$;

-- Fires on structural changes only. The recompute itself writes is_primary,
-- and excluding that column here is what stops the trigger recursing.
create trigger accounts_recompute_derived
  after insert or delete on public.accounts
  for each row execute function public.tg_accounts_recompute();

create trigger accounts_recompute_derived_on_move
  after update of creator_id, platform on public.accounts
  for each row execute function public.tg_accounts_recompute();

create or replace function public.tg_snapshots_recompute()
returns trigger
language plpgsql
as $fn$
declare
  v_creator_id uuid;
begin
  select creator_id into v_creator_id
  from public.accounts
  where id = coalesce(new.account_id, old.account_id);

  if v_creator_id is not null then
    perform public.tg_recompute_creator_derived(v_creator_id);
  end if;
  return null;
end;
$fn$;

create trigger metric_snapshots_recompute_derived
  after insert or update or delete on public.metric_snapshots
  for each row execute function public.tg_snapshots_recompute();
