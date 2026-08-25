-- Migration 0046: widen prospects.status to the real Reach pipeline states.
--
-- The application (lib/prospects/types.ts ProspectStatus, the admin prospects
-- actions, both MCP tool implementations, and the relance cron) has always
-- written/read nouveau, audit_envoye, relance_1, relance_2 and rdv_fixe, but
-- the original check constraint only allowed draft/ready/contacte/converti/
-- decline — every one of those writes has been silently rejected at the DB
-- layer since the table was created, so the automated relance pipeline could
-- never actually progress a prospect past "contacte".
alter table public.prospects drop constraint if exists prospects_status_check;

alter table public.prospects add constraint prospects_status_check
  check (status in (
    'draft',
    'nouveau',
    'ready',
    'contacte',
    'audit_envoye',
    'relance_1',
    'relance_2',
    'rdv_fixe',
    'converti',
    'decline'
  ));
