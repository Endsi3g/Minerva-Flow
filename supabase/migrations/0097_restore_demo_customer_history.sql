-- Restores the dev-test customer's points/visit history that was reset to
-- zero in 0089_fix_demo_restaurant_pointer.sql when moving the customer
-- off the wrong restaurant — the user only wanted the restaurant pointer
-- fixed, not their accumulated test progress wiped. Recreates the same 4
-- visits + 1 adjustment (same dates/point deltas the customer had before,
-- totaling 180 points / 4 visits / ~$152 spent) under the now-correct
-- restaurant instead of the old one.

begin;

update customers
set loyalty_points = 180,
    visit_count = 4,
    total_spent = 152.00,
    last_visit_at = '2026-09-03 12:00:00+00'
where user_id = 'f43acb06-4025-4953-b225-666587619c64'
  and restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

insert into loyalty_transactions (restaurant_id, customer_id, type, amount_spent, points_delta, created_at) values
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'visite', 32.00, 40, '2026-08-07 12:00:00+00'),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'visite', 36.00, 45, '2026-08-17 12:00:00+00'),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'visite', 44.00, 55, '2026-08-27 12:00:00+00'),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'visite', 40.00, 50, '2026-09-03 12:00:00+00'),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'ajustement', null, -10, '2026-09-04 12:00:00+00');

commit;
