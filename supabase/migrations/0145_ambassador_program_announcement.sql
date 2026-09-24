-- One in-app announcement per active account (also materialized in notifications).
with first_active_restaurant as (
  select distinct on (user_id) user_id, restaurant_id
  from public.restaurant_members
  where status = 'active'
  order by user_id, created_at asc
)
insert into public.notifications (restaurant_id, user_id, type, title, body, link)
select
  first_active_restaurant.restaurant_id,
  first_active_restaurant.user_id,
  'flow_ambassador.program_launch_2026_09',
  'Nouveau · Programme ambassadeur',
  'Recommandez Minerva Flow, suivez 10 % de commission sur la première facture admissible et créez du contenu avec des restaurants participants.',
  '/workspace/ambassadeurs'
from first_active_restaurant
where not exists (
  select 1
  from public.notifications existing
  where existing.user_id = first_active_restaurant.user_id
    and existing.type = 'flow_ambassador.program_launch_2026_09'
);
