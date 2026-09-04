-- The public showcase.
--
-- A second deployment of this codebase serves a read-only site on its own
-- domain with no sign-in. It reads through the two functions below and through
-- nothing else: no table is granted to `anon`, and these return a fixed shape
-- rather than a row, so widening what the public can see is an edit here and
-- cannot happen by accident in a component.
--
-- What is deliberately absent: rates, contacts, internal notes, engagement
-- rates, agency scores, audience profiles, brand conflicts, collaborations,
-- and anything about who is on the team. A competitor reading this endpoint
-- learns the roster exists and how big it is. They do not learn what anyone
-- charges or what we think of them.

-- ---------------------------------------------------------------------------
-- The roster
-- ---------------------------------------------------------------------------

create or replace function public.public_directory()
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(jsonb_agg(item order by reach desc nulls last, name), '[]'::jsonb)
  from (
    select
      c.display_name as name,
      coalesce(sum(m.followers), 0) as reach,
      jsonb_build_object(
        'slug', c.slug,
        'name', c.display_name,
        'portraitUrl', c.portrait_url,
        'city', c.city,
        'category', (
          select cat.name
          from public.creator_categories cc
          join public.categories cat on cat.id = cc.category_id
          where cc.creator_id = c.id and cc.is_primary
          limit 1
        ),
        'categorySlug', (
          select cat.slug
          from public.creator_categories cc
          join public.categories cat on cat.id = cc.category_id
          where cc.creator_id = c.id and cc.is_primary
          limit 1
        ),
        'totalReach', nullif(coalesce(sum(m.followers), 0), 0),
        'platforms', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object('platform', a2.platform, 'followers', m2.followers)
              order by a2.platform
            )
            from public.accounts a2
            left join lateral (
              select s.followers
              from public.metric_snapshots s
              where s.account_id = a2.id
              order by s.captured_on desc
              limit 1
            ) m2 on true
            where a2.creator_id = c.id
          ),
          '[]'::jsonb
        )
      ) as item
    from public.creators c
    left join public.accounts a on a.creator_id = c.id
    left join lateral (
      select s.followers
      from public.metric_snapshots s
      where s.account_id = a.id
      order by s.captured_on desc
      limit 1
    ) m on true
    where c.deleted_at is null and c.status = 'active'
    group by c.id, c.display_name, c.slug, c.portrait_url, c.city
  ) rows;
$fn$;

-- ---------------------------------------------------------------------------
-- One creator
-- ---------------------------------------------------------------------------

create or replace function public.public_creator(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(
    (
      select jsonb_build_object(
        'slug', c.slug,
        'name', c.display_name,
        'portraitUrl', c.portrait_url,
        'city', c.city,
        'bio', c.bio_short,
        'category', (
          select cat.name
          from public.creator_categories cc
          join public.categories cat on cat.id = cc.category_id
          where cc.creator_id = c.id and cc.is_primary
          limit 1
        ),
        'platforms', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'platform', a.platform,
                'handle', a.handle,
                'url', a.profile_url,
                'followers', (
                  select s.followers
                  from public.metric_snapshots s
                  where s.account_id = a.id
                  order by s.captured_on desc
                  limit 1
                )
              )
              order by a.platform
            )
            from public.accounts a
            where a.creator_id = c.id
          ),
          '[]'::jsonb
        )
      )
      from public.creators c
      where c.slug = p_slug and c.deleted_at is null and c.status = 'active'
    ),
    'null'::jsonb
  );
$fn$;

-- ---------------------------------------------------------------------------
-- Categories, with counts
-- ---------------------------------------------------------------------------

create or replace function public.public_categories()
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(jsonb_agg(item order by creators desc), '[]'::jsonb)
  from (
    select
      count(distinct c.id) as creators,
      jsonb_build_object(
        'slug', cat.slug,
        'name', cat.name,
        'creatorCount', count(distinct c.id)
      ) as item
    from public.categories cat
    join public.creator_categories cc on cc.category_id = cat.id
    join public.creators c
      on c.id = cc.creator_id and c.deleted_at is null and c.status = 'active'
    where cat.parent_id is null
    group by cat.id, cat.slug, cat.name
    having count(distinct c.id) > 0
  ) rows;
$fn$;

-- Execute only. No table is reachable by the anonymous role; these three
-- functions are the entire public surface.
grant execute on function public.public_directory() to anon, authenticated;
grant execute on function public.public_creator(text) to anon, authenticated;
grant execute on function public.public_categories() to anon, authenticated;
