-- Rounds the demo franchise out to 3 locations total so the Commander
-- carousel reads as a real chain rather than a single sibling — two more
-- under the same workspace as 0091 (Laval), each with its own small menu.

begin;

insert into restaurants (id, name, address, city, province, lat, lng, service_model, workspace_id, plan_tier)
values
  (
    'c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c',
    'Minerva Flow — Démo (Vieux-Port)',
    '400 Rue Saint-Paul Est',
    'Montréal',
    'QC',
    45.5075,
    -73.5540,
    'cafe',
    '7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d',
    'essentiel'
  ),
  (
    'd4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e',
    'Minerva Flow — Démo (Québec)',
    '1037 Rue Saint-Jean',
    'Québec',
    'QC',
    46.8123,
    -71.2065,
    'restaurant',
    '7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d',
    'essentiel'
  );

insert into restaurant_members (restaurant_id, user_id, role, status) values
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'fbcf1300-e360-4804-b0a0-46807ccecb4d', 'owner', 'active'),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'fbcf1300-e360-4804-b0a0-46807ccecb4d', 'owner', 'active');

insert into menu_items (restaurant_id, name, category, price, description, active) values
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Espresso', 'Café & boissons chaudes', 3.25, 'Simple, double sur demande.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Cappuccino', 'Café & boissons chaudes', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Cold brew', 'Boissons froides', 4.75, 'Infusion à froid 18h, servi sur glace.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Croissant', 'Pâtisserie', 3.25, 'Pur beurre, feuilleté maison.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Cookie choco-noisette', 'Pâtisserie', 3.75, 'Cuit sur place chaque matin.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Toast avocat', 'Brunch', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Latte', 'Café & boissons chaudes', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Chocolat chaud maison', 'Café & boissons chaudes', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Salade César au poulet', 'Salades', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Burger classique maison', 'Burgers', 15.50, 'Boeuf haché frais, laitue, tomate, sauce maison.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Bavette de boeuf, frites maison', 'Plats principaux', 24.95, 'Bavette grillée, beurre aux herbes, frites fraîches.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Tarte au citron', 'Desserts', 6.25, 'Citron frais, meringue italienne.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café ou boisson chaude au choix','Pâtisserie au choix']),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Formule dîner', 'Un plat principal avec une boisson chaude ou froide.', true, 15.95, array['Plat au choix','Boisson au choix'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Café ou thé offert', 50, 'Tout format, toute la journée.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Menu du jour offert', 450, 'Un menu du jour au choix, un par visite.', true)
on conflict do nothing;

commit;
