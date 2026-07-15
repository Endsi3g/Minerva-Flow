-- Minerva Flow — Lot 4 : suivi des employés et revues de performance.
--
-- `employees` est distinct de `restaurant_members` : un employé (serveur,
-- cuisinier...) n'a pas forcément de compte dans l'application. Quand il en
-- a un, `linked_user_id` fait le lien vers son compte pour affichage
-- (avatar, etc.) — jamais requis.
create table employees (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  linked_user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  role_title text not null default 'Employé',
  hourly_wage numeric,
  active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_employees_restaurant on employees (restaurant_id);

alter table employees enable row level security;

create policy "employees_select" on employees for select
  using (is_restaurant_member(restaurant_id));
create policy "employees_manage_insert" on employees for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "employees_manage_update" on employees for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "employees_manage_delete" on employees for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Journal de quarts léger — saisi manuellement (par l'employé ou le
-- gérant) plutôt qu'un vrai système de planification, hors scope pour
-- l'instant. Alimente les indicateurs de ponctualité/heures travaillées
-- affichés sur la revue.
create table employee_shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  shift_date date not null,
  hours_worked numeric not null default 0,
  was_late boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_employee_shifts_employee on employee_shifts (employee_id, shift_date desc);

alter table employee_shifts enable row level security;

create policy "employee_shifts_select" on employee_shifts for select
  using (is_restaurant_member(restaurant_id));
create policy "employee_shifts_manage_insert" on employee_shifts for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "employee_shifts_manage_delete" on employee_shifts for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Revue de performance — évaluation manuelle par le propriétaire/gérant.
-- attributed_revenue est saisi à la main (aucune intégration POS par
-- employé n'existe encore) plutôt que calculé automatiquement.
create table employee_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  rating smallint not null check (rating between 1 and 5),
  strengths text,
  improvements text,
  attributed_revenue numeric,
  raise_recommended boolean not null default false,
  reviewer_id uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_employee_reviews_employee on employee_reviews (employee_id, created_at desc);

alter table employee_reviews enable row level security;

create policy "employee_reviews_select" on employee_reviews for select
  using (is_restaurant_member(restaurant_id));
create policy "employee_reviews_manage_insert" on employee_reviews for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "employee_reviews_manage_delete" on employee_reviews for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
