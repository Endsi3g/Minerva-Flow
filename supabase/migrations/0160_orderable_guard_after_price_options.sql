-- Price-options migration replaces the public checkout function. Reapply the
-- presentation-only guard after that replacement so hidden-to-order items
-- remain visible on the menu but cannot be purchased.
do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(p.oid) into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_or_get_public_order'
  order by p.oid desc limit 1;
  if v_definition is null then
    raise exception 'public_order_function_not_found';
  end if;

  if position('mi.is_orderable = true' in v_definition) > 0 then
    return;
  end if;

  v_updated := replace(
    v_definition,
    'and mi.active = true and mi.is_draft = false and (',
    'and mi.active = true and mi.is_draft = false and mi.is_orderable = true and ('
  );
  if v_updated = v_definition then
    raise exception 'public_order_orderable_guard_insertion_point_not_found';
  end if;
  execute v_updated;
end;
$$;
