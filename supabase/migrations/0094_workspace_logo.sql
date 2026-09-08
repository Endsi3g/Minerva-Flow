-- Lets a franchise owner configure a shared brand image for their
-- workspace — shown as the sharp foreground image on the native app's
-- "other locations" carousel cards (MenuView.swift's franchiseCardImage),
-- which previously always fell back to a generic storefront icon since no
-- per-restaurant photo is required for a location to exist.

begin;

alter table workspaces add column if not exists logo_url text;

commit;
