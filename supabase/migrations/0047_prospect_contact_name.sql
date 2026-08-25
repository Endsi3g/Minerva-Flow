-- Migration 0047: real contact_name column on prospects.
--
-- lib/prospects/types.ts's Prospect type has always declared `contactName`,
-- and the Reach webhook + both MCP tool implementations have always accepted
-- a contactName input, but with no real column to write it to they fell back
-- to burying it inside the free-text `notes` field — so it could never be
-- read back out as a distinct value (mapProspect never populated it, the
-- admin UI never displayed or edited it). Give it a real column, matching
-- how suppliers.contact_name already works correctly.
alter table public.prospects add column if not exists contact_name text;
