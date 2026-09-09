-- Demo data only: links the "Café ou thé offert" reward to an actual menu
-- item (Latte) on the demo restaurant, and gives that item a photo — the
-- reward_menu_item_link column already existed but nothing native ever
-- surfaced it, so there was nothing to visually verify against before now
-- (see RewardDetailView.swift's new linked-item card/photo).

update menu_items
set image_url = 'https://picsum.photos/seed/minerva-latte/800/600'
where id = 'e8ce0a24-341e-43da-926b-bcb5ae8ffdec' and image_url is null;

update loyalty_rewards
set menu_item_id = 'e8ce0a24-341e-43da-926b-bcb5ae8ffdec'
where id = 'f43e6de4-d92c-401e-9e52-7dc656572e65';
