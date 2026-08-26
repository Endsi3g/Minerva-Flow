-- ═══════════════════════════════════════════════════════════════════════
-- 0050: Database Performance & RLS Query Optimization
--
-- 1. Composite & foreign key indexes on hot operational tables:
--    - team_chat_messages (restaurant_id, channel, created_at desc)
--    - orders (restaurant_id, status, created_at desc)
--    - order_items (order_id, menu_item_id)
--    - inventory_movements (restaurant_id, created_at desc)
--    - loyalty_transactions (restaurant_id, created_at desc)
--    - customers (restaurant_id, user_id) & (restaurant_id, created_at desc)
--    - alerts & notifications unread lookups
--    - financial_transactions & service_days range filters
--
-- 2. STABLE & SECURITY DEFINER RLS function hardening:
--    - is_restaurant_member
--    - can_access_team_channel
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Team Chat & Collaboration Indexes
create index if not exists idx_team_chat_messages_restaurant_channel_created
  on team_chat_messages (restaurant_id, channel, created_at desc);

create index if not exists idx_team_channel_members_member_lookup
  on team_channel_members (member_id, restaurant_id);

-- 2. Live Orders & POS Ingestion Indexes
create index if not exists idx_orders_restaurant_status_created
  on orders (restaurant_id, status, created_at desc);

create index if not exists idx_orders_restaurant_created_desc
  on orders (restaurant_id, created_at desc);

create index if not exists idx_order_items_order_menu_item
  on order_items (order_id, menu_item_id);

-- 3. Inventory & Movements Indexes
create index if not exists idx_inventory_movements_restaurant_created
  on inventory_movements (restaurant_id, created_at desc);

create index if not exists idx_inventory_movements_item_created
  on inventory_movements (inventory_item_id, created_at desc);

-- 4. Loyalty, Retention & Customer Hub Indexes
create index if not exists idx_loyalty_transactions_restaurant_created
  on loyalty_transactions (restaurant_id, created_at desc);

create index if not exists idx_customers_restaurant_user
  on customers (restaurant_id, user_id);

create index if not exists idx_customers_restaurant_created
  on customers (restaurant_id, created_at desc);

-- 5. Realtime Alerts & Topbar Notifications Indexes
create index if not exists idx_alerts_restaurant_unread
  on alerts (restaurant_id, read, created_at desc);

create index if not exists idx_notifications_user_unread
  on notifications (user_id, read, created_at desc);

-- 6. Financial Transactions & Service Days Filter Indexes
create index if not exists idx_financial_transactions_restaurant_category_date
  on financial_transactions (restaurant_id, category, date desc);

create index if not exists idx_service_days_restaurant_rush
  on service_days (restaurant_id, rush_level);

-- 7. Hardened STABLE RLS Helper Functions
create or replace function is_restaurant_member(
  target_restaurant_id uuid,
  min_roles member_role[] default array['owner','manager','staff','consultant']::member_role[]
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from restaurant_members m
    where m.restaurant_id = target_restaurant_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(min_roles)
  );
$$;

create or replace function can_access_team_channel(p_restaurant_id text, p_channel text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    is_restaurant_member(p_restaurant_id::uuid) and (
      p_channel in ('general', 'cuisine', 'service', 'urgences')
      or exists (
        select 1 from team_channel_members tcm
        where tcm.restaurant_id::text = p_restaurant_id
          and tcm.channel = p_channel
          and tcm.member_id::text = auth.uid()::text
      )
    );
$$;
