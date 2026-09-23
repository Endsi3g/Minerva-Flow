begin;

-- Owners can promote a popular customer idea into an unpublished draft.
-- The row lock and existing menu_item_id make retries safe and prevent two
-- concurrent clicks from creating duplicate draft dishes.
create or replace function public.create_menu_draft_from_suggestion(p_suggestion_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_suggestion public.meal_suggestions%rowtype;
  v_menu_item_id uuid;
begin
  select * into v_suggestion
  from public.meal_suggestions
  where id = p_suggestion_id
  for update;

  if not found or not is_restaurant_member(v_suggestion.restaurant_id, array['owner','manager']::member_role[]) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_suggestion.status = 'draft_added' and v_suggestion.menu_item_id is not null then
    return v_suggestion.menu_item_id;
  end if;
  if v_suggestion.status not in ('open', 'under_review') then
    raise exception 'suggestion_not_actionable' using errcode = '22023';
  end if;

  insert into public.menu_items (
    restaurant_id, name, category, price, food_cost, description,
    active, is_draft, allergens_confirmed
  ) values (
    v_suggestion.restaurant_id, v_suggestion.title, 'Plats', 0, 0,
    coalesce(v_suggestion.description, 'Idée proposée par un client — à compléter avant publication.'),
    false, true, false
  ) returning id into v_menu_item_id;

  update public.meal_suggestions
  set status = 'draft_added', menu_item_id = v_menu_item_id, updated_at = now()
  where id = p_suggestion_id;

  return v_menu_item_id;
end;
$$;

revoke all on function public.create_menu_draft_from_suggestion(uuid) from public, anon;
grant execute on function public.create_menu_draft_from_suggestion(uuid) to authenticated;

commit;
