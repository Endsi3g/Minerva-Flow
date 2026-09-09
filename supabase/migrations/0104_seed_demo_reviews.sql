-- Realistic-looking (fake) reviews across all 4 demo restaurants —
-- restaurant-level, menu-item, and offer reviews — mostly positive with a
-- minority low-rated on purpose: the review-star-gating trigger (0098)
-- automatically marks rating<4 restaurant reviews 'private' and raises a
-- Reputation alert, so this is also what first populates the Reputation
-- page with something real to respond to. A subset of rows get a seeded
-- picsum photo, matching the pattern already used for restaurant/menu
-- photos elsewhere in this session.
--
-- Demo-only: every insert is scoped to the 4 known demo restaurant ids.

begin;

do $$
declare
  v_restaurant record;
  v_item record;
  v_offer record;
  v_customer_ids uuid[];
  v_customer_id uuid;
  v_idx int;
  v_rating int;
  v_comment text;
  v_images text[];
  counter int := 0;

  positive5 text[] := array[
    'Service impeccable et ambiance chaleureuse, on reviendra sans hésiter !',
    'Meilleur café du quartier, le personnel est toujours souriant.',
    'Une valeur sûre — j''y vais chaque semaine, jamais déçu.',
    'Cadre magnifique, plats savoureux, je recommande à 100 %.',
    'Excellent rapport qualité-prix, portions généreuses.',
    'L''équipe est aux petits soins, on se sent comme à la maison.'
  ];
  positive4 text[] := array[
    'Très bonne expérience dans l''ensemble, juste un peu d''attente aux heures de pointe.',
    'Bon plat, service rapide, rien à redire de plus.',
    'J''aime beaucoup cet endroit, le café pourrait être un peu plus chaud.',
    'Belle découverte, on y retournera avec plaisir.'
  ];
  negative text[] := array[
    'Attente beaucoup trop longue pour un service qui n''était pas à la hauteur.',
    'Plat froid à l''arrivée, déçu de mon expérience cette fois.',
    'Le personnel semblait débordé, communication difficile.',
    'Prix élevé pour la qualité reçue, je m''attendais à mieux.'
  ];
  item5 text[] := array[
    'Absolument délicieux, je le recommande fortement !',
    'Un classique réussi, toujours aussi bon.',
    'Portion généreuse et super savoureux.',
    'Mon plat préféré du menu, sans hésitation.'
  ];
  item4 text[] := array[
    'Très bon, j''aurais aimé un peu plus d''assaisonnement.',
    'Bien présenté et savoureux, une valeur sûre.'
  ];
  item3 text[] := array[
    'Correct sans plus, rien d''exceptionnel.'
  ];
  item_neg text[] := array[
    'Un peu déçu, je m''attendais à mieux pour le prix.',
    'Froid à la réception, dommage.'
  ];
  offer5 text[] := array[
    'Excellent rapport qualité-prix pour cette offre, à ne pas manquer !',
    'Profité de cette promo, vraiment satisfait.'
  ];
  offer4 text[] := array[
    'Bonne offre, service au rendez-vous.'
  ];
  offer_neg text[] := array[
    'L''offre était bien mais la quantité un peu juste.'
  ];
begin
  -- Extra walk-in reviewer profiles for the 3 franchise siblings, which
  -- otherwise have 0-1 customer each — not enough distinct people for a
  -- Google-Maps-style spread of reviews. The main demo restaurant already
  -- has 51.
  for v_restaurant in
    select id from restaurants
    where id in (
      'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
      'c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c',
      'd4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e'
    )
  loop
    insert into customers (restaurant_id, name) values
      (v_restaurant.id, 'Camille Roy'),
      (v_restaurant.id, 'Simon Bélanger'),
      (v_restaurant.id, 'Léa Fortin'),
      (v_restaurant.id, 'Nathan Girard'),
      (v_restaurant.id, 'Olivia Bergeron'),
      (v_restaurant.id, 'Antoine Morin');
  end loop;

  -- Restaurant-level reviews: 6 per restaurant, mostly positive.
  for v_restaurant in
    select id from restaurants
    where id in (
      '60a59423-c7a0-4d92-a866-3058f34c17d1',
      'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
      'c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c',
      'd4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e'
    )
  loop
    select array_agg(id) into v_customer_ids from customers where restaurant_id = v_restaurant.id;
    if v_customer_ids is null or array_length(v_customer_ids, 1) < 1 then
      continue;
    end if;

    for v_idx in 1..6 loop
      v_customer_id := v_customer_ids[1 + ((v_idx - 1) % array_length(v_customer_ids, 1))];
      counter := counter + 1;

      if v_idx <= 3 then
        v_rating := 5;
        v_comment := positive5[1 + (counter % array_length(positive5, 1))];
      elsif v_idx <= 5 then
        v_rating := 4;
        v_comment := positive4[1 + (counter % array_length(positive4, 1))];
      else
        v_rating := 2;
        v_comment := negative[1 + (counter % array_length(negative, 1))];
      end if;

      if counter % 5 = 0 then
        v_images := array[format('https://picsum.photos/seed/rrev-%s/700/500', counter)];
      else
        v_images := '{}';
      end if;

      insert into restaurant_reviews (restaurant_id, customer_id, rating, comment, image_urls)
      values (v_restaurant.id, v_customer_id, v_rating, v_comment, v_images)
      on conflict (restaurant_id, customer_id) do nothing;
    end loop;
  end loop;

  -- Menu-item reviews: skip roughly a third of items for an organic look,
  -- up to 2 reviews on the rest.
  counter := 0;
  for v_item in select id, restaurant_id from menu_items where active = true loop
    counter := counter + 1;
    if counter % 3 = 0 then
      continue;
    end if;

    select array_agg(id) into v_customer_ids from customers where restaurant_id = v_item.restaurant_id;
    if v_customer_ids is null or array_length(v_customer_ids, 1) < 1 then
      continue;
    end if;

    for v_idx in 1..least(2, array_length(v_customer_ids, 1)) loop
      v_customer_id := v_customer_ids[1 + ((counter + v_idx - 1) % array_length(v_customer_ids, 1))];

      if v_idx = 1 then
        if counter % 7 = 0 then
          v_rating := 2;
          v_comment := item_neg[1 + (counter % array_length(item_neg, 1))];
        elsif counter % 4 = 0 then
          v_rating := 3;
          v_comment := item3[1 + (counter % array_length(item3, 1))];
        else
          v_rating := 5;
          v_comment := item5[1 + (counter % array_length(item5, 1))];
        end if;
      else
        v_rating := 4;
        v_comment := item4[1 + (counter % array_length(item4, 1))];
      end if;

      if v_idx = 1 and counter % 6 = 0 then
        v_images := array[format('https://picsum.photos/seed/mrev-%s/700/500', counter)];
      else
        v_images := '{}';
      end if;

      insert into menu_item_reviews (menu_item_id, restaurant_id, customer_id, rating, comment, image_urls)
      values (v_item.id, v_item.restaurant_id, v_customer_id, v_rating, v_comment, v_images)
      on conflict (menu_item_id, customer_id) do nothing;
    end loop;
  end loop;

  -- Offer reviews: up to 3 per offer.
  counter := 0;
  for v_offer in select id, restaurant_id from offers where active = true loop
    select array_agg(id) into v_customer_ids from customers where restaurant_id = v_offer.restaurant_id;
    if v_customer_ids is null or array_length(v_customer_ids, 1) < 1 then
      continue;
    end if;

    for v_idx in 1..least(3, array_length(v_customer_ids, 1)) loop
      counter := counter + 1;
      v_customer_id := v_customer_ids[1 + ((counter - 1) % array_length(v_customer_ids, 1))];

      if v_idx = 3 then
        v_rating := 2;
        v_comment := offer_neg[1 + (counter % array_length(offer_neg, 1))];
      elsif v_idx = 2 then
        v_rating := 4;
        v_comment := offer4[1 + (counter % array_length(offer4, 1))];
      else
        v_rating := 5;
        v_comment := offer5[1 + (counter % array_length(offer5, 1))];
      end if;

      insert into offer_reviews (offer_id, restaurant_id, customer_id, rating, comment, image_urls)
      values (v_offer.id, v_offer.restaurant_id, v_customer_id, v_rating, v_comment, '{}')
      on conflict (offer_id, customer_id) do nothing;
    end loop;
  end loop;
end $$;

commit;
