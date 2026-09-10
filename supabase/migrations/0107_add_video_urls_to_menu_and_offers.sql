-- 0107_add_video_urls_to_menu_and_offers.sql
-- Adds video_url to menu_items and offers for rich multimedia display in the app.

begin;

alter table menu_items
  add column if not exists video_url text;

alter table offers
  add column if not exists video_url text;

-- Seed demo videos on a couple of demo items and offers so the UI immediately showcases the feature
update menu_items
set video_url = 'https://assets.mixkit.co/videos/preview/mixkit-barista-pouring-coffee-into-a-cup-41142-large.mp4'
where id = (
  select id from menu_items
  where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1'
    and video_url is null
    and (name ilike '%café%' or name ilike '%latte%' or name ilike '%espresso%')
  limit 1
);

update offers
set video_url = 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-delicious-hamburger-40332-large.mp4'
where id = (
  select id from offers
  where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1'
    and video_url is null
  limit 1
);

commit;
