-- Customer self-service profile editing (name/avatar/email) needs two
-- things the schema doesn't have yet:
--   1. Nowhere to store an avatar URL on the customer's own record.
--   2. A way for customers.email to stay in sync once someone actually
--      completes Supabase's email-change confirmation flow
--      (auth.updateUser({email}) only changes auth.users.email once the
--      confirmation link is clicked — nothing currently propagates that
--      back to the customers row it's denormalized onto for staff-facing
--      views).
--
-- Reuses the existing public "avatars" storage bucket (already policied
-- per-auth.uid() folder, see avatars_owner_write/update/delete) rather
-- than creating a new bucket — a loyalty customer has a real auth.uid()
-- once linked, same as staff.

begin;

alter table customers
  add column if not exists avatar_url text;

create or replace function sync_customer_email_from_auth()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.customers
    set email = new.email
    where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row
  execute function sync_customer_email_from_auth();

commit;
