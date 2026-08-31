-- ---------------------------------------------------------------------------
-- Talent Grid: rate cards, contacts, collaborations, conflicts, samples and
-- internal notes. All money is integer BDT; there are no floats for currency.
-- ---------------------------------------------------------------------------

-- rate_cards ----------------------------------------------------------------

set search_path = public, extensions;

create table public.rate_cards (
  id             uuid primary key default gen_random_uuid(),
  creator_id     uuid not null references public.creators (id) on delete cascade,
  platform       public.rate_platform not null,
  deliverable    public.deliverable not null,
  price_bdt      integer not null check (price_bdt >= 0),
  negotiable     boolean not null default true,
  notes          text,
  effective_from date not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint rate_cards_one_per_effective_date
    unique (creator_id, platform, deliverable, effective_from)
);

comment on table public.rate_cards is
  'Multiple rows per creator. The current rate is the row with the most recent '
  'effective_from per (platform, deliverable) that is not in the future.';

create index rate_cards_creator_idx on public.rate_cards (creator_id);
create index rate_cards_current_idx
  on public.rate_cards (creator_id, platform, deliverable, effective_from desc);

create trigger rate_cards_set_updated_at
  before update on public.rate_cards
  for each row execute function public.tg_set_updated_at();

-- Current rate per (creator, platform, deliverable).
create or replace view public.current_rate_cards
with (security_invoker = true) as
select distinct on (r.creator_id, r.platform, r.deliverable)
  r.id,
  r.creator_id,
  r.platform,
  r.deliverable,
  r.price_bdt,
  r.negotiable,
  r.notes,
  r.effective_from
from public.rate_cards r
where r.effective_from <= current_date
order by r.creator_id, r.platform, r.deliverable, r.effective_from desc;

-- contacts ------------------------------------------------------------------

create table public.contacts (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.creators (id) on delete cascade,
  contact_type      public.contact_type not null default 'creator',
  name              text,
  phone             text,
  whatsapp          text,
  email             text,
  preferred_channel public.preferred_channel not null default 'whatsapp',
  is_primary        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index contacts_creator_idx on public.contacts (creator_id);
create unique index contacts_one_primary_idx
  on public.contacts (creator_id) where is_primary;

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.tg_set_updated_at();

-- collaborations ------------------------------------------------------------

create table public.collaborations (
  id                        uuid primary key default gen_random_uuid(),
  creator_id                uuid not null references public.creators (id) on delete cascade,
  client_name               text not null,
  campaign_name             text,
  deliverables              text,
  fee_bdt                   integer check (fee_bdt is null or fee_bdt >= 0),
  ran_on                    date,
  delivered_views           integer check (delivered_views is null or delivered_views >= 0),
  delivered_engagement_rate numeric(6, 3),
  was_our_campaign          boolean not null default true,
  post_url                  text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on column public.collaborations.was_our_campaign is
  'false means we observed the creator working with that brand but did not '
  'broker it. Both matter for conflict checking.';

create index collaborations_creator_idx on public.collaborations (creator_id);

create trigger collaborations_set_updated_at
  before update on public.collaborations
  for each row execute function public.tg_set_updated_at();

-- Viewers may read collaboration history but not the fee. Postgres RLS filters
-- rows, not columns, so the fee is masked by this view and the base table is
-- readable by editors and admins only.
create or replace view public.collaborations_readable
with (security_invoker = false) as
select
  c.id,
  c.creator_id,
  c.client_name,
  c.campaign_name,
  c.deliverables,
  case when public.tg_is_editor() then c.fee_bdt else null end as fee_bdt,
  public.tg_is_editor() as fee_visible,
  c.ran_on,
  c.delivered_views,
  c.delivered_engagement_rate,
  c.was_our_campaign,
  c.post_url,
  c.created_at
from public.collaborations c;

-- brand_conflicts -----------------------------------------------------------

create table public.brand_conflicts (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.creators (id) on delete cascade,
  brand_name        text not null,
  conflict_category text,
  exclusive_until   date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index brand_conflicts_creator_idx on public.brand_conflicts (creator_id);
create index brand_conflicts_open_idx
  on public.brand_conflicts (creator_id, exclusive_until)
  where exclusive_until is not null;

create trigger brand_conflicts_set_updated_at
  before update on public.brand_conflicts
  for each row execute function public.tg_set_updated_at();

-- content_samples -----------------------------------------------------------

create table public.content_samples (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.creators (id) on delete cascade,
  account_id    uuid references public.accounts (id) on delete set null,
  url           text not null,
  thumbnail_url text,
  caption       text,
  views         integer check (views is null or views >= 0),
  is_featured   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index content_samples_creator_idx on public.content_samples (creator_id);
create index content_samples_featured_idx
  on public.content_samples (creator_id) where is_featured;

create trigger content_samples_set_updated_at
  before update on public.content_samples
  for each row execute function public.tg_set_updated_at();

-- At most three featured samples per creator.
create or replace function public.tg_limit_featured_samples()
returns trigger
language plpgsql
as $fn$
declare
  v_count integer;
begin
  if not new.is_featured then
    return new;
  end if;

  select count(*) into v_count
  from public.content_samples
  where creator_id = new.creator_id
    and is_featured
    and id <> new.id;

  if v_count >= 3 then
    raise exception
      'A creator can have at most three featured content samples. Unfeature '
      'one before featuring another.';
  end if;

  return new;
end;
$fn$;

create trigger content_samples_limit_featured
  before insert or update on public.content_samples
  for each row execute function public.tg_limit_featured_samples();

-- internal_notes ------------------------------------------------------------

create table public.internal_notes (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references public.creators (id) on delete cascade,
  author_id        uuid references public.users (id) on delete set null,
  body             text not null,
  professionalism  smallint check (professionalism is null or professionalism between 1 and 5),
  responsiveness   smallint check (responsiveness is null or responsiveness between 1 and 5),
  punctuality      smallint check (punctuality is null or punctuality between 1 and 5),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.internal_notes is
  'Never exposed on any public or client-shared surface, and excluded from the '
  'shortlist PDF export by default.';

create index internal_notes_creator_idx
  on public.internal_notes (creator_id, created_at desc);

create trigger internal_notes_set_updated_at
  before update on public.internal_notes
  for each row execute function public.tg_set_updated_at();
