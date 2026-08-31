-- ---------------------------------------------------------------------------
-- Talent Grid: category seed.
--
-- Travel is fully specified because it is the first category being imported.
-- The other parents are created as empty shells for later use.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

insert into public.categories (name, slug, parent_id)
values ('Travel', 'travel', null)
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id)
select v.name, v.slug, (select id from public.categories where slug = 'travel')
from (values
  ('Solo travel',        'solo-travel'),
  ('Luxury travel',      'luxury-travel'),
  ('Budget backpacking', 'budget-backpacking'),
  ('Motovlog',           'motovlog'),
  ('Family travel',      'family-travel'),
  ('Food and travel',    'food-and-travel')
) as v(name, slug)
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id)
select v.name, v.slug, null
from (values
  ('Fashion',    'fashion'),
  ('Beauty',     'beauty'),
  ('Food',       'food'),
  ('Tech',       'tech'),
  ('Fitness',    'fitness'),
  ('Lifestyle',  'lifestyle'),
  ('Comedy',     'comedy'),
  ('Education',  'education'),
  ('Parenting',  'parenting'),
  ('Automotive', 'automotive'),
  -- Not in the original spec seed, but the agency's image folders include a
  -- Sports set, so the category exists rather than being invented at import.
  ('Sports',     'sports')
) as v(name, slug)
on conflict (slug) do nothing;
