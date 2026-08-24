-- A fourth retention-engine trigger: a customer already has enough points
-- to redeem a reward but hasn't — this reminds them, same anti-spam
-- frequency cap and channel fallback as inactivity/birthday/value_drift,
-- just a different reason to reach out.
alter type retention_trigger_type add value if not exists 'reward_available';
