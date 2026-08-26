-- Visit-count-triggered automatic loyalty rewards (V1→V2→V3) — distinct from
-- the spend-based tier system in loyalty_tier_2/3_threshold: this one fires
-- off the customer's raw visit_count, not total_spent. Ships enabled with
-- starter tiers; logVisit() only notifies on a NEW crossing (visitBefore <
-- threshold <= visitAfter), so existing customers are never retroactively
-- emailed when this ships.
alter table restaurants add column if not exists visit_rewards_enabled boolean not null default true;
alter table restaurants add column if not exists visit_reward_tiers jsonb not null default '[
  {"id":"v1","label":"Palier 1","visits":5,"reward":"Café offert","active":true},
  {"id":"v2","label":"Palier 2","visits":12,"reward":"Dessert offert","active":true},
  {"id":"v3","label":"Palier 3","visits":25,"reward":"15% de réduction","active":true}
]'::jsonb;
