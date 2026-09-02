-- Every strategiser run, kept for two reasons: the daily cap is counted from
-- it, and the accumulated briefs are the only record of what clients actually
-- ask for, which is what the prompts will be tuned against.
--
-- The brief is stored as written. It is business copy, not personal data, but
-- it is the one place a client's plans are recorded, so it is readable only by
-- its author and by an admin.

create table public.strategiser_runs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  brief             jsonb not null,
  parsed_brief      jsonb,
  -- The pool the model was allowed to choose from, and what it chose. Kept as
  -- ids: the creator rows themselves are already in the database.
  pool_ids          uuid[] not null default '{}',
  selected_ids      uuid[] not null default '{}',
  -- Ids the model returned that were not in the pool. Should always be empty;
  -- anything here is a hallucination that the reconciler caught.
  invalid_ids       text[] not null default '{}',
  strategy_summary  text,
  tradeoff_note     text,
  -- True when the model was unavailable and a plain ranking was shown instead.
  degraded          boolean not null default false,
  created_at        timestamptz not null default now()
);

create index strategiser_runs_user_created_idx
  on public.strategiser_runs (user_id, created_at desc);

alter table public.strategiser_runs enable row level security;

-- Authors read their own runs. Admins read all of them, because the tuning
-- dataset is only useful whole.
create policy strategiser_runs_select on public.strategiser_runs
  for select to authenticated
  using (user_id = auth.uid() or public.tg_is_admin());

create policy strategiser_runs_insert on public.strategiser_runs
  for insert to authenticated
  with check (user_id = auth.uid());

-- A run is a record of something that happened. Nothing edits or deletes one.
