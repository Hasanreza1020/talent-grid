-- ---------------------------------------------------------------------------
-- Talent Grid: the creator-media bucket for portraits and content thumbnails.
--
-- Originals are stored in colour. The black-and-white treatment is a CSS
-- filter at render time and is never baked into the stored file.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-media',
  'creator-media',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The bucket is public for reads so that portraits render on the tokenised
-- client share page without a signed URL round trip. Nothing sensitive lives
-- here: portraits and content thumbnails only.
create policy "creator_media_public_read"
  on storage.objects for select
  using (bucket_id = 'creator-media');

create policy "creator_media_editor_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'creator-media' and public.tg_is_editor());

create policy "creator_media_editor_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'creator-media' and public.tg_is_editor())
  with check (bucket_id = 'creator-media' and public.tg_is_editor());

create policy "creator_media_editor_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'creator-media' and public.tg_is_editor());
