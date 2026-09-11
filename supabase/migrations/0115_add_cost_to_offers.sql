-- Minerva Flow — Offer margin & owner cost tracking
-- Adds 'cost' (food cost / cost of goods) to the offers table so the owner
-- can track profit margin and food cost percentage on promotional offers.
-- Deliberately staff-facing only — never exposed on public customer routes (/m/*).

begin;

alter table offers
  add column if not exists cost numeric;

commit;
