begin;

-- New restaurant connections use Stripe Accounts v2 Recipient accounts.
-- Existing V1 Express accounts remain explicitly versioned as v1 and keep
-- their existing capability flags until they are deliberately migrated.
alter table restaurants
  add column if not exists stripe_connect_account_api_version text not null default 'v1',
  add column if not exists stripe_connect_transfers_status text not null default 'unrequested',
  add column if not exists stripe_connect_recipient_payouts_status text not null default 'unrequested',
  add column if not exists stripe_connect_requirements_due_count integer not null default 0;

alter table restaurants
  drop constraint if exists restaurants_stripe_connect_account_api_version_check,
  add constraint restaurants_stripe_connect_account_api_version_check
    check (stripe_connect_account_api_version in ('v1', 'v2')),
  drop constraint if exists restaurants_stripe_connect_transfers_status_check,
  add constraint restaurants_stripe_connect_transfers_status_check
    check (stripe_connect_transfers_status in ('active', 'pending', 'restricted', 'unsupported', 'unrequested')),
  drop constraint if exists restaurants_stripe_connect_recipient_payouts_status_check,
  add constraint restaurants_stripe_connect_recipient_payouts_status_check
    check (stripe_connect_recipient_payouts_status in ('active', 'pending', 'restricted', 'unsupported', 'unrequested')),
  drop constraint if exists restaurants_stripe_connect_requirements_due_count_check,
  add constraint restaurants_stripe_connect_requirements_due_count_check
    check (stripe_connect_requirements_due_count >= 0);

commit;
