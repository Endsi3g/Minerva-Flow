-- Self-serve "connected devices" visibility + revoke. auth.sessions isn't
-- exposed via PostgREST, so these SECURITY DEFINER functions read/write it
-- on the caller's behalf, always scoped to auth.uid() — never a
-- caller-supplied user id, so a user can only ever see or revoke their own
-- sessions. Deleting a session row invalidates its refresh token; the
-- device's current access token (short-lived) keeps working until it
-- naturally expires and tries to refresh — there's no live-socket "kill
-- this tab now" mechanism in Supabase Auth, so we don't claim one in the UI.

create or replace function public.list_my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  not_after timestamptz,
  user_agent text,
  ip text,
  is_current boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select
    s.id,
    s.created_at,
    s.updated_at,
    s.not_after,
    s.user_agent,
    s.ip::text,
    s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid as is_current
  from auth.sessions s
  where s.user_id = auth.uid()
  order by coalesce(s.updated_at, s.created_at) desc;
$$;

grant execute on function public.list_my_sessions() to authenticated;

create or replace function public.revoke_my_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_deleted int;
begin
  if p_session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid then
    raise exception 'Impossible de révoquer la session active depuis cet appareil — déconnectez-vous normalement.';
  end if;

  delete from auth.sessions
  where id = p_session_id and user_id = auth.uid();

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

grant execute on function public.revoke_my_session(uuid) to authenticated;
