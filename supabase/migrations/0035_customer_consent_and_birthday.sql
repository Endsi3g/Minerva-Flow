-- Adds marketing consent + birthday to customers, the legal and data
-- foundation for the automated retention engine (win-back / birthday
-- campaigns). Without a documented opt-in, automated SMS/email to
-- customers would be non-compliant with Canada's anti-spam law (CASL) —
-- so the retention engine (added in a later migration) will only ever
-- target customers with marketing_consent = true. consent_source/consent_at
-- exist purely as an audit trail (where/when consent was captured), not
-- used for any logic today.
alter table customers add column if not exists marketing_consent boolean not null default false;
alter table customers add column if not exists consent_source text;
alter table customers add column if not exists consent_at timestamptz;
alter table customers add column if not exists birthday date;
