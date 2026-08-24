-- Lightweight feature poll + free-text suggestion box on /support. Kept
-- separate from support_requests (bug/question/amelioration tickets, which
-- an admin resolves one at a time) — this is a fire-and-forget signal that
-- gets emailed out, not something anyone replies to in-app.
create table if not exists feature_feedback (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  poll_option text,
  suggestion text,
  created_at timestamptz not null default now(),
  constraint feature_feedback_has_content check (poll_option is not null or suggestion is not null)
);

create index if not exists idx_feature_feedback_user on feature_feedback (user_id, created_at desc);

alter table feature_feedback enable row level security;

drop policy if exists "feature_feedback_insert_own" on feature_feedback;
create policy "feature_feedback_insert_own" on feature_feedback for insert
  with check (user_id = auth.uid());
drop policy if exists "feature_feedback_select_own" on feature_feedback;
create policy "feature_feedback_select_own" on feature_feedback for select
  using (user_id = auth.uid());
