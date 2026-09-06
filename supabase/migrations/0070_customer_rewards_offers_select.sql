-- Real bug, confirmed live: loyalty_rewards_select and offers_select are
-- both `is_restaurant_member(restaurant_id)` only — a loyalty customer is
-- never a restaurant_members row, so SupabaseManager.loadPortalData()'s
-- direct queries for both tables have silently returned zero rows for
-- every native customer since the app shipped (Home's "next reward" card
-- and offers feed always rendered empty, regardless of what the
-- restaurant actually configured). The web portal never hit this because
-- getPortalData() reads both through the admin client, not RLS.
--
-- Fix: add a customer-scoped SELECT policy on each, same shape as
-- loyalty_transactions_select_own — neither table holds anything
-- sensitive (no pricing internals, no other customers' data), so a direct
-- RLS policy is the right fix here, not a bridge route.

begin;

drop policy if exists "loyalty_rewards_select_own" on loyalty_rewards;
create policy "loyalty_rewards_select_own" on loyalty_rewards for select
  using (
    exists (
      select 1 from customers c
      where c.restaurant_id = loyalty_rewards.restaurant_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "offers_select_own" on offers;
create policy "offers_select_own" on offers for select
  using (
    exists (
      select 1 from customers c
      where c.restaurant_id = offers.restaurant_id and c.user_id = auth.uid()
    )
  );

commit;
