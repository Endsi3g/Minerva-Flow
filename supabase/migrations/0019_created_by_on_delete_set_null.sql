-- Deleting a user whose account created any business record (an employee,
-- a service day, an order, ...) currently fails outright: every `created_by`
-- FK to auth.users across the schema was declared with no ON DELETE action,
-- which defaults to NO ACTION/RESTRICT in Postgres. Confirmed in production
-- via Supabase logs: "update or delete on table \"users\" violates foreign
-- key constraint ..." for employees_created_by_fkey, employee_tasks_created_by_fkey,
-- service_days_created_by_fkey — this also silently broke the E2E test suite's
-- own cleanup (auth.admin.deleteUser on any test user that had created data).
--
-- Switches every one to ON DELETE SET NULL: the record survives (it's real
-- business/audit data), only the "who created it" attribution is cleared —
-- the same safe precedent already used by employees.linked_user_id. A handful
-- were declared NOT NULL, which SET NULL would violate on delete, so those
-- drop the NOT NULL constraint too. Postgres's default constraint name for an
-- inline `references` is always <table>_<column>_fkey, confirmed by the error
-- messages above.

begin;

alter table service_days drop constraint if exists service_days_created_by_fkey;
alter table service_days add constraint service_days_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table revenue_programs drop constraint if exists revenue_programs_created_by_fkey;
alter table revenue_programs add constraint revenue_programs_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table campaigns drop constraint if exists campaigns_created_by_fkey;
alter table campaigns add constraint campaigns_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table chat_conversations alter column created_by drop not null;
alter table chat_conversations drop constraint if exists chat_conversations_created_by_fkey;
alter table chat_conversations add constraint chat_conversations_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table referral_codes alter column created_by drop not null;
alter table referral_codes drop constraint if exists referral_codes_created_by_fkey;
alter table referral_codes add constraint referral_codes_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table ad_platform_connections drop constraint if exists ad_platform_connections_created_by_fkey;
alter table ad_platform_connections add constraint ad_platform_connections_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table google_connections drop constraint if exists google_connections_created_by_fkey;
alter table google_connections add constraint google_connections_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table restaurant_invites alter column created_by drop not null;
alter table restaurant_invites drop constraint if exists restaurant_invites_created_by_fkey;
alter table restaurant_invites add constraint restaurant_invites_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table report_shares alter column created_by drop not null;
alter table report_shares drop constraint if exists report_shares_created_by_fkey;
alter table report_shares add constraint report_shares_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table employees drop constraint if exists employees_created_by_fkey;
alter table employees add constraint employees_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table employee_shifts drop constraint if exists employee_shifts_created_by_fkey;
alter table employee_shifts add constraint employee_shifts_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table ai_reviews drop constraint if exists ai_reviews_created_by_fkey;
alter table ai_reviews add constraint ai_reviews_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table incident_log drop constraint if exists incident_log_created_by_fkey;
alter table incident_log add constraint incident_log_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table pos_connections drop constraint if exists pos_connections_created_by_fkey;
alter table pos_connections add constraint pos_connections_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table changelog_entries drop constraint if exists changelog_entries_created_by_fkey;
alter table changelog_entries add constraint changelog_entries_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table reservations drop constraint if exists reservations_created_by_fkey;
alter table reservations add constraint reservations_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table shift_schedules drop constraint if exists shift_schedules_created_by_fkey;
alter table shift_schedules add constraint shift_schedules_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table purchase_orders drop constraint if exists purchase_orders_created_by_fkey;
alter table purchase_orders add constraint purchase_orders_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table reservation_platform_connections drop constraint if exists reservation_platform_connections_created_by_fkey;
alter table reservation_platform_connections add constraint reservation_platform_connections_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table schedule_shares alter column created_by drop not null;
alter table schedule_shares drop constraint if exists schedule_shares_created_by_fkey;
alter table schedule_shares add constraint schedule_shares_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table financial_transactions drop constraint if exists financial_transactions_created_by_fkey;
alter table financial_transactions add constraint financial_transactions_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table expense_shares alter column created_by drop not null;
alter table expense_shares drop constraint if exists expense_shares_created_by_fkey;
alter table expense_shares add constraint expense_shares_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table loyalty_transactions drop constraint if exists loyalty_transactions_created_by_fkey;
alter table loyalty_transactions add constraint loyalty_transactions_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table inventory_movements drop constraint if exists inventory_movements_created_by_fkey;
alter table inventory_movements add constraint inventory_movements_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table orders drop constraint if exists orders_created_by_fkey;
alter table orders add constraint orders_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table menu_shares drop constraint if exists menu_shares_created_by_fkey;
alter table menu_shares add constraint menu_shares_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table workspace_invites drop constraint if exists workspace_invites_created_by_fkey;
alter table workspace_invites add constraint workspace_invites_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table offers drop constraint if exists offers_created_by_fkey;
alter table offers add constraint offers_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table employee_tasks drop constraint if exists employee_tasks_created_by_fkey;
alter table employee_tasks add constraint employee_tasks_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

commit;
