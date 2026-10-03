-- One shared release history, two readers. Owners get the operational detail;
-- customers get a short list of changes that affect them only. Every existing
-- entry was written for owners, so it defaults to 'owner' and stops appearing
-- in the customer app. Publishing a customer-facing entry is a deliberate act:
-- insert it with audience = 'client' (or 'all' for both).

begin;

alter table public.changelog_entries
  add column if not exists audience text not null default 'owner';

alter table public.changelog_entries
  drop constraint if exists changelog_entries_audience_check;

alter table public.changelog_entries
  add constraint changelog_entries_audience_check
  check (audience in ('owner', 'client', 'all'));

comment on column public.changelog_entries.audience is
  'Qui voit l''entrée : owner (propriétaires), client (clients de l''app), all (les deux).';

create index if not exists changelog_entries_audience_published_idx
  on public.changelog_entries (audience, published_at desc);

commit;
