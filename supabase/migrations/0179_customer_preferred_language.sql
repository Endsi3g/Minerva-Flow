-- Language used for emails and notifications sent to a customer.
-- French stays the default (Loi 96); English is chosen from the language the
-- customer used when signing up. Server-side messages read this column.
alter table public.customers
  add column if not exists preferred_language text not null default 'fr';

alter table public.customers
  drop constraint if exists customers_preferred_language_check;
alter table public.customers
  add constraint customers_preferred_language_check check (preferred_language in ('fr', 'en'));

comment on column public.customers.preferred_language is
  'fr | en. Language of emails and notifications sent to this customer.';
