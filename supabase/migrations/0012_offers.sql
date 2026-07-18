-- Minerva Flow — client-facing offers (Phase 2: QR/mode client)
-- A lightweight, customer-facing promotions table — deliberately separate
-- from campaigns/revenue_programs (staff-only internal tracking with
-- cost/ROI/confidence fields that have no business being shown to a
-- customer). Public reads go through the admin client from the /m/[token]
-- flow, exactly like menu_items already does — the RLS below only gates
-- the staff management UI.

create table offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_offers_restaurant on offers (restaurant_id, created_at desc);

alter table offers enable row level security;

create policy "offers_select" on offers for select
  using (is_restaurant_member(restaurant_id));
create policy "offers_insert" on offers for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "offers_update" on offers for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "offers_delete" on offers for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ── storage: offer images (public, one folder per restaurant) ───────────
insert into storage.buckets (id, name, public)
values ('offer-images', 'offer-images', true)
on conflict (id) do nothing;

create policy "offer_images_public_read" on storage.objects for select
  using (bucket_id = 'offer-images');
create policy "offer_images_manage_write" on storage.objects for insert
  with check (
    bucket_id = 'offer-images'
    and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );
create policy "offer_images_manage_delete" on storage.objects for delete
  using (
    bucket_id = 'offer-images'
    and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );
