-- RestaurantDetailView's photo carousel already works end-to-end (owner
-- uploads via /etablissement's RestaurantGalleryUpload -> restaurants.image_urls
-- -> /api/portal/discover/[id] -> native photoCarousel), but every demo
-- restaurant had an empty image_urls, so the header showed nothing above
-- the title (confirmed via screenshot). Seeds real, stable, freely-licensed
-- placeholder photos (picsum.photos, a well-known reliable image service —
-- the stable picsum.photos/id/<n>/<w>/<h> URL, not the ephemeral signed
-- redirect target it 302s to) so the already-built carousel has something
-- to show for demo/testing purposes.

begin;

update restaurants set image_urls = array[
  'https://picsum.photos/id/292/1200/800',
  'https://picsum.photos/id/225/1200/800',
  'https://picsum.photos/id/1080/1200/800'
] where id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

update restaurants set image_urls = array[
  'https://picsum.photos/id/431/1200/800',
  'https://picsum.photos/id/1060/1200/800'
] where id = 'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

update restaurants set image_urls = array[
  'https://picsum.photos/id/312/1200/800',
  'https://picsum.photos/id/163/1200/800'
] where id = 'c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c';

update restaurants set image_urls = array[
  'https://picsum.photos/id/1076/1200/800',
  'https://picsum.photos/id/1069/1200/800'
] where id = 'd4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e';

commit;
