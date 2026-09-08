-- The native app's dev-test customer (dev-test@minervaflow.app, used by
-- the #if DEBUG bypass button in AuthView.swift) was linked to a leftover,
-- empty auto-provisioned restaurant from before the OTP/is_customer
-- linking logic existed — a different "Mon restaurant" row than the one
-- actually used for owner-side testing. That empty restaurant, plus the
-- owner-side one *also* having zero menu items/offers/rewards, is what
-- produced "Aucun profil trouvé" / an empty Home & Rewards screen: real
-- customer row, but nothing behind it to show.
--
-- Re-points the demo customer at the real owner-side restaurant and seeds
-- it with a full menu/offers/rewards set, so both the web (owner) and
-- native (customer) sides of manual testing reflect the same restaurant
-- with real data. Never touches auth.users or the customers row's
-- identity — only which restaurant it points to.

begin;

update customers
set restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3'
where user_id = 'f43acb06-4025-4953-b225-666587619c64';

insert into menu_items (restaurant_id, name, category, price, description, active) values
('38038211-f045-4f1c-af96-a44cb51179a3', 'Espresso', 'Boissons', 3.25, 'Simple, double sur demande.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Latte', 'Boissons', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cappuccino', 'Boissons', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Chocolat chaud maison', 'Boissons', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Thé glacé maison', 'Boissons', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Croissant', 'Pâtisserie', 3.25, 'Pur beurre, feuilleté maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pain au chocolat', 'Pâtisserie', 3.50, 'Deux bâtons de chocolat noir.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cookie choco-noisette', 'Pâtisserie', 3.75, 'Cuit sur place chaque matin.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bol déjeuner protéiné', 'Plats', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Toast avocat', 'Plats', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Croque-monsieur', 'Plats', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Salade César au poulet', 'Plats', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger Wagyu', 'Plats', 18.95, 'Boeuf wagyu, cheddar vieilli, oignons caramélisés.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Tarte au citron', 'Desserts', 6.25, 'Citron frais, meringue italienne.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('38038211-f045-4f1c-af96-a44cb51179a3', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café au choix','Pâtisserie au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Formule dîner', 'Un plat principal avec une boisson chaude ou froide.', true, 15.95, array['Plat au choix','Boisson au choix'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('38038211-f045-4f1c-af96-a44cb51179a3', 'Café offert', 60, 'Un café chaud ou glacé de votre choix.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pâtisserie offerte', 90, 'Une pâtisserie au choix, gratuite.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bol déjeuner offert', 180, 'Le bol déjeuner protéiné, gratuit.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger Wagyu offert', 320, 'Notre burger signature, gratuit.', true)
on conflict do nothing;

commit;
