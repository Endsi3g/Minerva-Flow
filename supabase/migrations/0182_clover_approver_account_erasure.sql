-- Preserve the order mapping when an approver deletes their account; do not
-- introduce an additional FK that prevents the existing erasure workflow.
begin;
alter table public.orders drop constraint if exists orders_clover_acceptance_user_id_fkey;
alter table public.orders add constraint orders_clover_acceptance_user_id_fkey
  foreign key (clover_acceptance_user_id) references auth.users(id) on delete set null;
commit;
