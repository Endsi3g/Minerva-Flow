-- Migration 0120: Additional campaign templates and triggers for SMS & Email retention
begin;

-- Expand retention_trigger_type enum with new campaign triggers
alter type retention_trigger_type add value if not exists 'welcome';
alter type retention_trigger_type add value if not exists 'second_visit';
alter type retention_trigger_type add value if not exists 'off_peak';
alter type retention_trigger_type add value if not exists 'vip_upgrade';
alter type retention_trigger_type add value if not exists 'referral_share';
alter type retention_trigger_type add value if not exists 'winback_60d';

-- Add configuration columns on restaurants for the new automated campaigns
alter table restaurants
  add column if not exists campaign_reward_available_enabled boolean not null default true,
  add column if not exists campaign_vip_upgrade_enabled boolean not null default true,
  add column if not exists campaign_referral_share_enabled boolean not null default true,
  add column if not exists campaign_winback_60d_enabled boolean not null default true;

commit;
