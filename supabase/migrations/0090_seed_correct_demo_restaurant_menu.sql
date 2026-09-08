-- Applies the expanded restaurant+café menu (originally 0087, wrongly
-- targeted at the user's real restaurant — see 0089) to the actual demo
-- restaurant, "Minerva Flow — Démo" (60a59423), replacing its thin
-- 16-item/2-offer placeholder. Its 4 existing loyalty_rewards are left
-- untouched — generic enough ("Café ou thé offert", "Dessert offert",
-- "10% de rabais", "Menu du jour offert") to keep reading sensibly
-- against this larger menu without any changes.

begin;

delete from offers where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1';
delete from menu_items where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

insert into menu_items (restaurant_id, name, category, price, description, active) values
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Espresso', 'Café & boissons chaudes', 3.25, 'Simple, double sur demande.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Americano', 'Café & boissons chaudes', 3.75, 'Espresso allongé à l''eau chaude.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Latte', 'Café & boissons chaudes', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Cappuccino', 'Café & boissons chaudes', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Flat White', 'Café & boissons chaudes', 5.10, 'Double espresso, lait micro-moussé.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Café mocha', 'Café & boissons chaudes', 5.50, 'Espresso, chocolat noir, lait vapeur, chantilly.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Chai latte', 'Café & boissons chaudes', 5.15, 'Thé épicé infusé, lait vapeur.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Chocolat chaud maison', 'Café & boissons chaudes', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Thé en feuilles', 'Café & boissons chaudes', 3.50, 'Sélection de thés noirs, verts et infusions.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Cold brew', 'Boissons froides', 4.75, 'Infusion à froid 18h, servi sur glace.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Iced latte', 'Boissons froides', 5.50, 'Espresso, lait froid, glace.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Thé glacé maison', 'Boissons froides', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Limonade fraise-basilic', 'Boissons froides', 4.95, 'Citron pressé, fraises fraîches, basilic.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Kombucha maison', 'Boissons froides', 5.25, 'Fermentation locale, saveur du moment.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Eau pétillante et citron', 'Boissons froides', 2.75, 'Rafraîchissante, servie glacée.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Bol déjeuner protéiné', 'Brunch', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Toast avocat', 'Brunch', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Œufs bénédictine', 'Brunch', 14.95, 'Muffin anglais, jambon fumé, sauce hollandaise maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Croque-monsieur', 'Brunch', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pain doré brioché', 'Brunch', 11.50, 'Sirop d''érable, beurre, fruits rouges.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Omelette du chef', 'Brunch', 12.50, 'Fromage suisse, champignons sautés, fines herbes.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Soupe du jour', 'Entrées', 6.95, 'Recette maison, change chaque semaine.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Planche de fromages québécois', 'Entrées', 16.95, 'Trois fromages locaux, confiture, craquelins.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Calmars frits', 'Entrées', 12.95, 'Panure légère, aïoli citronné.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Bruschetta tomates-basilic', 'Entrées', 9.50, 'Pain grillé, tomates fraîches, huile d''olive.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Salade César au poulet', 'Salades', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Salade de quinoa et légumes rôtis', 'Salades', 12.95, 'Quinoa, courge, betterave, vinaigrette érable-moutarde.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Salade grecque', 'Salades', 11.95, 'Feta, olives kalamata, concombre, tomate, oignon rouge.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Burger Wagyu', 'Burgers', 18.95, 'Boeuf wagyu, cheddar vieilli, oignons caramélisés.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Burger classique maison', 'Burgers', 15.50, 'Boeuf haché frais, laitue, tomate, sauce maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Burger poulet croustillant', 'Burgers', 15.95, 'Poulet pané, slaw croquant, mayo épicée.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Burger végé maison', 'Burgers', 14.95, 'Galette de légumineuses maison, avocat, roquette.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pâtes à la carbonara', 'Pâtes', 16.50, 'Pancetta, jaune d''œuf, parmesan, poivre noir.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pâtes bolognaise maison', 'Pâtes', 15.95, 'Sauce mijotée 6h, boeuf et porc.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Risotto aux champignons sauvages', 'Pâtes', 17.95, 'Riz arborio, parmesan, huile de truffe.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Club sandwich classique', 'Sandwichs', 13.95, 'Poulet, bacon, laitue, tomate, mayo maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Panini au jambon et brie', 'Sandwichs', 11.95, 'Jambon fumé, brie, confiture de figues.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Wrap au saumon fumé', 'Sandwichs', 13.50, 'Saumon fumé, fromage à la crème, câpres, aneth.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pizza margherita', 'Pizza', 14.95, 'Sauce tomate, mozzarella fraîche, basilic.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pizza pepperoni', 'Pizza', 15.95, 'Pepperoni, mozzarella, sauce tomate épicée.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pizza végétarienne', 'Pizza', 15.50, 'Légumes grillés, feta, pesto.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Saumon grillé, légumes de saison', 'Plats principaux', 22.95, 'Saumon de l''Atlantique, purée maison, légumes rôtis.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Bavette de boeuf, frites maison', 'Plats principaux', 24.95, 'Bavette grillée, beurre aux herbes, frites fraîches.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Poitrine de poulet farcie', 'Plats principaux', 19.95, 'Farcie aux épinards et fromage de chèvre.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Curry de légumes et pois chiches', 'Plats principaux', 16.95, 'Lait de coco, riz basmati, coriandre fraîche.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Tarte au citron', 'Desserts', 6.25, 'Citron frais, meringue italienne.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Gâteau au fromage new-yorkais', 'Desserts', 7.50, 'Coulis de fruits rouges maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Fondant au chocolat', 'Desserts', 7.95, 'Coeur coulant, crème glacée vanille.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Cookie choco-noisette', 'Desserts', 3.75, 'Cuit sur place chaque matin.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pain au chocolat', 'Desserts', 3.50, 'Deux bâtons de chocolat noir.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Croissant', 'Desserts', 3.25, 'Pur beurre, feuilleté maison.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café ou boisson chaude au choix','Pâtisserie au choix']),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Formule dîner', 'Un plat principal avec une boisson chaude ou froide.', true, 15.95, array['Plat au choix (Salades, Burgers, Sandwichs ou Pâtes)','Boisson au choix']),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Brunch de la fin de semaine', 'Un plat brunch avec un café ou un jus.', true, 16.95, array['Plat brunch au choix','Café ou boisson froide au choix']),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Soirée pizza en duo', 'Deux pizzas au choix pour partager.', true, 27.95, array['Deux pizzas au choix']),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Table d''hôte du soir', 'Entrée, plat principal et dessert.', true, 34.95, array['Entrée au choix','Plat principal au choix','Dessert au choix'])
on conflict do nothing;

commit;
