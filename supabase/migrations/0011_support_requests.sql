-- Minerva Flow — Lot 3 : formulaire de support in-app. L'envoi d'email
-- n'étant pas fonctionnel, les demandes (bug/amélioration/question) sont
-- simplement enregistrées ici pour être consultées plus tard (dashboard
-- Supabase pour l'instant, page d'admin éventuellement).
create table support_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'bug', -- 'bug' | 'amelioration' | 'question'
  subject text not null,
  message text not null,
  status text not null default 'nouveau', -- 'nouveau' | 'en_cours' | 'resolu'
  created_at timestamptz not null default now()
);

create index idx_support_requests_user on support_requests (user_id, created_at desc);

alter table support_requests enable row level security;

create policy "support_requests_insert_own" on support_requests for insert
  with check (user_id = auth.uid());
create policy "support_requests_select_own" on support_requests for select
  using (user_id = auth.uid());
