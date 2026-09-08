-- 0084 seeded the demo restaurant with a thin 14-item/2-offer café menu —
-- enough to prove the Commander screen could render real data, but nowhere
-- near "a real restaurant and café" as requested for manual testing.
-- Replaces that seed with a genuinely large, categorized menu. Only deletes
-- the menu_items/offers rows THIS project seeded in 0084 for restaurant
-- 38038211 — never touches the customers row, auth.users, or the
-- restaurant row itself (see the standing "never destroy the demo account"
-- constraint). loyalty_rewards is left as-is: its four reward
-- descriptions are free text, not FK-linked to a specific menu_items row,
-- and the anchor items they describe (an espresso-style coffee, a
-- pastry, the protein breakfast bowl, the Wagyu burger) all still exist
-- by name below, so no reward-side change is needed for them to keep
-- reading sensibly.

begin;

delete from offers where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';
delete from menu_items where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';

insert into menu_items (restaurant_id, name, category, price, description, active) values
-- Café & boissons chaudes
('38038211-f045-4f1c-af96-a44cb51179a3', 'Espresso', 'Café & boissons chaudes', 3.25, 'Simple, double sur demande.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Americano', 'Café & boissons chaudes', 3.75, 'Espresso allongé à l''eau chaude.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Latte', 'Café & boissons chaudes', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cappuccino', 'Café & boissons chaudes', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Flat White', 'Café & boissons chaudes', 5.10, 'Double espresso, lait micro-moussé.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Café mocha', 'Café & boissons chaudes', 5.50, 'Espresso, chocolat noir, lait vapeur, chantilly.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Chai latte', 'Café & boissons chaudes', 5.15, 'Thé épicé infusé, lait vapeur.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Chocolat chaud maison', 'Café & boissons chaudes', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Thé en feuilles', 'Café & boissons chaudes', 3.50, 'Sélection de thés noirs, verts et infusions.', true),
-- Boissons froides
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cold brew', 'Boissons froides', 4.75, 'Infusion à froid 18h, servi sur glace.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Iced latte', 'Boissons froides', 5.50, 'Espresso, lait froid, glace.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Thé glacé maison', 'Boissons froides', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Limonade fraise-basilic', 'Boissons froides', 4.95, 'Citron pressé, fraises fraîches, basilic.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Kombucha maison', 'Boissons froides', 5.25, 'Fermentation locale, saveur du moment.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Eau pétillante et citron', 'Boissons froides', 2.75, 'Rafraîchissante, servie glacée.', true),
-- Brunch
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bol déjeuner protéiné', 'Brunch', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Toast avocat', 'Brunch', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Œufs bénédictine', 'Brunch', 14.95, 'Muffin anglais, jambon fumé, sauce hollandaise maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Croque-monsieur', 'Brunch', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pain doré brioché', 'Brunch', 11.50, 'Sirop d''érable, beurre, fruits rouges.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Omelette du chef', 'Brunch', 12.50, 'Fromage suisse, champignons sautés, fines herbes.', true),
-- Entrées
('38038211-f045-4f1c-af96-a44cb51179a3', 'Soupe du jour', 'Entrées', 6.95, 'Recette maison, change chaque semaine.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Planche de fromages québécois', 'Entrées', 16.95, 'Trois fromages locaux, confiture, craquelins.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Calmars frits', 'Entrées', 12.95, 'Panure légère, aïoli citronné.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bruschetta tomates-basilic', 'Entrées', 9.50, 'Pain grillé, tomates fraîches, huile d''olive.', true),
-- Salades
('38038211-f045-4f1c-af96-a44cb51179a3', 'Salade César au poulet', 'Salades', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Salade de quinoa et légumes rôtis', 'Salades', 12.95, 'Quinoa, courge, betterave, vinaigrette érable-moutarde.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Salade grecque', 'Salades', 11.95, 'Feta, olives kalamata, concombre, tomate, oignon rouge.', true),
-- Burgers
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger Wagyu', 'Burgers', 18.95, 'Boeuf wagyu, cheddar vieilli, oignons caramélisés.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger classique maison', 'Burgers', 15.50, 'Boeuf haché frais, laitue, tomate, sauce maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger poulet croustillant', 'Burgers', 15.95, 'Poulet pané, slaw croquant, mayo épicée.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger végé maison', 'Burgers', 14.95, 'Galette de légumineuses maison, avocat, roquette.', true),
-- Pâtes
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pâtes à la carbonara', 'Pâtes', 16.50, 'Pancetta, jaune d''œuf, parmesan, poivre noir.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pâtes bolognaise maison', 'Pâtes', 15.95, 'Sauce mijotée 6h, boeuf et porc.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Risotto aux champignons sauvages', 'Pâtes', 17.95, 'Riz arborio, parmesan, huile de truffe.', true),
-- Sandwichs
('38038211-f045-4f1c-af96-a44cb51179a3', 'Club sandwich classique', 'Sandwichs', 13.95, 'Poulet, bacon, laitue, tomate, mayo maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Panini au jambon et brie', 'Sandwichs', 11.95, 'Jambon fumé, brie, confiture de figues.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Wrap au saumon fumé', 'Sandwichs', 13.50, 'Saumon fumé, fromage à la crème, câpres, aneth.', true),
-- Pizza
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pizza margherita', 'Pizza', 14.95, 'Sauce tomate, mozzarella fraîche, basilic.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pizza pepperoni', 'Pizza', 15.95, 'Pepperoni, mozzarella, sauce tomate épicée.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pizza végétarienne', 'Pizza', 15.50, 'Légumes grillés, feta, pesto.', true),
-- Plats principaux
('38038211-f045-4f1c-af96-a44cb51179a3', 'Saumon grillé, légumes de saison', 'Plats principaux', 22.95, 'Saumon de l''Atlantique, purée maison, légumes rôtis.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bavette de boeuf, frites maison', 'Plats principaux', 24.95, 'Bavette grillée, beurre aux herbes, frites fraîches.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Poitrine de poulet farcie', 'Plats principaux', 19.95, 'Farcie aux épinards et fromage de chèvre.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Curry de légumes et pois chiches', 'Plats principaux', 16.95, 'Lait de coco, riz basmati, coriandre fraîche.', true),
-- Desserts
('38038211-f045-4f1c-af96-a44cb51179a3', 'Tarte au citron', 'Desserts', 6.25, 'Citron frais, meringue italienne.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Gâteau au fromage new-yorkais', 'Desserts', 7.50, 'Coulis de fruits rouges maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Fondant au chocolat', 'Desserts', 7.95, 'Coeur coulant, crème glacée vanille.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cookie choco-noisette', 'Desserts', 3.75, 'Cuit sur place chaque matin.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pain au chocolat', 'Desserts', 3.50, 'Deux bâtons de chocolat noir.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Croissant', 'Desserts', 3.25, 'Pur beurre, feuilleté maison.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('38038211-f045-4f1c-af96-a44cb51179a3', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café ou boisson chaude au choix','Pâtisserie au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Formule dîner', 'Un plat principal avec une boisson chaude ou froide.', true, 15.95, array['Plat au choix (Salades, Burgers, Sandwichs ou Pâtes)','Boisson au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Brunch de la fin de semaine', 'Un plat brunch avec un café ou un jus.', true, 16.95, array['Plat brunch au choix','Café ou boisson froide au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Soirée pizza en duo', 'Deux pizzas au choix pour partager.', true, 27.95, array['Deux pizzas au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Table d''hôte du soir', 'Entrée, plat principal et dessert.', true, 34.95, array['Entrée au choix','Plat principal au choix','Dessert au choix'])
on conflict do nothing;

commit;
