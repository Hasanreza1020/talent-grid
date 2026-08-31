-- ---------------------------------------------------------------------------
-- Talent Grid: row level security.
--
-- viewer  read creators, accounts, metric_snapshots, categories, tags,
--         content_samples, audience_profiles. No read on contacts, rate_cards,
--         internal_notes, or collaborations.fee_bdt.
-- editor  full read; insert and update everywhere except users and audit_log.
-- admin   everything, plus user management and hard operations.
-- anon    nothing. The single public surface is a tokenised shortlist, served
--         by a SECURITY DEFINER function rather than by any table policy.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

alter table public.users              enable row level security;
alter table public.creators           enable row level security;
alter table public.categories         enable row level security;
alter table public.creator_categories enable row level security;
alter table public.tags               enable row level security;
alter table public.creator_tags       enable row level security;
alter table public.accounts           enable row level security;
alter table public.metric_snapshots   enable row level security;
alter table public.audience_profiles  enable row level security;
alter table public.rate_cards         enable row level security;
alter table public.contacts           enable row level security;
alter table public.collaborations     enable row level security;
alter table public.brand_conflicts    enable row level security;
alter table public.content_samples    enable row level security;
alter table public.internal_notes     enable row level security;
alter table public.shortlists         enable row level security;
alter table public.shortlist_items    enable row level security;
alter table public.audit_log          enable row level security;

-- users ---------------------------------------------------------------------

create policy users_read_self_or_admin on public.users
  for select to authenticated
  using (id = auth.uid() or public.tg_is_admin());

create policy users_update_own_name on public.users
  for update to authenticated
  using (id = auth.uid())
  -- Role escalation is blocked: a user may edit their own row only while the
  -- role stays what it already is.
  with check (id = auth.uid() and role = public.tg_role());

create policy users_admin_write on public.users
  for all to authenticated
  using (public.tg_is_admin())
  with check (public.tg_is_admin());

-- creators ------------------------------------------------------------------

create policy creators_read on public.creators
  for select to authenticated
  using (deleted_at is null or public.tg_is_editor());

create policy creators_insert on public.creators
  for insert to authenticated
  with check (public.tg_is_editor());

create policy creators_update on public.creators
  for update to authenticated
  using (public.tg_is_editor())
  with check (public.tg_is_editor());

-- Deliberately no delete policy: creators are archived with deleted_at.
revoke delete on public.creators from authenticated;

-- Reference data readable by every signed-in role -----------------------------

create policy categories_read on public.categories
  for select to authenticated using (true);
create policy categories_write on public.categories
  for all to authenticated using (public.tg_is_editor()) with check (public.tg_is_editor());

create policy creator_categories_read on public.creator_categories
  for select to authenticated using (true);
create policy creator_categories_write on public.creator_categories
  for all to authenticated using (public.tg_is_editor()) with check (public.tg_is_editor());

create policy tags_read on public.tags
  for select to authenticated using (true);
create policy tags_write on public.tags
  for all to authenticated using (public.tg_is_editor()) with check (public.tg_is_editor());

create policy creator_tags_read on public.creator_tags
  for select to authenticated using (true);
create policy creator_tags_write on public.creator_tags
  for all to authenticated using (public.tg_is_editor()) with check (public.tg_is_editor());

create policy accounts_read on public.accounts
  for select to authenticated using (true);
create policy accounts_write on public.accounts
  for all to authenticated using (public.tg_is_editor()) with check (public.tg_is_editor());

create policy audience_profiles_read on public.audience_profiles
  for select to authenticated using (true);
create policy audience_profiles_write on public.audience_profiles
  for all to authenticated using (public.tg_is_editor()) with check (public.tg_is_editor());

create policy content_samples_read on public.content_samples
  for select to authenticated using (true);
create policy content_samples_write on public.content_samples
  for all to authenticated using (public.tg_is_editor()) with check (public.tg_is_editor());

-- Conflicts drive a warning banner every role needs to see before pitching.
create policy brand_conflicts_read on public.brand_conflicts
  for select to authenticated using (true);
create policy brand_conflicts_write on public.brand_conflicts
  for all to authenticated using (public.tg_is_editor()) with check (public.tg_is_editor());

-- metric_snapshots ----------------------------------------------------------

create policy metric_snapshots_read on public.metric_snapshots
  for select to authenticated using (true);

create policy metric_snapshots_insert on public.metric_snapshots
  for insert to authenticated with check (public.tg_is_editor());

-- The table is append-only in normal operation. Editing a past snapshot is a
-- correction, not a routine update, so it is reserved for admins.
create policy metric_snapshots_admin_update on public.metric_snapshots
  for update to authenticated
  using (public.tg_is_admin()) with check (public.tg_is_admin());

create policy metric_snapshots_admin_delete on public.metric_snapshots
  for delete to authenticated using (public.tg_is_admin());

-- Commercially sensitive: editor and admin only ------------------------------

create policy rate_cards_editor_all on public.rate_cards
  for all to authenticated
  using (public.tg_is_editor()) with check (public.tg_is_editor());

create policy contacts_editor_all on public.contacts
  for all to authenticated
  using (public.tg_is_editor()) with check (public.tg_is_editor());

create policy internal_notes_editor_all on public.internal_notes
  for all to authenticated
  using (public.tg_is_editor()) with check (public.tg_is_editor());

-- Viewers reach collaboration history through collaborations_readable, which
-- masks fee_bdt. The base table stays editor-only.
create policy collaborations_editor_all on public.collaborations
  for all to authenticated
  using (public.tg_is_editor()) with check (public.tg_is_editor());

grant select on public.collaborations_readable to authenticated;
revoke all on public.collaborations_readable from anon;

-- shortlists ----------------------------------------------------------------

create policy shortlists_read on public.shortlists
  for select to authenticated using (true);

create policy shortlists_insert on public.shortlists
  for insert to authenticated with check (created_by = auth.uid());

create policy shortlists_update on public.shortlists
  for update to authenticated
  using (created_by = auth.uid() or public.tg_is_editor())
  with check (created_by = auth.uid() or public.tg_is_editor());

create policy shortlists_delete on public.shortlists
  for delete to authenticated
  using (created_by = auth.uid() or public.tg_is_admin());

create policy shortlist_items_read on public.shortlist_items
  for select to authenticated using (true);

create policy shortlist_items_write on public.shortlist_items
  for all to authenticated
  using (
    exists (
      select 1 from public.shortlists s
      where s.id = shortlist_id
        and (s.created_by = auth.uid() or public.tg_is_editor())
    )
  )
  with check (
    exists (
      select 1 from public.shortlists s
      where s.id = shortlist_id
        and (s.created_by = auth.uid() or public.tg_is_editor())
    )
  );

-- audit_log -----------------------------------------------------------------

create policy audit_log_admin_read on public.audit_log
  for select to authenticated using (public.tg_is_admin());

-- Rows are written by the SECURITY DEFINER audit trigger, never by a client.
revoke insert, update, delete on public.audit_log from authenticated;

-- Public share surface -------------------------------------------------------

-- The only thing the anonymous role can do. Returns the shortlist and its
-- creators, includes rates only when the shortlist allows it, and never
-- returns internal notes, contacts or agency score.
create or replace function public.get_shared_shortlist(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_shortlist public.shortlists;
  v_creators  jsonb;
begin
  select * into v_shortlist
  from public.shortlists
  where share_token = p_token;

  if v_shortlist.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_shortlist.share_expires_at is not null
     and v_shortlist.share_expires_at < now() then
    return jsonb_build_object(
      'status', 'expired',
      'expiredAt', v_shortlist.share_expires_at
    );
  end if;

  select coalesce(jsonb_agg(item order by sort_position, sort_name), '[]'::jsonb)
    into v_creators
  from (
    select
      si.position as sort_position,
      c.display_name as sort_name,
      jsonb_build_object(
      'position', si.position,
      'pitchNote', si.pitch_note,
      'slug', c.slug,
      'displayName', c.display_name,
      'bioShort', c.bio_short,
      'portraitUrl', c.portrait_url,
      'city', c.city,
      'tier', c.tier,
      'primaryPlatform', c.primary_platform,
      'categories', (
        select coalesce(jsonb_agg(cat.name order by cc.is_primary desc, cat.name), '[]'::jsonb)
        from public.creator_categories cc
        join public.categories cat on cat.id = cc.category_id
        where cc.creator_id = c.id
      ),
      'accounts', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'platform', a.platform,
          'handle', a.handle,
          'profileUrl', a.profile_url,
          'followers', lm.followers,
          'engagementRate', lm.engagement_rate,
          'isPrimary', a.is_primary
        ) order by a.is_primary desc, a.platform), '[]'::jsonb)
        from public.accounts a
        left join public.account_latest_metrics lm on lm.account_id = a.id
        where a.creator_id = c.id
      ),
      'rates', case
        when v_shortlist.include_rates_in_share then (
          select coalesce(jsonb_agg(jsonb_build_object(
            'platform', cr.platform,
            'deliverable', cr.deliverable,
            'priceBdt', cr.price_bdt,
            'negotiable', cr.negotiable
          ) order by cr.price_bdt), '[]'::jsonb)
          from public.current_rate_cards cr
          where cr.creator_id = c.id
        )
        else null
      end
    ) as item
    from public.shortlist_items si
    join public.creators c on c.id = si.creator_id
    where si.shortlist_id = v_shortlist.id
      and c.deleted_at is null
  ) shared_rows;

  return jsonb_build_object(
    'status', 'ok',
    'shortlist', jsonb_build_object(
      'name', v_shortlist.name,
      'clientName', v_shortlist.client_name,
      'briefNotes', v_shortlist.brief_notes,
      'includeRates', v_shortlist.include_rates_in_share,
      'expiresAt', v_shortlist.share_expires_at
    ),
    'creators', v_creators
  );
end;
$fn$;

revoke all on function public.get_shared_shortlist(text) from public;
grant execute on function public.get_shared_shortlist(text) to anon, authenticated;
