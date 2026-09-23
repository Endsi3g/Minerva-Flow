-- Optional charge for estimated driving time, in addition to distance-based
-- pricing. A zero default preserves existing restaurant pricing.
begin;

alter table public.restaurants
  add column if not exists delivery_per_minute_fee numeric(10,2) not null default 0
    check (delivery_per_minute_fee >= 0 and delivery_per_minute_fee <= 100);

commit;
