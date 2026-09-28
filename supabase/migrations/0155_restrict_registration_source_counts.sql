-- Explicitly revoke anon because Supabase default privileges can grant it
-- EXECUTE directly, independently of the PUBLIC grant.
revoke all on function public.get_registration_source_counts(uuid) from anon;
grant execute on function public.get_registration_source_counts(uuid) to authenticated;
