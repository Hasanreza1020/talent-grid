-- ---------------------------------------------------------------------------
-- Talent Grid: shortlists, tokenised sharing, and the audit log.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

create table public.shortlists (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  client_name            text,
  brief_notes            text,
  created_by             uuid references public.users (id) on delete set null,
  share_token            text unique,
  share_expires_at       timestamptz,
  include_rates_in_share boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index shortlists_created_by_idx on public.shortlists (created_by);

create trigger shortlists_set_updated_at
  before update on public.shortlists
  for each row execute function public.tg_set_updated_at();

create table public.shortlist_items (
  shortlist_id uuid not null references public.shortlists (id) on delete cascade,
  creator_id   uuid not null references public.creators (id) on delete cascade,
  position     integer not null default 0,
  pitch_note   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (shortlist_id, creator_id)
);

create index shortlist_items_order_idx
  on public.shortlist_items (shortlist_id, position);

create trigger shortlist_items_set_updated_at
  before update on public.shortlist_items
  for each row execute function public.tg_set_updated_at();

-- audit_log -----------------------------------------------------------------

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users (id) on delete set null,
  table_name  text not null,
  record_id   uuid,
  action      public.audit_action not null,
  diff        jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_record_idx on public.audit_log (table_name, record_id, created_at desc);
create index audit_log_user_idx on public.audit_log (user_id, created_at desc);

-- Records only the columns that actually changed, so an update to one field
-- does not produce a diff containing the whole row.
create or replace function public.tg_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_diff      jsonb;
  v_record_id uuid;
  v_action    public.audit_action;
  v_old       jsonb;
  v_new       jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_new := to_jsonb(new);
    v_diff := jsonb_build_object('new', v_new);
    v_record_id := (v_new ->> 'id')::uuid;
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    select jsonb_object_agg(key, jsonb_build_object('from', v_old -> key, 'to', v_new -> key))
      into v_diff
    from jsonb_each(v_new)
    where key not in ('updated_at')
      and v_new -> key is distinct from v_old -> key;

    if v_diff is null then
      return null;  -- nothing of substance changed
    end if;
    v_record_id := (v_new ->> 'id')::uuid;
  else
    v_action := 'delete';
    v_old := to_jsonb(old);
    v_diff := jsonb_build_object('old', v_old);
    v_record_id := (v_old ->> 'id')::uuid;
  end if;

  insert into public.audit_log (user_id, table_name, record_id, action, diff)
  values (auth.uid(), tg_table_name, v_record_id, v_action, v_diff);

  return null;
end;
$fn$;

create trigger creators_audit
  after insert or update or delete on public.creators
  for each row execute function public.tg_audit();

create trigger accounts_audit
  after insert or update or delete on public.accounts
  for each row execute function public.tg_audit();

create trigger rate_cards_audit
  after insert or update or delete on public.rate_cards
  for each row execute function public.tg_audit();

create trigger contacts_audit
  after insert or update or delete on public.contacts
  for each row execute function public.tg_audit();

create trigger metric_snapshots_audit
  after insert or update or delete on public.metric_snapshots
  for each row execute function public.tg_audit();

create trigger collaborations_audit
  after insert or update or delete on public.collaborations
  for each row execute function public.tg_audit();

create trigger brand_conflicts_audit
  after insert or update or delete on public.brand_conflicts
  for each row execute function public.tg_audit();

create trigger users_audit
  after insert or update or delete on public.users
  for each row execute function public.tg_audit();
