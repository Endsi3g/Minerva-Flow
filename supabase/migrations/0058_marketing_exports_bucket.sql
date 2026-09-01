-- Public storage bucket for Marketing Studio exports that need to be
-- reachable by a third party over plain HTTP — specifically Instagram's
-- Content Publishing API, whose /media endpoint fetches image_url itself
-- rather than accepting a direct upload. Objects are stored under
-- {restaurant_id}/... same folder-scoping convention as library-assets
-- (0051), but public:true (like changelog-images, 0041) since Meta's
-- servers have no Supabase session to authenticate with.
insert into storage.buckets (id, name, public)
values ('marketing-exports', 'marketing-exports', true)
on conflict (id) do nothing;

create policy "marketing_exports_public_read" on storage.objects for select
  using (bucket_id = 'marketing-exports');
create policy "marketing_exports_write" on storage.objects for insert
  with check (
    bucket_id = 'marketing-exports'
    and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );
create policy "marketing_exports_delete" on storage.objects for delete
  using (
    bucket_id = 'marketing-exports'
    and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );
