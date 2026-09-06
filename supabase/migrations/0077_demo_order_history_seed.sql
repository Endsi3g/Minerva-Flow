-- Phase 6 of the reviewed feedback batch needs real order_items to rank
-- against ("Populaire près de vous" — see app/api/portal/popular).
-- Production had only 9 order_items total across every restaurant, not
-- enough to demonstrate a real ranking. Seeds a handful of served orders
-- across several demo restaurants, weighting Latte / Phở bò / Croissant
-- so a clear popularity signal exists. Applied directly via execute_sql
-- and verified; this file documents it for repo history (re-running
-- would duplicate orders — there is no natural unique key to dedupe on).

begin;

with o1 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('63f93302-0ab4-431b-b66e-2deba424367c','servie',17.95,2.69,20.64,'Client démo', now() - interval '2 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'dd378740-daed-4cb4-8d8c-563e9f7b886c', 'Tartare de saumon', 17.95, 1 from o1;

with o2 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('63f93302-0ab4-431b-b66e-2deba424367c','servie',14.50,2.17,16.67,'Client démo', now() - interval '5 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'f7024c64-8ea5-4de9-90e4-7e18787353aa', 'Croque-monsieur', 14.50, 1 from o2;

with o3 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('da568e75-dd95-446d-89ef-00a6d46be984','servie',13.00,1.95,14.95,'Client démo', now() - interval '1 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select o3.id, m.id, m.name, m.price, 2 from o3, menu_items m where m.restaurant_id = 'da568e75-dd95-446d-89ef-00a6d46be984' limit 1;

with o4 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('cbfcb330-6d1b-4663-8727-8402dbbf8c0e','servie',10.00,1.50,11.50,'Client démo', now() - interval '3 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select o4.id, m.id, m.name, m.price, 2 from o4, menu_items m where m.restaurant_id = 'cbfcb330-6d1b-4663-8727-8402dbbf8c0e' limit 1;

with o5 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('6b322c70-76d4-4d04-8af9-2ab82fe40333','servie',9.00,1.35,10.35,'Client démo', now() - interval '4 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select o5.id, m.id, m.name, m.price, 1 from o5, menu_items m where m.restaurant_id = '6b322c70-76d4-4d04-8af9-2ab82fe40333' limit 1;

with o6 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('f2a51496-edff-45f9-b3e0-70a43f75f869','servie',13.95,2.09,16.04,'Client démo', now() - interval '1 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, '879c2b75-59e4-4b01-8a0f-4f455f38d0cf', 'Phở bò', 13.95, 2 from o6;
with o7 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('f2a51496-edff-45f9-b3e0-70a43f75f869','servie',13.95,2.09,16.04,'Client démo', now() - interval '3 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, '879c2b75-59e4-4b01-8a0f-4f455f38d0cf', 'Phở bò', 13.95, 3 from o7;

with o8 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('c122ce6e-7cbb-404b-b712-6c055154d7c2','servie',5.25,0.79,6.04,'Client démo', now() - interval '2 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'a924d049-0365-4026-9922-87d03c409529', 'Latte', 5.25, 4 from o8;
with o9 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('c122ce6e-7cbb-404b-b712-6c055154d7c2','servie',5.25,0.79,6.04,'Client démo', now() - interval '5 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'a924d049-0365-4026-9922-87d03c409529', 'Latte', 5.25, 3 from o9;

with o10 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d','servie',3.25,0.49,3.74,'Client démo', now() - interval '1 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'e75a0938-5975-4cb9-bc29-c240200249ab', 'Croissant', 3.25, 5 from o10;

commit;
