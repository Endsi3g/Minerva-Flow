-- Minerva Flow — tracks whether a user has completed the first-run
-- onboarding wizard (profile photo, name, role). Defaults to false so every
-- existing account (created before this migration) is routed through it
-- once; the app layout redirects to /onboarding while this is false.

alter table profiles add column onboarding_completed boolean not null default false;

-- Existing accounts (created before this migration) already found their way
-- into the app without a wizard — don't retroactively interrupt them.
-- Only signups from this point forward see /onboarding.
update profiles set onboarding_completed = true;
