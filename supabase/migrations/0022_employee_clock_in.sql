-- Pointage employé : ajoute clock_in/clock_out à employee_shifts et permet
-- à un employé de pointer/dépointer lui-même (jusqu'ici seul owner/manager
-- pouvait écrire dans cette table, et il n'existait même pas de politique
-- UPDATE du tout). clock_in/clock_out restent null pour les quarts
-- historiques journalisés manuellement — hours_worked continue d'être la
-- source de vérité pour tout ce qui existe déjà.

begin;

alter table employee_shifts add column if not exists clock_in timestamptz;
alter table employee_shifts add column if not exists clock_out timestamptz;

-- Manquait entièrement : owner/manager ne pouvaient ni corriger un quart
-- ni dépointer un employé sans compte de connexion.
drop policy if exists "employee_shifts_manage_update" on employee_shifts;
create policy "employee_shifts_manage_update" on employee_shifts for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- L'employé peut créer sa propre ligne (pointer) et mettre à jour la ligne
-- qu'il vient de créer (se dépointer) — même précédent que employee_tasks,
-- où l'employé assigné peut modifier sa propre tâche.
drop policy if exists "employee_shifts_self_insert" on employee_shifts;
create policy "employee_shifts_self_insert" on employee_shifts for insert
  with check (
    exists (
      select 1 from employees e
      where e.id = employee_shifts.employee_id
        and e.linked_user_id = auth.uid()
    )
  );

drop policy if exists "employee_shifts_self_update" on employee_shifts;
create policy "employee_shifts_self_update" on employee_shifts for update
  using (created_by = auth.uid())
  with check (
    exists (
      select 1 from employees e
      where e.id = employee_shifts.employee_id
        and e.linked_user_id = auth.uid()
    )
  );

commit;
