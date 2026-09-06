-- Three independent additions for the native app's deeper menu/discovery
-- work:
--   1. menu_items.image_urls — a real photo carousel needs more than the
--      single legacy image_url.
--   2. menu_item_reviews — a Google-Maps-style rating/review system.
--      Reads are public (not gated behind is_restaurant_member or an
--      existing customer relationship) because the entire point is
--      letting someone who has NEVER visited a restaurant see its rating
--      before deciding to go — same as Google Maps reviews. Writes are
--      restricted to someone who is actually a loyalty customer of that
--      restaurant (has a customers row there), so reviews stay tied to
--      real patrons, not anonymous drive-bys.
--   3. device_push_tokens — APNs device token registry, one row per
--      (user, device). Written only by the owning user; read only by the
--      admin client (server-side, when actually sending a push) — no
--      SELECT policy needed for anon/authenticated since nothing in the
--      client ever needs to read another device's token, or even its own.

begin;

alter table menu_items
  add column if not exists image_urls text[] not null default '{}';

create table if not exists menu_item_reviews (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (menu_item_id, customer_id)
);

create index if not exists idx_menu_item_reviews_item on menu_item_reviews (menu_item_id);
create index if not exists idx_menu_item_reviews_restaurant on menu_item_reviews (restaurant_id);

alter table menu_item_reviews enable row level security;

drop policy if exists "menu_item_reviews_public_select" on menu_item_reviews;
create policy "menu_item_reviews_public_select" on menu_item_reviews for select
  using (true);

drop policy if exists "menu_item_reviews_customer_insert" on menu_item_reviews;
create policy "menu_item_reviews_customer_insert" on menu_item_reviews for insert
  with check (
    exists (
      select 1 from customers c
      where c.id = menu_item_reviews.customer_id
        and c.restaurant_id = menu_item_reviews.restaurant_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "menu_item_reviews_customer_update" on menu_item_reviews;
create policy "menu_item_reviews_customer_update" on menu_item_reviews for update
  using (
    exists (select 1 from customers c where c.id = menu_item_reviews.customer_id and c.user_id = auth.uid())
  );

drop policy if exists "menu_item_reviews_customer_delete" on menu_item_reviews;
create policy "menu_item_reviews_customer_delete" on menu_item_reviews for delete
  using (
    exists (select 1 from customers c where c.id = menu_item_reviews.customer_id and c.user_id = auth.uid())
  );

create table if not exists device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null default 'ios',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists idx_device_push_tokens_user on device_push_tokens (user_id);

alter table device_push_tokens enable row level security;

drop policy if exists "device_push_tokens_owner_all" on device_push_tokens;
create policy "device_push_tokens_owner_all" on device_push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
