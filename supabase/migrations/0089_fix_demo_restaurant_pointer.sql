-- Corrects a real setup mistake surfaced by live testing: the native
-- dev-test customer (0084) was pointed at "Mon restaurant" (38038211),
-- which is actually quebecsaas@gmail.com's real production restaurant —
-- not a demo one. The real, already-set-up demo restaurant is
-- "Minerva Flow — Démo" (60a59423, owned by a separate demo@minervaflow.app
-- account), which already had its own real menu/offers/rewards and
-- coordinates before this session touched anything. Never touches
-- auth.users or deletes the customers row — only which restaurant it
-- points to, same as 0084's own re-point, plus removing the test content
-- 0084/0087 wrongly seeded into the user's real restaurant.

begin;

-- Drop today's test artifacts created against the wrong restaurant —
-- neither is real production history, both were generated during this
-- session's own testing of the mis-scoped setup.
delete from reward_redemptions
where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3'
  and customer_id = 'b6bdc959-a32f-4239-bd66-d69756c6f208';

delete from loyalty_transactions
where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3'
  and customer_id = 'b6bdc959-a32f-4239-bd66-d69756c6f208';

-- Move the customer to the real demo restaurant and reset accumulated
-- stats to a clean baseline — those numbers were earned under the wrong
-- restaurant's context and would misrepresent a brand-new relationship
-- with this one otherwise.
update customers
set restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1',
    loyalty_points = 0,
    visit_count = 0,
    total_spent = 0,
    last_visit_at = null
where user_id = 'f43acb06-4025-4953-b225-666587619c64';

-- Restore the user's real restaurant to a clean state — it should never
-- have had test menu content in the first place.
delete from offers where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';
delete from menu_items where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';
delete from loyalty_rewards where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';

commit;
