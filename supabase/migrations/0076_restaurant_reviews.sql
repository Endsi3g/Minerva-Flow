-- Phase 5 of the reviewed feedback batch: restaurant-level reviews, not
-- just per-menu-item ones (menu_item_reviews, 0069). A customer tapping
-- into a restaurant's own profile page had no way to rate or read about
-- the place as a whole — same "avis Google Maps" expectation as the
-- per-dish reviews, but for the overall experience. One review per
-- customer per restaurant (unique constraint), up to 6 photos per review
-- (checked, not just a UI-side limit). Reads are public for the same
-- reason menu_item_reviews' are: someone deciding whether to visit a
-- restaurant they've never been to needs to see its rating before joining.

begin;

create table if not exists restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (restaurant_id, customer_id),
  constraint restaurant_reviews_max_six_images check (
    image_urls is null or array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 6
  )
);

create index if not exists idx_restaurant_reviews_restaurant on restaurant_reviews (restaurant_id);

alter table restaurant_reviews enable row level security;

drop policy if exists "restaurant_reviews_public_select" on restaurant_reviews;
create policy "restaurant_reviews_public_select" on restaurant_reviews for select
  using (true);

drop policy if exists "restaurant_reviews_customer_insert" on restaurant_reviews;
create policy "restaurant_reviews_customer_insert" on restaurant_reviews for insert
  with check (
    exists (
      select 1 from customers c
      where c.id = restaurant_reviews.customer_id
        and c.restaurant_id = restaurant_reviews.restaurant_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "restaurant_reviews_customer_update" on restaurant_reviews;
create policy "restaurant_reviews_customer_update" on restaurant_reviews for update
  using (
    exists (select 1 from customers c where c.id = restaurant_reviews.customer_id and c.user_id = auth.uid())
  );

drop policy if exists "restaurant_reviews_customer_delete" on restaurant_reviews;
create policy "restaurant_reviews_customer_delete" on restaurant_reviews for delete
  using (
    exists (select 1 from customers c where c.id = restaurant_reviews.customer_id and c.user_id = auth.uid())
  );

-- ── storage: review photos ───────────────────────────────────────────────
-- Same per-auth.uid()-folder pattern as the existing "avatars" bucket
-- (0001_init.sql) — a customer uploads under their own folder, publicly
-- readable once attached to a review.
insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

create policy "review_images_public_read" on storage.objects for select
  using (bucket_id = 'review-images');
create policy "review_images_owner_write" on storage.objects for insert
  with check (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "review_images_owner_delete" on storage.objects for delete
  using (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
