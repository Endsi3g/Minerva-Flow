-- Storage for the workspace brand logo (0094), one folder per workspace —
-- same public-bucket-with-folder-scoped-write pattern as offer-images
-- (0012_offers.sql), using is_workspace_member instead of
-- is_restaurant_member since this is workspace-scoped, not restaurant-scoped.

begin;

insert into storage.buckets (id, name, public)
values ('workspace-logos', 'workspace-logos', true)
on conflict (id) do nothing;

create policy "workspace_logos_public_read" on storage.objects for select
  using (bucket_id = 'workspace-logos');

create policy "workspace_logos_manage_write" on storage.objects for insert
  with check (
    bucket_id = 'workspace-logos'
    and is_workspace_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );

create policy "workspace_logos_manage_delete" on storage.objects for delete
  using (
    bucket_id = 'workspace-logos'
    and is_workspace_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );

commit;
