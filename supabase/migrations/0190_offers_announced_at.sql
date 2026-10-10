-- An offer published from the phone can notify customers once. announced_at
-- is set by the announce route so a double tap (or a retry) never spams the
-- same push twice.
alter table offers add column if not exists announced_at timestamptz;
