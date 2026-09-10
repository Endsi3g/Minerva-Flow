-- 0106_link_dev_test_customer_to_demo.sql
-- Ensures dev-test@minervaflow.app (f43acb06-4025-4953-b225-666587619c64 / b6bdc959-a32f-4239-bd66-d69756c6f208)
-- is properly linked as a customer to the demo restaurant (60a59423-c7a0-4d92-a866-3058f34c17d1)
-- with email populated and realistic test loyalty history.

begin;

-- Ensure email is populated for dev-test customer
update customers
set email = 'dev-test@minervaflow.app',
    name = coalesce(nullif(name, ''), 'Dev Test')
where (user_id = 'f43acb06-4025-4953-b225-666587619c64' or id = 'b6bdc959-a32f-4239-bd66-d69756c6f208');

-- Ensure customer points to the demo restaurant
update customers
set restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1'
where (user_id = 'f43acb06-4025-4953-b225-666587619c64' or id = 'b6bdc959-a32f-4239-bd66-d69756c6f208')
  and restaurant_id != '60a59423-c7a0-4d92-a866-3058f34c17d1';

-- Populate fallback emails for demo customers where missing, so the UI consistently shows emails
update customers
set email = lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) || '@client.minervaflow.app'
where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1'
  and (email is null or email = '')
  and id != 'b6bdc959-a32f-4239-bd66-d69756c6f208';

commit;
