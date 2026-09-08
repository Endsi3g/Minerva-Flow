-- Phase 1 of the reputation-system bundle:
--   1. restaurant_reviews gains a visibility split — 4-5* reviews stay
--      public (same "Google Maps style" read-for-anyone as before); 1-3*
--      reviews become private (visible only to their own author and
--      restaurant staff), and automatically raise an alert so the owner
--      sees it on the new Reputation page (Phase 2) instead of it either
--      going nowhere or airing publicly.
--   2. owner_response/owner_responded_at columns, for Phase 2's respond
--      flow — the response is visible to the review's own author
--      (RLS already grants that via the author-sees-own-row clause).
--   3. offer_reviews — a structural copy of menu_item_reviews (0069),
--      giving offers the same rating/review capability dishes already
--      have. No star-gating/Google-Maps logic applies here — that stays
--      scoped to the overall-restaurant experience.

begin;

alter table restaurant_reviews
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private')),
  add column if not exists owner_response text,
  add column if not exists owner_responded_at timestamptz;

drop policy if exists "restaurant_reviews_public_select" on restaurant_reviews;
drop policy if exists "restaurant_reviews_select" on restaurant_reviews;
create policy "restaurant_reviews_select" on restaurant_reviews for select
  using (
    visibility = 'public'
    or exists (select 1 from customers c where c.id = restaurant_reviews.customer_id and c.user_id = auth.uid())
    or is_restaurant_member(restaurant_id)
  );

-- restaurant_reviews_customer_update (existing, unchanged) lets a customer
-- update their own review row — but RLS policies grant/deny whole rows,
-- not individual columns, so without this guard that same policy would
-- also let a customer silently overwrite or erase the owner's response.
-- The guard reverts owner_response/owner_responded_at to their prior
-- value on any UPDATE except one that goes through respond_to_review()
-- below (which sets a transaction-local flag), regardless of which client
-- issues the raw UPDATE.
create or replace function protect_owner_response_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.allow_owner_response_write', true), 'false') <> 'true' then
    new.owner_response := old.owner_response;
    new.owner_responded_at := old.owner_responded_at;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_reviews_protect_owner_response on restaurant_reviews;
create trigger restaurant_reviews_protect_owner_response
  before update on restaurant_reviews
  for each row execute function protect_owner_response_columns();

-- Owner responds via the Reputation page (Phase 2) — security definer so
-- it can write regardless of the restaurant_reviews RLS policies, but it
-- re-checks is_restaurant_member itself using the caller's own auth
-- context (this must be called through the normal session-scoped
-- client, not the admin client, for that check to mean anything).
create or replace function respond_to_review(p_review_id uuid, p_response text)
returns restaurant_reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_restaurant_id uuid;
  v_row restaurant_reviews%rowtype;
begin
  select restaurant_id into v_restaurant_id from restaurant_reviews where id = p_review_id;
  if v_restaurant_id is null then
    raise exception 'Avis introuvable.';
  end if;
  if not is_restaurant_member(v_restaurant_id, array['owner', 'manager', 'staff']::member_role[]) then
    raise exception 'Accès refusé.';
  end if;
  if p_response is null or length(trim(p_response)) = 0 then
    raise exception 'La réponse ne peut pas être vide.';
  end if;

  perform set_config('app.allow_owner_response_write', 'true', true);
  update restaurant_reviews
  set owner_response = p_response, owner_responded_at = now()
  where id = p_review_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function respond_to_review(uuid, text) to authenticated;

create or replace function set_review_visibility()
returns trigger
language plpgsql
as $$
begin
  new.visibility := case when new.rating < 4 then 'private' else 'public' end;
  return new;
end;
$$;

drop trigger if exists restaurant_reviews_set_visibility on restaurant_reviews;
create trigger restaurant_reviews_set_visibility
  before insert or update of rating on restaurant_reviews
  for each row execute function set_review_visibility();

create or replace function sync_review_alert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := 'review_' || new.id::text;
begin
  if new.rating < 4 then
    insert into alerts (restaurant_id, type, severity, title, detail, related_entity_type, related_entity_id, computed_key)
    values (
      new.restaurant_id,
      'review_needs_response',
      (case when new.rating <= 2 then 'critique' else 'important' end)::alert_severity,
      'Nouvel avis à traiter (' || new.rating || '★)',
      coalesce(new.comment, 'Aucun commentaire laissé.'),
      'restaurant_review',
      new.id,
      v_key
    )
    on conflict (restaurant_id, computed_key) do update
      set severity = excluded.severity, title = excluded.title, detail = excluded.detail;
  else
    -- A customer editing their review up to 4-5* resolves the concern —
    -- remove any lingering alert rather than leaving a stale one open.
    delete from alerts where restaurant_id = new.restaurant_id and computed_key = v_key;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_reviews_sync_alert on restaurant_reviews;
create trigger restaurant_reviews_sync_alert
  after insert or update of rating on restaurant_reviews
  for each row execute function sync_review_alert();

create table if not exists offer_reviews (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (offer_id, customer_id)
);

create index if not exists idx_offer_reviews_offer on offer_reviews (offer_id);
create index if not exists idx_offer_reviews_restaurant on offer_reviews (restaurant_id);

alter table offer_reviews enable row level security;

drop policy if exists "offer_reviews_public_select" on offer_reviews;
create policy "offer_reviews_public_select" on offer_reviews for select
  using (true);

drop policy if exists "offer_reviews_customer_insert" on offer_reviews;
create policy "offer_reviews_customer_insert" on offer_reviews for insert
  with check (
    exists (
      select 1 from customers c
      where c.id = offer_reviews.customer_id
        and c.restaurant_id = offer_reviews.restaurant_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "offer_reviews_customer_update" on offer_reviews;
create policy "offer_reviews_customer_update" on offer_reviews for update
  using (
    exists (select 1 from customers c where c.id = offer_reviews.customer_id and c.user_id = auth.uid())
  );

drop policy if exists "offer_reviews_customer_delete" on offer_reviews;
create policy "offer_reviews_customer_delete" on offer_reviews for delete
  using (
    exists (select 1 from customers c where c.id = offer_reviews.customer_id and c.user_id = auth.uid())
  );

commit;
