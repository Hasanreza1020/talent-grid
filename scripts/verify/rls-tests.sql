-- Role and behaviour tests, run against the container built by
-- scripts/verify/run.sh. Every check raises on failure, so a clean run means
-- every assertion passed.

set search_path = public, extensions;

-- Fixtures -------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'editor@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'viewer@example.test')
on conflict do nothing;

update public.users set role = 'admin'  where id = '00000000-0000-0000-0000-0000000000a1';
update public.users set role = 'editor' where id = '00000000-0000-0000-0000-0000000000e1';
-- the third stays at the default role, which is viewer

insert into public.creators (id, slug, display_name, source, data_confidence)
values ('00000000-0000-0000-0000-00000000c001', 'test-creator', 'Test Creator', 'manual', 'verified');

insert into public.accounts (id, creator_id, platform, handle, profile_url)
values
  ('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-00000000c001',
   'facebook', 'testcreator', 'https://www.facebook.com/testcreator'),
  ('00000000-0000-0000-0000-00000000ac02', '00000000-0000-0000-0000-00000000c001',
   'youtube', 'testcreator', 'https://www.youtube.com/@testcreator');

insert into public.metric_snapshots (account_id, captured_on, followers, source)
values
  ('00000000-0000-0000-0000-00000000ac01', date '2026-08-01', 120000, 'legacy_import'),
  ('00000000-0000-0000-0000-00000000ac02', date '2026-08-01', 900000, 'legacy_import');

insert into public.contacts (creator_id, phone) values
  ('00000000-0000-0000-0000-00000000c001', '+8801700000000');

insert into public.rate_cards (creator_id, platform, deliverable, price_bdt, effective_from)
values ('00000000-0000-0000-0000-00000000c001', 'youtube', 'long_video', 45000, date '2026-01-01');

insert into public.internal_notes (creator_id, body, professionalism)
values ('00000000-0000-0000-0000-00000000c001', 'Responsive on WhatsApp.', 4);

insert into public.collaborations (creator_id, client_name, fee_bdt)
values ('00000000-0000-0000-0000-00000000c001', 'Test Client', 60000);

-- Assertion helper -----------------------------------------------------------

create or replace function pg_temp.assert_eq(
  p_actual anyelement, p_expected anyelement, p_label text
) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL: % (expected %, got %)', p_label, p_expected, p_actual;
  end if;
  raise notice 'pass: %', p_label;
end;
$$;

-- Derived fields -------------------------------------------------------------

do $$
declare v_tier public.tier; v_platform public.platform; v_primary_count integer;
begin
  select tier, primary_platform into v_tier, v_platform
  from public.creators where id = '00000000-0000-0000-0000-00000000c001';

  perform pg_temp.assert_eq(v_tier::text, 'macro',
    'tier is computed from the highest follower count (900k is macro)');
  perform pg_temp.assert_eq(v_platform::text, 'youtube',
    'primary_platform is the account with the most followers');

  select count(*) into v_primary_count
  from public.accounts
  where creator_id = '00000000-0000-0000-0000-00000000c001' and is_primary;
  perform pg_temp.assert_eq(v_primary_count, 1, 'exactly one account is marked primary');
end
$$;

-- A newer snapshot moves the creator between tiers without any manual update.
insert into public.metric_snapshots (account_id, captured_on, followers, source)
values ('00000000-0000-0000-0000-00000000ac01', date '2026-08-20', 1500000, 'manual');

do $$
declare v_tier public.tier; v_platform public.platform;
begin
  select tier, primary_platform into v_tier, v_platform
  from public.creators where id = '00000000-0000-0000-0000-00000000c001';
  perform pg_temp.assert_eq(v_tier::text, 'mega',
    'a new snapshot recomputes tier to mega');
  perform pg_temp.assert_eq(v_platform::text, 'facebook',
    'primary_platform follows the new highest follower count');
end
$$;

-- Snapshots are append-only in the sense that matters: dates cannot move.
do $$
declare v_failed boolean := false;
begin
  begin
    update public.metric_snapshots set captured_on = date '2026-07-01'
    where account_id = '00000000-0000-0000-0000-00000000ac01'
      and captured_on = date '2026-08-20';
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.assert_eq(v_failed, true, 'moving a snapshot date is refused');
end
$$;

-- Viewer ---------------------------------------------------------------------

do $$
declare
  v_contacts integer; v_rates integer; v_notes integer;
  v_creators integer; v_snapshots integer; v_fee integer; v_visible boolean;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);

  select count(*) into v_contacts   from public.contacts;
  select count(*) into v_rates      from public.rate_cards;
  select count(*) into v_notes      from public.internal_notes;
  select count(*) into v_creators   from public.creators;
  select count(*) into v_snapshots  from public.metric_snapshots;
  select fee_bdt, fee_visible into v_fee, v_visible from public.collaborations_readable limit 1;

  reset role;

  perform pg_temp.assert_eq(v_contacts, 0, 'RLS blocks a viewer from reading contacts');
  perform pg_temp.assert_eq(v_rates, 0, 'RLS blocks a viewer from reading rate_cards');
  perform pg_temp.assert_eq(v_notes, 0, 'RLS blocks a viewer from reading internal_notes');
  perform pg_temp.assert_eq(v_creators, 1, 'a viewer can read creators');
  perform pg_temp.assert_eq(v_snapshots, 3, 'a viewer can read metric_snapshots');
  perform pg_temp.assert_eq(v_fee, null::integer, 'a viewer sees no collaboration fee');
  perform pg_temp.assert_eq(v_visible, false, 'fee_visible tells the UI the fee is withheld');
end
$$;

-- A viewer cannot write, and cannot promote themselves.
do $$
declare v_insert_failed boolean := false; v_escalation_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);

  begin
    insert into public.creators (slug, display_name) values ('sneaky', 'Sneaky');
  exception when others then v_insert_failed := true;
  end;

  begin
    update public.users set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b1';
    if not found then v_escalation_failed := true; end if;
  exception when others then v_escalation_failed := true;
  end;

  reset role;

  perform pg_temp.assert_eq(v_insert_failed, true, 'a viewer cannot insert a creator');
  perform pg_temp.assert_eq(v_escalation_failed, true, 'a viewer cannot promote themselves to admin');
end
$$;

-- Editor ---------------------------------------------------------------------

do $$
declare v_contacts integer; v_rates integer; v_fee integer; v_delete_failed boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);

  select count(*) into v_contacts from public.contacts;
  select count(*) into v_rates from public.rate_cards;
  select fee_bdt into v_fee from public.collaborations_readable limit 1;

  begin
    delete from public.creators where id = '00000000-0000-0000-0000-00000000c001';
  exception when others then v_delete_failed := true;
  end;

  reset role;

  perform pg_temp.assert_eq(v_contacts, 1, 'an editor can read contacts');
  perform pg_temp.assert_eq(v_rates, 1, 'an editor can read rate_cards');
  perform pg_temp.assert_eq(v_fee, 60000, 'an editor sees the collaboration fee');
  perform pg_temp.assert_eq(v_delete_failed, true, 'nobody can hard-delete a creator');
end
$$;

-- Featured content samples cap ----------------------------------------------

do $$
declare v_failed boolean := false;
begin
  insert into public.content_samples (creator_id, url, is_featured) values
    ('00000000-0000-0000-0000-00000000c001', 'https://example.test/1', true),
    ('00000000-0000-0000-0000-00000000c001', 'https://example.test/2', true),
    ('00000000-0000-0000-0000-00000000c001', 'https://example.test/3', true);
  begin
    insert into public.content_samples (creator_id, url, is_featured)
    values ('00000000-0000-0000-0000-00000000c001', 'https://example.test/4', true);
  exception when others then v_failed := true;
  end;
  perform pg_temp.assert_eq(v_failed, true, 'a fourth featured sample is refused');
end
$$;

-- Public share surface -------------------------------------------------------

insert into public.shortlists (id, name, share_token, include_rates_in_share, created_by)
values ('00000000-0000-0000-0000-0000000051a1', 'Ramadan brief', 'tok-live', false,
        '00000000-0000-0000-0000-0000000000e1');

insert into public.shortlists (id, name, share_token, share_expires_at, created_by)
values ('00000000-0000-0000-0000-0000000051a2', 'Old brief', 'tok-expired',
        now() - interval '2 days', '00000000-0000-0000-0000-0000000000e1');

insert into public.shortlist_items (shortlist_id, creator_id, position)
values ('00000000-0000-0000-0000-0000000051a1', '00000000-0000-0000-0000-00000000c001', 0);

do $$
declare v_result jsonb; v_creator_count integer; v_tables integer;
begin
  set local role anon;

  v_result := public.get_shared_shortlist('tok-live');
  perform pg_temp.assert_eq(v_result ->> 'status', 'ok', 'anon can open a live share token');
  v_creator_count := jsonb_array_length(v_result -> 'creators');
  perform pg_temp.assert_eq(v_creator_count, 1, 'the share returns the shortlisted creator');
  perform pg_temp.assert_eq(
    (v_result -> 'creators' -> 0 -> 'rates')::text, 'null',
    'rates are withheld when include_rates_in_share is false');
  perform pg_temp.assert_eq(
    (v_result -> 'creators' -> 0 ? 'internalNotes'), false,
    'the share payload has no internal notes');
  perform pg_temp.assert_eq(
    (v_result -> 'creators' -> 0 ? 'agencyScore'), false,
    'the share payload has no agency score');

  v_result := public.get_shared_shortlist('tok-expired');
  perform pg_temp.assert_eq(v_result ->> 'status', 'expired', 'an expired token reports expiry');

  v_result := public.get_shared_shortlist('tok-nonsense');
  perform pg_temp.assert_eq(v_result ->> 'status', 'not_found', 'an unknown token is not found');

  -- anon must reach nothing else at all
  select count(*) into v_tables from public.creators;
  perform pg_temp.assert_eq(v_tables, 0, 'anon cannot read the creators table directly');

  reset role;
end
$$;

-- Rates are included when the shortlist allows it ----------------------------

update public.shortlists set include_rates_in_share = true
where share_token = 'tok-live';

do $$
declare v_result jsonb;
begin
  set local role anon;
  v_result := public.get_shared_shortlist('tok-live');
  perform pg_temp.assert_eq(
    jsonb_array_length(v_result -> 'creators' -> 0 -> 'rates'), 1,
    'rates appear when include_rates_in_share is true');
  reset role;
end
$$;

-- Audit log ------------------------------------------------------------------

do $$
declare v_count integer; v_anon_reads integer;
begin
  select count(*) into v_count from public.audit_log
  where table_name = 'creators' and action = 'insert';
  perform pg_temp.assert_eq(v_count, 1, 'creator inserts are audited');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  select count(*) into v_anon_reads from public.audit_log;
  reset role;
  perform pg_temp.assert_eq(v_anon_reads, 0, 'a viewer cannot read the audit log');
end
$$;

select 'ALL RLS AND BEHAVIOUR TESTS PASSED' as result;
