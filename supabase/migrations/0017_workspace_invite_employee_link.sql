-- Ports the employee-login-invite flow (0016_employee_login_invite.sql) to
-- workspace_invites, now that /collaborateurs consolidates onto the
-- workspace invite system (restaurant_invites stays functional read-only
-- for previously-issued links, but no longer used to mint new ones). Same
-- shape: when an invite carries an employee_id, redemption links
-- employees.linked_user_id to the account that redeemed it
-- (lib/data/workspace-invites.ts:redeemInvite).

begin;

alter table workspace_invites add column if not exists employee_id uuid references employees (id) on delete set null;

commit;
