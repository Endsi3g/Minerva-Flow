-- Preserve referral source and invitee attribution without changing the
-- existing share codes or aggregate counters.
begin;

alter table customer_referral_conversions
  add column if not exists invited_customer_id uuid references customers (id) on delete set null,
  add column if not exists invitation_channel text not null default 'direct';

alter table customer_referral_conversions
  drop constraint if exists customer_referral_conversions_invitation_channel_check;
alter table customer_referral_conversions
  add constraint customer_referral_conversions_invitation_channel_check
  check (invitation_channel in ('qr', 'share', 'copy', 'code', 'direct'));

create table if not exists customer_referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_link_id uuid not null references customer_referral_links (id) on delete cascade,
  event_type text not null check (event_type in ('click', 'conversion')),
  invitation_channel text not null default 'direct'
    check (invitation_channel in ('qr', 'share', 'copy', 'code', 'direct')),
  invited_customer_id uuid references customers (id) on delete set null,
  conversion_id uuid references customer_referral_conversions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customer_referral_events_link_date_idx
  on customer_referral_events (referral_link_id, created_at desc);
create index if not exists customer_referral_events_invitee_idx
  on customer_referral_events (invited_customer_id)
  where invited_customer_id is not null;
create unique index if not exists customer_referral_events_conversion_unique
  on customer_referral_events (conversion_id)
  where conversion_id is not null;

create or replace function record_customer_referral_conversion_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.credited_at is null and new.credited_at is not null and new.invited_customer_id is not null then
    insert into customer_referral_events (
      referral_link_id, event_type, invitation_channel, invited_customer_id, conversion_id, created_at
    ) values (
      new.referral_link_id, 'conversion', new.invitation_channel,
      new.invited_customer_id, new.id, new.credited_at
    ) on conflict (conversion_id) where conversion_id is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists customer_referral_conversion_event on customer_referral_conversions;
create trigger customer_referral_conversion_event
  after update of credited_at on customer_referral_conversions
  for each row execute function record_customer_referral_conversion_event();

alter table customer_referral_events enable row level security;
drop policy if exists "customer_referral_events_select" on customer_referral_events;
create policy "customer_referral_events_select" on customer_referral_events for select
  using (exists (
    select 1
    from customer_referral_links crl
    join referral_programs rp on rp.id = crl.referral_program_id
    where crl.id = customer_referral_events.referral_link_id
      and is_restaurant_member(rp.restaurant_id, array['owner','manager']::member_role[])
  ));

commit;
