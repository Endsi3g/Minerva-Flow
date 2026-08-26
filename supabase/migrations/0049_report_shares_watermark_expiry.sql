-- Shareable-report watermark + link expiry. RLS is unaffected: the public
-- /r/[token] read already goes through the admin client (no anonymous RLS
-- policy exists on report_shares), so expiry is enforced in application
-- code (getReportShareByToken), not in a policy.
alter table report_shares add column if not exists watermark boolean not null default true;
alter table report_shares add column if not exists expires_at timestamptz;
