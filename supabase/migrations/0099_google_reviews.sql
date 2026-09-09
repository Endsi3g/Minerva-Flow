-- Phase 3 of the reputation-system bundle: synced Google Maps reviews,
-- distinct from restaurant_reviews (0076, in-app-only). Owner responds
-- here the same way as an in-app private review (Phase 2's Reputation
-- page); unlike restaurant_reviews there's no customer_id (Google
-- reviewers aren't necessarily loyalty customers), so no native-app
-- sync-back applies to this table.

begin;

create table if not exists google_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  google_review_id text not null,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  review_text text,
  published_at timestamptz,
  owner_response text,
  owner_responded_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (restaurant_id, google_review_id)
);

create index if not exists idx_google_reviews_restaurant on google_reviews (restaurant_id);

alter table google_reviews enable row level security;

create policy "google_reviews_staff_select" on google_reviews for select
  using (is_restaurant_member(restaurant_id));

-- No insert/update/delete policy for authenticated/anon — every write to
-- this table comes from the poll-google-reviews cron (admin/service-role
-- client, bypasses RLS) or respond_to_google_review() below.

create or replace function respond_to_google_review(p_review_id uuid, p_response text)
returns google_reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_restaurant_id uuid;
  v_row google_reviews%rowtype;
begin
  select restaurant_id into v_restaurant_id from google_reviews where id = p_review_id;
  if v_restaurant_id is null then
    raise exception 'Avis introuvable.';
  end if;
  if not is_restaurant_member(v_restaurant_id, array['owner', 'manager', 'staff']::member_role[]) then
    raise exception 'Accès refusé.';
  end if;
  if p_response is null or length(trim(p_response)) = 0 then
    raise exception 'La réponse ne peut pas être vide.';
  end if;

  update google_reviews
  set owner_response = trim(p_response), owner_responded_at = now()
  where id = p_review_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function respond_to_google_review(uuid, text) to authenticated;

commit;
