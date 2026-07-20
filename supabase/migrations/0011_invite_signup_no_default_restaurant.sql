-- Un utilisateur qui crée son compte depuis un lien d'invitation
-- (raw_user_meta_data.invite_token posé côté client dans AuthCard.tsx) ne
-- doit pas recevoir de restaurant "Mon restaurant" par défaut : il rejoint
-- déjà le vrai restaurant de son employeur juste après, via redeemInvite()
-- (app/invite/[token]/page.tsx). Sans ce garde-fou, tout employé invité se
-- retrouvait propriétaire d'un restaurant fantôme en plus de son vrai poste.
-- Même pattern que le garde-fou déjà en place pour is_customer.

begin;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' then
    return new;
  end if;

  if (new.raw_user_meta_data ->> 'invite_token') is not null then
    return new;
  end if;

  insert into public.restaurants (name)
  values ('Mon restaurant')
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

commit;
