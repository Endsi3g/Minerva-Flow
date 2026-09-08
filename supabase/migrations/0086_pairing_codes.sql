-- Card pairing code: a rotating 6-digit code (+ QR of the same digits) shown
-- on the customer's digital card (MyCardView, native app), just below the
-- existing per-restaurant checkout QR. Unlike reward_redemptions.code (single
-- use, minted per redemption, scoped to one restaurant_id), this code is
-- anchored to the customer's auth user_id so the SAME code works at whichever
-- participating restaurant looks it up -- "pairs directly to their account."
-- Staff resolve it manually (no camera scanning exists on the web dashboard
-- today, see FidelisationView's RewardValidationCard for the precedent this
-- follows) to identify the customer, then log a visit in the same panel
-- using the existing logVisit/increment_customer_visit flow -- this feature
-- only needs to solve "look up by code," not points math (already exists).

begin;

create table pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references auth.users (id),
  used_restaurant_id uuid references restaurants (id)
);

-- Only ever looked up by (unexpired, unused) code, so partial index keeps
-- the hot lookup path small regardless of how many expired/used rows pile up.
create unique index pairing_codes_active_code_idx
  on pairing_codes (code)
  where used_at is null;

create index pairing_codes_user_id_idx on pairing_codes (user_id);

alter table pairing_codes enable row level security;

-- No direct table access from clients at all -- every interaction goes
-- through the two security-definer RPCs below, which enforce who can mint
-- (the code's own owner) and who can resolve (a member of the restaurant
-- doing the lookup). This mirrors reward_redemptions' RLS-plus-RPC shape.
create policy "pairing_codes_no_direct_access"
  on pairing_codes for all
  using (false)
  with check (false);

-- Mints a fresh code for the calling auth user, invalidating any code they
-- already had outstanding (defensive: a customer reopening MyCardView
-- shouldn't accumulate live codes, and an old code a staff member wrote down
-- must stop working the moment a new one is minted).
create or replace function mint_pairing_code()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_expires_at timestamptz := now() + interval '5 minutes';
  v_attempts int := 0;
begin
  if v_user_id is null then
    raise exception 'Authentification requise.';
  end if;

  -- Expire (not delete) this user's prior outstanding code so used_by/
  -- used_restaurant_id history for support/debugging isn't lost.
  update pairing_codes
  set expires_at = now()
  where user_id = v_user_id
    and used_at is null
    and expires_at > now();

  loop
    v_attempts := v_attempts + 1;
    v_code := lpad(floor(random() * 1000000)::text, 6, '0');

    begin
      insert into pairing_codes (user_id, code, expires_at)
      values (v_user_id, v_code, v_expires_at);
      exit;
    exception when unique_violation then
      if v_attempts >= 10 then
        raise exception 'Impossible de générer un code, réessayez.';
      end if;
      -- Loop again with a new random code; the partial unique index only
      -- blocks a collision against another still-active code.
    end;
  end loop;

  return query select v_code, v_expires_at;
end;
$$;

grant execute on function mint_pairing_code() to authenticated;

-- Resolves a code for a staff member of a specific restaurant, identifying
-- the customer and marking the code used in the same call. Deliberately
-- does NOT log a visit itself -- the caller (FidelisationView's new panel)
-- chains this into the existing logVisitAction once it has the customer id,
-- so points math stays in exactly one place.
create or replace function resolve_pairing_code(p_restaurant_id uuid, p_code text)
returns table (
  customer_id uuid,
  customer_name text,
  loyalty_points int,
  visit_count int,
  total_spent numeric,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row pairing_codes%rowtype;
  v_customer customers%rowtype;
begin
  if not is_restaurant_member(p_restaurant_id) then
    raise exception 'Accès refusé.';
  end if;

  if p_code is null or length(trim(p_code)) <> 6 then
    raise exception 'Code invalide.';
  end if;

  select * into v_row
  from pairing_codes
  where code = trim(p_code) and used_at is null
  limit 1;

  if not found then
    raise exception 'Code invalide ou déjà utilisé.';
  end if;

  if v_row.expires_at <= now() then
    raise exception 'Ce code a expiré, demandez au client d''en régénérer un.';
  end if;

  select * into v_customer
  from customers
  where user_id = v_row.user_id and restaurant_id = p_restaurant_id
  limit 1;

  if not found then
    raise exception 'Ce client n''est pas encore membre de cet établissement.';
  end if;

  update pairing_codes
  set used_at = now(), used_by = auth.uid(), used_restaurant_id = p_restaurant_id
  where id = v_row.id;

  return query
  select v_customer.id, v_customer.name, v_customer.loyalty_points,
         v_customer.visit_count, v_customer.total_spent, v_customer.avatar_url;
end;
$$;

grant execute on function resolve_pairing_code(uuid, text) to authenticated;

commit;
