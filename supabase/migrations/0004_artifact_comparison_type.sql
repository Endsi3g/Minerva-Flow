-- Adds the richer "comparison" artifact type introduced by the chat
-- artifacts v2 feature (dual-line charts + key-metrics table + summary +
-- trend forecast), alongside the existing table/chart/summary types from
-- 0002_chat_and_referrals.sql.
alter type artifact_type add value 'comparison';
