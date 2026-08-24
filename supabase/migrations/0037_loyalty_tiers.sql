-- Cumulative-spend thresholds for the premium loyalty tier system
-- (Habitué / Privilégié / Ambassadeur — see lib/loyalty-tiers.ts). Neutral
-- column names (tier_2/tier_3, not the tier labels themselves) so renaming
-- the tiers later never needs a migration.
alter table restaurants add column if not exists loyalty_tier_2_threshold numeric not null default 150;
alter table restaurants add column if not exists loyalty_tier_3_threshold numeric not null default 400;
