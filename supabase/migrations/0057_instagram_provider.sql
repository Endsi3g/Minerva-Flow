-- Adds "instagram" as its own ad_provider / ad_channel value, distinct from
-- "meta" (which stays scoped to Meta Ads attribution). Content-publishing
-- scopes (instagram_basic, instagram_content_publish, pages_show_list,
-- pages_read_engagement) are a different consent grant than the Ads-only
-- scope (ads_read, business_management) — an owner may connect one without
-- the other, so they need separate rows in ad_platform_connections rather
-- than overloading the existing "meta" row with mixed scopes.
--
-- Additive-only (ALTER TYPE ... ADD VALUE), safe to run against a live
-- database — existing "meta"/"google" rows and the RLS policies on
-- ad_platform_connections (which check role, not provider) are unaffected.

alter type ad_provider add value 'instagram';
alter type ad_channel add value 'instagram';
