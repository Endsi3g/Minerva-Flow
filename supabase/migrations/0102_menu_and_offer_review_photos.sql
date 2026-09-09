-- Menu-item and offer reviews only supported a star rating + comment;
-- restaurant_reviews already supports up to 6 photos (0076). Bringing
-- the other two review types to parity — same column, same cap, reusing
-- the existing "review-images" storage bucket (no new bucket needed,
-- uploadReviewImage in SupabaseManager.swift already writes there).

begin;

alter table menu_item_reviews
  add column if not exists image_urls text[] not null default '{}';

alter table menu_item_reviews
  add constraint menu_item_reviews_image_urls_max_6
    check (array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 6);

alter table offer_reviews
  add column if not exists image_urls text[] not null default '{}';

alter table offer_reviews
  add constraint offer_reviews_image_urls_max_6
    check (array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 6);

commit;
