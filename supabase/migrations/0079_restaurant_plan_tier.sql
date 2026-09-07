-- Phase 2 of the pricing-tier pivot (via /grill-me): a single, additive
-- column is the whole gating mechanism — not a git branch. One codebase,
-- behavior conditioned on this field, so moving a restaurant from
-- essentiel to croissance is a one-row update, not a redeploy.
--
-- Defaults every existing (and future) restaurant to 'essentiel', the
-- $99/mo single-restaurant loyalty tier — nothing changes for anyone
-- until a feature actually starts checking this column (see Phase 3:
-- discovery scoped to same-workspace for 'essentiel').

begin;

alter table restaurants
  add column if not exists plan_tier text not null default 'essentiel'
  check (plan_tier in ('essentiel', 'croissance', 'marque_blanche'));

create index if not exists idx_restaurants_plan_tier on restaurants (plan_tier);

commit;
