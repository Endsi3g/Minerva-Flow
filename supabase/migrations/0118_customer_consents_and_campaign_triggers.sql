-- Migration 0118: Customer consent audit log for CASL/LCAP compliance and campaign triggers
begin;
-- Immutable consent audit log for Canadian CASL/LCAP legal proof
create table if not exists customer_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  consent_type text not null check (consent_type in ('service', 'marketing')),
  status text not null check (status in ('opt_in', 'opt_out')),
  channels text [] not null default array ['email', 'sms'],
  consent_text text not null,
  consent_source text not null check (
    consent_source in (
      'qr_code',
      'pos_cashier',
      'website',
      'portal',
      'share_link',
      'sms_keyword',
      'unsubscribe_link',
      'staff'
    )
  ),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists customer_consents_customer_idx on customer_consents (customer_id, consent_type, created_at desc);
create index if not exists customer_consents_restaurant_idx on customer_consents (restaurant_id, created_at desc);
alter table customer_consents enable row level security;
create policy "restaurant_members_view_consents" on customer_consents for
select using (is_restaurant_member(restaurant_id));
create policy "service_role_manage_consents" on customer_consents for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "authenticated_insert_consents" on customer_consents for
insert with check (
    is_restaurant_member(restaurant_id)
    or auth.uid() is not null
  );
-- Campaign automation triggers configuration on restaurants table
alter table restaurants
add column if not exists campaign_welcome_enabled boolean not null default true,
  add column if not exists campaign_second_visit_enabled boolean not null default true,
  add column if not exists campaign_reactivation_21d_enabled boolean not null default true;
commit;