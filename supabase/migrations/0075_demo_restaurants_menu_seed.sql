-- Demo-data completeness (Phase 2 of the reviewed feedback batch): four
-- restaurants that already appear on the native discovery map (any
-- restaurant with lat/lng, regardless of workspace) had zero menu items,
-- offers, or rewards — a customer tapping into them saw an empty profile,
-- which is exactly the "les nouveaux restaurants n'ont pas de menu"
-- complaint. Seeds a small, realistic menu/offer/reward/photo set for
-- each so the demo experience is representative end to end. Demo-only
-- data, not tied to any real customer or transaction.

begin;

-- Minerva — Plateau Mont-Royal
insert into menu_items (restaurant_id, name, category, price, description, active) values
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Latte', 'Boissons', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Cappuccino', 'Boissons', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Thé glacé maison', 'Boissons', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Bol déjeuner protéiné', 'Plats', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Toast avocat', 'Plats', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Cookie choco-noisette', 'Desserts', 3.75, 'Cuit sur place chaque matin.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Duo café + pâtisserie', 'Un café au choix avec un cookie, à petit prix.', true, 7.50, array['Café au choix','Cookie choco-noisette'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Café offert', 60, 'Un café chaud ou glacé de votre choix.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Bol déjeuner offert', 180, 'Le bol déjeuner protéiné, gratuit.', true)
on conflict do nothing;

update restaurants set image_urls = array[
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000&q=80',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1000&q=80'
] where id = 'c122ce6e-7cbb-404b-b712-6c055154d7c2' and coalesce(array_length(image_urls, 1), 0) = 0;

-- Minerva — Vieux-Québec
insert into menu_items (restaurant_id, name, category, price, description, active) values
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Chocolat chaud', 'Boissons', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Café allongé', 'Boissons', 3.50, 'Simple, sans détour.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Croissant', 'Pâtisserie', 3.25, 'Pur beurre, feuilleté maison.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Pain au chocolat', 'Pâtisserie', 3.50, 'Deux bâtons de chocolat noir.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Croque-monsieur', 'Plats', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Formule matinale', 'Café allongé et croissant pour bien commencer.', true, 6.00, array['Café allongé','Croissant'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Chocolat chaud offert', 50, 'Notre chocolat chaud maison, gratuit.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Croque-monsieur offert', 150, 'Le classique, gratuit.', true)
on conflict do nothing;

update restaurants set image_urls = array[
  'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=1000&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80'
] where id = '94ddcaa0-51e3-4bd2-9d1e-30e2d696213d' and coalesce(array_length(image_urls, 1), 0) = 0;

-- Mon restaurant (Montréal)
insert into menu_items (restaurant_id, name, category, price, description, active) values
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Limonade maison', 'Boissons', 4.25, 'Citrons frais pressés, sirop léger.', true),
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Burger classique', 'Plats', 15.95, 'Boeuf, cheddar, laitue, tomate, sauce maison.', true),
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Salade César', 'Plats', 12.50, 'Laitue romaine, parmesan, croûtons, poulet grillé.', true),
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Tarte au sucre', 'Desserts', 5.95, 'Recette traditionnelle québécoise.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Combo burger', 'Burger classique avec une limonade maison.', true, 18.95, array['Burger classique','Limonade maison'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Dessert offert', 70, 'La tarte au sucre, gratuite.', true),
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Burger offert', 200, 'Le burger classique, gratuit.', true)
on conflict do nothing;

update restaurants set image_urls = array[
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1000&q=80'
] where id = '996dd4ba-1059-4cd9-8ea9-8436b860ec1b' and coalesce(array_length(image_urls, 1), 0) = 0;

-- Minevra (petit café)
insert into menu_items (restaurant_id, name, category, price, description, active) values
('a991f13e-1f6a-46c2-b024-b4820eb97180', 'Espresso', 'Boissons', 3.00, 'Simple ou double.', true),
('a991f13e-1f6a-46c2-b024-b4820eb97180', 'Sandwich jambon-brie', 'Plats', 9.50, 'Baguette fraîche, jambon blanc, brie.', true)
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('a991f13e-1f6a-46c2-b024-b4820eb97180', 'Espresso offert', 40, 'Un espresso, gratuit.', true)
on conflict do nothing;

update restaurants set image_urls = array[
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000&q=80'
] where id = 'a991f13e-1f6a-46c2-b024-b4820eb97180' and coalesce(array_length(image_urls, 1), 0) = 0;

commit;
