-- Tâches assignées par l'employeur à un employé (checklist simple v1) —
-- affichées côté employeur dans la fiche employé, et côté employé dans
-- /mon-espace. Assignation par employee_id (même clé que
-- employee_shifts/employee_reviews), résolue vers le compte connecté via
-- employees.linked_user_id.

begin;

do $$ begin
  create type employee_task_status as enum ('a_faire', 'fait');
exception when duplicate_object then null;
end $$;

create table if not exists employee_tasks (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  title text not null,
  description text,
  status employee_task_status not null default 'a_faire',
  created_by uuid references auth.users (id),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_tasks_employee on employee_tasks (employee_id, created_at desc);

alter table employee_tasks enable row level security;

drop policy if exists "employee_tasks_select" on employee_tasks;
create policy "employee_tasks_select" on employee_tasks for select
  using (
    is_restaurant_member(restaurant_id, array['owner','manager']::member_role[])
    or (
      is_restaurant_member(restaurant_id)
      and exists (
        select 1 from employees e
        where e.id = employee_tasks.employee_id and e.linked_user_id = auth.uid()
      )
    )
  );

drop policy if exists "employee_tasks_manage_insert" on employee_tasks;
create policy "employee_tasks_manage_insert" on employee_tasks for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

drop policy if exists "employee_tasks_manage_delete" on employee_tasks;
create policy "employee_tasks_manage_delete" on employee_tasks for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- update : owner/manager peuvent tout modifier ; l'employé assigné peut
-- cocher/décocher sa propre tâche (v1 : la policy autorise la ligne
-- entière plutôt qu'une colonne précise, acceptable pour une checklist).
drop policy if exists "employee_tasks_manage_update" on employee_tasks;
create policy "employee_tasks_manage_update" on employee_tasks for update
  using (
    is_restaurant_member(restaurant_id, array['owner','manager']::member_role[])
    or exists (
      select 1 from employees e
      where e.id = employee_tasks.employee_id and e.linked_user_id = auth.uid()
    )
  );

commit;
