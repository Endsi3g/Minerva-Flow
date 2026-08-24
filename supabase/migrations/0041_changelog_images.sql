-- Changelog entries get an optional screenshot — a picture of the actual
-- feature reads faster than another bullet point, especially for owners
-- who don't want to read a wall of release notes.
alter table changelog_entries add column if not exists image_url text;

-- ── storage: changelog screenshots (bucket public, patron "menu-item-images") ──
insert into storage.buckets (id, name, public)
values ('changelog-images', 'changelog-images', true)
on conflict (id) do nothing;

drop policy if exists "changelog_images_public_read" on storage.objects;
create policy "changelog_images_public_read" on storage.objects for select
  using (bucket_id = 'changelog-images');
drop policy if exists "changelog_images_write" on storage.objects;
create policy "changelog_images_write" on storage.objects for insert
  with check (bucket_id = 'changelog-images' and is_platform_admin());
drop policy if exists "changelog_images_delete" on storage.objects;
create policy "changelog_images_delete" on storage.objects for delete
  using (bucket_id = 'changelog-images' and is_platform_admin());
