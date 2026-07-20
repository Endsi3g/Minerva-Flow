-- Un utilisateur qui crée son compte depuis un lien d'invitation (invite
-- restaurant simple OU invite workspace) ne doit pas recevoir de restaurant
-- "Mon restaurant" par défaut : il rejoint déjà le(s) vrai(s) restaurant(s)
-- juste après, via redeemInvite() (lib/data/invites.ts et
-- lib/data/workspace-invites.ts). Sans ce garde-fou, tout employé invité se
-- retrouvait propriétaire d'un restaurant fantôme en plus de son vrai poste
-- — sur les DEUX flux d'invitation (l'ancien par restaurant et le nouveau
-- par workspace), qui coexistent encore dans l'app. Même pattern que le
-- garde-fou déjà en place pour is_customer.
--
-- AuthCard.tsx pose invite_token / workspace_invite_token dans
-- raw_user_meta_data pour le flux email/mot de passe ; le flux OAuth ne
-- peut pas transmettre de métadonnées custom, donc un filet de sécurité
-- (deletePhantomDefaultRestaurant, appelé par les deux redeemInvite())
-- nettoie après coup dans ce cas.

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

  if (new.raw_user_meta_data ->> 'invite_token') is not null
     or (new.raw_user_meta_data ->> 'workspace_invite_token') is not null then
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
