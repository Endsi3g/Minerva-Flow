-- Real bug caught via live testing: RETURNS TABLE (code text, expires_at
-- timestamptz) implicitly declares `code`/`expires_at` as PL/pgSQL
-- variables in scope for the whole function body, which collided with
-- pairing_codes' own `code`/`expires_at` columns in the invalidate-prior-
-- code UPDATE's WHERE clause — Postgres error 42702 "column reference
-- expires_at is ambiguous" on every call, confirmed by calling the RPC
-- directly as the real dev-test user. Qualifying every reference to the
-- table's own columns with the table name removes the ambiguity.

begin;

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

  update pairing_codes
  set expires_at = now()
  where pairing_codes.user_id = v_user_id
    and pairing_codes.used_at is null
    and pairing_codes.expires_at > now();

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
    end;
  end loop;

  return query select v_code, v_expires_at;
end;
$$;

grant execute on function mint_pairing_code() to authenticated;

commit;
