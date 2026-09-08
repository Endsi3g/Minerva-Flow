-- The "franchise" carousel the user asked to add to Commander already
-- exists end-to-end: essentiel-tier customers' /api/portal/discover call
-- is already scoped to same-workspace restaurants only (see
-- lib/data/discovery-scope.ts), MenuView.swift's otherRestaurantsSection
-- already renders that list as a horizontal carousel, and tapping one
-- already opens RestaurantDetailView — full menu/offers browsing AND an
-- "Itinéraire" button (MKMapItem.openInMaps with driving directions). The
-- only reason it showed nothing is the demo restaurant had no
-- workspace_id and no sibling location to show. This creates both.

begin;

insert into workspaces (id, name)
values ('7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d', 'Minerva Flow — Groupe démo');

insert into workspace_members (workspace_id, user_id, role, status)
values ('7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d', 'fbcf1300-e360-4804-b0a0-46807ccecb4d', 'owner', 'active');

update restaurants
set workspace_id = '7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d'
where id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

insert into restaurants (id, name, address, city, province, lat, lng, service_model, workspace_id, plan_tier)
values (
  'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
  'Minerva Flow — Démo (Laval)',
  '1600 Boulevard le Corbusier',
  'Laval',
  'QC',
  45.6066,
  -73.7124,
  'hybrid',
  '7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d',
  'essentiel'
);

insert into restaurant_members (restaurant_id, user_id, role, status)
values ('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'fbcf1300-e360-4804-b0a0-46807ccecb4d', 'owner', 'active');

insert into menu_items (restaurant_id, name, category, price, description, active) values
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Espresso', 'Café & boissons chaudes', 3.25, 'Simple, double sur demande.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Latte', 'Café & boissons chaudes', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Cappuccino', 'Café & boissons chaudes', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Chocolat chaud maison', 'Café & boissons chaudes', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Cold brew', 'Boissons froides', 4.75, 'Infusion à froid 18h, servi sur glace.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Thé glacé maison', 'Boissons froides', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Croissant', 'Pâtisserie', 3.25, 'Pur beurre, feuilleté maison.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Pain au chocolat', 'Pâtisserie', 3.50, 'Deux bâtons de chocolat noir.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Cookie choco-noisette', 'Pâtisserie', 3.75, 'Cuit sur place chaque matin.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Bol déjeuner protéiné', 'Brunch', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Croque-monsieur', 'Brunch', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Salade César au poulet', 'Salades', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café ou boisson chaude au choix','Pâtisserie au choix'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Café ou thé offert', 50, 'Tout format, toute la journée.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Pâtisserie offerte', 90, 'Une pâtisserie au choix, gratuite.', true)
on conflict do nothing;

commit;
