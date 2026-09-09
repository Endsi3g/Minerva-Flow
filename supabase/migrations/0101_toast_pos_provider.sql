-- Adds Toast POS as a pos_connections provider and extends service_days
-- revenue_source constraint to include 'toast'.
alter type pos_provider add value if not exists 'toast';

do $$ begin
  alter table service_days drop constraint if exists service_days_revenue_source_check;
  alter table service_days add constraint service_days_revenue_source_check
    check (revenue_source in ('manuel', 'commandes', 'square', 'lightspeed', 'clover', 'toast'));
exception when duplicate_object then null;
end $$;
