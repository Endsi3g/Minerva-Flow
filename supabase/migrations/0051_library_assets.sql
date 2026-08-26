-- The Library page ("Documents") let staff pick a file, showed an "upload in
-- progress" spinner, then only ever held the result in React state — the
-- file itself was never sent anywhere, and the entry vanished on refresh.
-- This adds a real table + storage bucket so an upload is actually
-- persisted, following the exact chat_attachments/chat-attachments pattern
-- (0002_chat_and_referrals.sql).

create table library_assets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  storage_path text not null, -- "{restaurantId}/{uuid}-{filename}" in the library-assets bucket
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_library_assets_restaurant on library_assets (restaurant_id, created_at desc);

alter table library_assets enable row level security;

create policy "library_assets_select" on library_assets for select
  using (is_restaurant_member(restaurant_id));
create policy "library_assets_insert" on library_assets for insert
  with check (is_restaurant_member(restaurant_id));
create policy "library_assets_delete" on library_assets for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ── storage: library assets (private, same shape as chat-attachments) ─────
insert into storage.buckets (id, name, public)
values ('library-assets', 'library-assets', false)
on conflict (id) do nothing;

create policy "library_assets_bucket_read" on storage.objects for select
  using (bucket_id = 'library-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid));
create policy "library_assets_bucket_write" on storage.objects for insert
  with check (bucket_id = 'library-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid));
create policy "library_assets_bucket_delete" on storage.objects for delete
  using (bucket_id = 'library-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[]));
