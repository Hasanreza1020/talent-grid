-- ---------------------------------------------------------------------------
-- Talent Grid: the flattened read model that browse, compare and the admin
-- data-health screens all query.
--
-- security_invoker is on, so every column obeys the caller's RLS. A viewer
-- sees a null cheapest_rate_bdt because rate_cards is closed to them, which is
-- the correct answer rather than a leak.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

create or replace view public.creator_directory
with (security_invoker = true) as
select
  c.id,
  c.slug,
  c.display_name,
  c.legal_name,
  c.bio_short,
  c.bio_long,
  c.portrait_url,
  c.cover_url,
  c.gender,
  c.city,
  c.country,
  c.primary_language,
  c.tier,
  c.primary_platform,
  c.status,
  c.accepts_barter,
  c.typical_turnaround_days,
  c.data_confidence,
  c.source,
  c.deleted_at,
  c.created_at,
  c.updated_at,

  primary_account.id            as primary_account_id,
  primary_account.handle        as primary_handle,
  primary_account.profile_url   as primary_profile_url,
  primary_metrics.followers     as primary_followers,
  primary_metrics.avg_views     as primary_avg_views,
  primary_metrics.avg_likes     as primary_avg_likes,
  primary_metrics.avg_comments  as primary_avg_comments,
  primary_metrics.avg_shares    as primary_avg_shares,
  primary_metrics.posts_last_30d as primary_posts_last_30d,
  primary_metrics.engagement_rate as primary_engagement_rate,
  primary_metrics.captured_on   as primary_captured_on,

  reach.total_reach,
  reach.account_count,
  reach.oldest_capture,

  cheapest.cheapest_rate_bdt,

  -- Inputs for growth and posting consistency, so the agency score can be
  -- computed for a list of creators without a query per row.
  previous_metrics.followers    as previous_followers,
  previous_metrics.captured_on  as previous_captured_on,
  samples.sample_count,
  samples.mean_views            as sample_mean_views,
  samples.sd_views              as sample_sd_views,
  ratings.rating_average,

  primary_category.category_id  as primary_category_id,
  primary_category.category_slug as primary_category_slug,
  primary_category.category_name as primary_category_name,
  primary_category.parent_id     as primary_category_parent_id,

  conflicts.open_conflict_count

from public.creators c

left join public.accounts primary_account
  on primary_account.creator_id = c.id and primary_account.is_primary

left join public.account_latest_metrics primary_metrics
  on primary_metrics.account_id = primary_account.id

-- Total reach stays null when no account has a follower count, because a
-- creator with no data recorded has not got a reach of zero.
left join lateral (
  select
    sum(lm.followers)   as total_reach,
    count(a.id)         as account_count,
    min(lm.captured_on) as oldest_capture
  from public.accounts a
  left join public.account_latest_metrics lm on lm.account_id = a.id
  where a.creator_id = c.id
) reach on true

left join lateral (
  select min(cr.price_bdt) as cheapest_rate_bdt
  from public.current_rate_cards cr
  where cr.creator_id = c.id
) cheapest on true

-- The snapshot closest to 30 days before the latest one, which is what the
-- 30-day growth figure is measured against.
left join lateral (
  select m.followers, m.captured_on
  from public.metric_snapshots m
  where m.account_id = primary_account.id
    and m.followers is not null
    and m.captured_on < primary_metrics.captured_on
  order by abs((primary_metrics.captured_on - m.captured_on) - 30)
  limit 1
) previous_metrics on true

left join lateral (
  select
    count(*)             as sample_count,
    avg(cs.views)        as mean_views,
    stddev_pop(cs.views) as sd_views
  from public.content_samples cs
  where cs.creator_id = c.id and cs.views is not null
) samples on true

-- Average of the three 1-to-5 rating dimensions across all notes. Returns
-- null for a viewer, whose RLS blocks internal_notes entirely; the agency
-- score then drops that component and renormalises, and the breakdown says so.
left join lateral (
  select avg(dimension.value) as rating_average
  from public.internal_notes n
  cross join lateral (values (n.professionalism), (n.responsiveness), (n.punctuality))
    as dimension(value)
  where n.creator_id = c.id and dimension.value is not null
) ratings on true

left join lateral (
  select cc.category_id, cat.slug as category_slug, cat.name as category_name, cat.parent_id
  from public.creator_categories cc
  join public.categories cat on cat.id = cc.category_id
  where cc.creator_id = c.id and cc.is_primary
  limit 1
) primary_category on true

left join lateral (
  select count(*) as open_conflict_count
  from public.brand_conflicts bc
  where bc.creator_id = c.id
    and bc.exclusive_until is not null
    and bc.exclusive_until >= current_date
) conflicts on true;

grant select on public.creator_directory to authenticated;
