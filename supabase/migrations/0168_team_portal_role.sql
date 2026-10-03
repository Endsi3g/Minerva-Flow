-- Minerva Flow internal team portal (/equipe): a role distinct from
-- is_platform_admin (which grants full restaurant-admin powers) — a team
-- member here only gets the read-only internal metrics dashboard and the
-- shared onboarding, not restaurant support-ticket or billing access.
alter table public.profiles add column if not exists is_team_member boolean not null default false;
