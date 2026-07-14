-- Minerva Flow — every user needs at least one restaurant to use the app.
-- Until now, signing up only created a `profiles` row (see handle_new_user()
-- in 0001_init.sql); a brand-new user had zero restaurant_members rows, so
-- getUserRestaurants() returned [] and the app crashed on first load
-- (TeamSwitcher and useCurrentRestaurant() both assume restaurants[0]
-- exists). Extend the signup trigger to also create a default restaurant +
-- owner membership, and backfill any account already stuck in that state.

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

  insert into public.restaurants (name)
  values ('Mon restaurant')
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

do $$
declare
  orphan record;
  new_restaurant_id uuid;
begin
  for orphan in
    select u.id
    from auth.users u
    where not exists (
      select 1 from public.restaurant_members m
      where m.user_id = u.id and m.status = 'active'
    )
  loop
    insert into public.restaurants (name)
    values ('Mon restaurant')
    returning id into new_restaurant_id;

    insert into public.restaurant_members (restaurant_id, user_id, role, status)
    values (new_restaurant_id, orphan.id, 'owner', 'active');
  end loop;
end $$;
