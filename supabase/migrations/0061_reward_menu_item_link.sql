-- Lets a "free item" loyalty reward point at a real menu item so its true
-- cost (menu_items.food_cost) can be tracked instead of guessed from a
-- flat points-to-dollar conversion. Optional: a reward with no linked item
-- (a discount %, a points bonus, ...) keeps working exactly as before.
alter table loyalty_rewards
  add column if not exists menu_item_id uuid references menu_items (id) on delete set null;

create index if not exists idx_loyalty_rewards_menu_item on loyalty_rewards (menu_item_id) where menu_item_id is not null;
