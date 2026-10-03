-- search_onboarding_candidates returned restaurant owners' e-mail addresses to
-- anyone holding the public anon key (confirmed 2026-10-03: anon saw 4 distinct
-- addresses for the query 'gmail'). It has no caller in the codebase.
-- record_workspace_ai_tokens and create_team_channel_atomic have no internal
-- identity check and are only called through the service-role client.
-- Already applied to production on 2026-10-03.

begin;

revoke execute on function public.search_onboarding_candidates(text) from public, anon, authenticated;
revoke execute on function public.record_workspace_ai_tokens(uuid, integer, integer, text) from public, anon, authenticated;
revoke execute on function public.create_team_channel_atomic(uuid, text, text, text, uuid[], uuid) from public, anon, authenticated;

grant execute on function public.search_onboarding_candidates(text) to service_role;
grant execute on function public.record_workspace_ai_tokens(uuid, integer, integer, text) to service_role;
grant execute on function public.create_team_channel_atomic(uuid, text, text, text, uuid[], uuid) to service_role;

commit;
