-- Portail libre-service employé (/mon-espace) : un employé doit pouvoir
-- lire ses propres quarts et revues de performance. Les policies select
-- existantes sur employee_shifts/employee_reviews (0010_...sql) étaient un
-- simple is_restaurant_member(restaurant_id) : n'importe quel membre actif
-- du restaurant pouvait donc déjà lire les quarts/revues de *tous* les
-- employés, pas seulement les siens. On resserre ici : owner/manager
-- gardent l'accès complet ; les autres rôles ne voient que les lignes de
-- l'employé auquel leur compte est lié (employees.linked_user_id).

begin;

drop policy if exists "employee_shifts_select" on employee_shifts;
create policy "employee_shifts_select" on employee_shifts for select
  using (
    is_restaurant_member(restaurant_id, array['owner','manager']::member_role[])
    or (
      is_restaurant_member(restaurant_id)
      and exists (
        select 1 from employees e
        where e.id = employee_shifts.employee_id and e.linked_user_id = auth.uid()
      )
    )
  );

drop policy if exists "employee_reviews_select" on employee_reviews;
create policy "employee_reviews_select" on employee_reviews for select
  using (
    is_restaurant_member(restaurant_id, array['owner','manager']::member_role[])
    or (
      is_restaurant_member(restaurant_id)
      and exists (
        select 1 from employees e
        where e.id = employee_reviews.employee_id and e.linked_user_id = auth.uid()
      )
    )
  );

commit;
