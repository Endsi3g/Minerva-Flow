-- What a new owner tells us during onboarding (goals, size, POS) so the
-- product can tailor itself and the team can follow up with the right offer.
-- One row per user and restaurant; the owner can read and write only their own.
create table if not exists owner_onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  goals text[] not null default '{}',
  locations_band text check (locations_band is null or locations_band in ('1', '2-5', '6+')),
  pos_system text check (pos_system is null or pos_system in ('square', 'clover', 'lightspeed', 'other', 'none')),
  offer_variant text,
  platform text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

alter table owner_onboarding_responses enable row level security;

drop policy if exists owner_onboarding_responses_own on owner_onboarding_responses;
create policy owner_onboarding_responses_own on owner_onboarding_responses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
