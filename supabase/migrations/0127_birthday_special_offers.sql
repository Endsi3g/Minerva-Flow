-- A restaurant can designate client-facing offers for the customer's
-- birthday. These are kept out of shared/public menus and surfaced only
-- inside the eligible customer's authenticated app session.
begin;

alter table offers
  add column if not exists is_birthday_special boolean not null default false;

create index if not exists idx_offers_birthday_special
  on offers (restaurant_id, created_at desc)
  where is_birthday_special = true and active = true;

commit;
