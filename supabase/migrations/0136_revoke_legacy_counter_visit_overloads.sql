-- Older overloads allow callers to choose points_delta. Keep server-side
-- service-role access for legacy jobs, while requiring authenticated callers
-- to use the scoped 8-argument RPC from migration 0135.
do $migration$
declare
  legacy_function regprocedure;
begin
  for legacy_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'increment_customer_visit'
      and p.pronargs < 8
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      legacy_function
    );
    execute format(
      'grant execute on function %s to service_role',
      legacy_function
    );
  end loop;
end;
$migration$;
