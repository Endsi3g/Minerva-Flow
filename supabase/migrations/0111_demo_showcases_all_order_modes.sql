-- 0111_demo_showcases_all_order_modes.sql
-- Item #12: without this, the demo restaurant defaults to {immediat,sur_place}
-- like every other restaurant, and a prospect exploring the demo would never
-- see the third order mode ("prep_apres_paiement") at all.

begin;

update restaurants
set order_modes_enabled = '{immediat,sur_place,prep_apres_paiement}'
where id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

commit;
