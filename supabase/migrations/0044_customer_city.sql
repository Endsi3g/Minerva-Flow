-- Lets a loyalty customer record their city from the portal (name only,
-- no street address — kept minimal on purpose) so restaurants can see
-- where their repeat customers come from geographically. Nullable: every
-- existing customer row simply has no city until they (or staff) fill it in.
alter table customers add column if not exists city text;
