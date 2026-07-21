-- 0019 fixed every `created_by` FK to auth.users that lacked an ON DELETE
-- action, but that migration was scoped to `created_by` specifically — every
-- other auth.users reference (used_by, assigned_to, author_id, reviewer_id,
-- replied_by, updated_by) was left with the same default NO ACTION/RESTRICT
-- gap. Confirmed in production via Supabase logs: "update or delete on table
-- \"users\" violates foreign key constraint \"workspace_invites_used_by_fkey\"
-- on table \"workspace_invites\"" — deleting a user who had accepted a
-- workspace invite fails outright, same root cause as 0019.
--
-- Same fix, same precedent: ON DELETE SET NULL, since these are all
-- attribution/reference columns on real business records that should survive
-- the referenced user's deletion. employee_reviews.reviewer_id was declared
-- NOT NULL, so it drops that constraint first, matching how 0019 handled
-- chat_conversations.created_by and referral_codes.created_by.

begin;

alter table alerts drop constraint if exists alerts_assigned_to_fkey;
alter table alerts add constraint alerts_assigned_to_fkey foreign key (assigned_to) references auth.users (id) on delete set null;

alter table notes drop constraint if exists notes_author_id_fkey;
alter table notes add constraint notes_author_id_fkey foreign key (author_id) references auth.users (id) on delete set null;

alter table chat_messages drop constraint if exists chat_messages_author_id_fkey;
alter table chat_messages add constraint chat_messages_author_id_fkey foreign key (author_id) references auth.users (id) on delete set null;

alter table restaurant_invites drop constraint if exists restaurant_invites_used_by_fkey;
alter table restaurant_invites add constraint restaurant_invites_used_by_fkey foreign key (used_by) references auth.users (id) on delete set null;

alter table workspace_invites drop constraint if exists workspace_invites_used_by_fkey;
alter table workspace_invites add constraint workspace_invites_used_by_fkey foreign key (used_by) references auth.users (id) on delete set null;

alter table support_requests drop constraint if exists support_requests_replied_by_fkey;
alter table support_requests add constraint support_requests_replied_by_fkey foreign key (replied_by) references auth.users (id) on delete set null;

alter table financial_transactions drop constraint if exists financial_transactions_updated_by_fkey;
alter table financial_transactions add constraint financial_transactions_updated_by_fkey foreign key (updated_by) references auth.users (id) on delete set null;

alter table employee_reviews alter column reviewer_id drop not null;
alter table employee_reviews drop constraint if exists employee_reviews_reviewer_id_fkey;
alter table employee_reviews add constraint employee_reviews_reviewer_id_fkey foreign key (reviewer_id) references auth.users (id) on delete set null;

commit;
