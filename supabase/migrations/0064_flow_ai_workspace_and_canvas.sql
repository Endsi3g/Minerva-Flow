-- Minerva Flow — Flow AI Workspace, Canvas Docs, RAG Dossiers & Custom Agents
-- Version 0064

-- ── 1. Extensions de la table chat_conversations ───────────────────────────
alter table chat_conversations
  add column if not exists is_pinned boolean not null default false,
  add column if not exists agent_id text not null default 'general',
  add column if not exists active_dossiers text[] not null default array['menu', 'finance', 'loyalty', 'operations']::text[];

create index if not exists idx_chat_conversations_pinned
  on chat_conversations (restaurant_id, is_pinned desc, updated_at desc);

-- ── 2. Documents Canvas WYSIWYG ───────────────────────────────────────────
create table if not exists chat_canvas_docs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  conversation_id uuid references chat_conversations (id) on delete set null,
  title text not null default 'Document sans titre',
  content text not null default '',
  content_json jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_canvas_docs_restaurant
  on chat_canvas_docs (restaurant_id, updated_at desc);

create index if not exists idx_chat_canvas_docs_conversation
  on chat_canvas_docs (conversation_id, updated_at desc);

alter table chat_canvas_docs enable row level security;

create policy "chat_canvas_docs_select" on chat_canvas_docs
  for select using (is_restaurant_member(restaurant_id));

create policy "chat_canvas_docs_insert" on chat_canvas_docs
  for insert with check (is_restaurant_member(restaurant_id));

create policy "chat_canvas_docs_update" on chat_canvas_docs
  for update using (is_restaurant_member(restaurant_id));

create policy "chat_canvas_docs_delete" on chat_canvas_docs
  for delete using (is_restaurant_member(restaurant_id));

-- ── 3. Dossiers Contextuels RAG & Documents de Référence ────────────────────
create table if not exists chat_project_folders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  icon text not null default 'Folder',
  color text not null default '#167F5B',
  is_system boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(restaurant_id, slug)
);

create index if not exists idx_chat_project_folders_restaurant
  on chat_project_folders (restaurant_id);

alter table chat_project_folders enable row level security;

create policy "chat_project_folders_select" on chat_project_folders
  for select using (is_restaurant_member(restaurant_id));

create policy "chat_project_folders_insert" on chat_project_folders
  for insert with check (is_restaurant_member(restaurant_id));

create policy "chat_project_folders_update" on chat_project_folders
  for update using (is_restaurant_member(restaurant_id));

create policy "chat_project_folders_delete" on chat_project_folders
  for delete using (is_restaurant_member(restaurant_id) and not is_system);

create table if not exists chat_project_docs (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references chat_project_folders (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'sop',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_project_docs_folder
  on chat_project_docs (folder_id, updated_at desc);

create index if not exists idx_chat_project_docs_restaurant
  on chat_project_docs (restaurant_id);

alter table chat_project_docs enable row level security;

create policy "chat_project_docs_select" on chat_project_docs
  for select using (is_restaurant_member(restaurant_id));

create policy "chat_project_docs_insert" on chat_project_docs
  for insert with check (is_restaurant_member(restaurant_id));

create policy "chat_project_docs_update" on chat_project_docs
  for update using (is_restaurant_member(restaurant_id));

create policy "chat_project_docs_delete" on chat_project_docs
  for delete using (is_restaurant_member(restaurant_id));

-- ── 4. Agents Personnalisés du Restaurant ──────────────────────────────────
create table if not exists restaurant_custom_agents (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  role text not null,
  avatar text not null default '👨‍🍳',
  description text,
  system_prompt text not null,
  tone text not null default 'expert_chaleureux',
  skills jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_restaurant_custom_agents_restaurant
  on restaurant_custom_agents (restaurant_id, is_active);

alter table restaurant_custom_agents enable row level security;

create policy "restaurant_custom_agents_select" on restaurant_custom_agents
  for select using (is_restaurant_member(restaurant_id));

create policy "restaurant_custom_agents_insert" on restaurant_custom_agents
  for insert with check (is_restaurant_member(restaurant_id));

create policy "restaurant_custom_agents_update" on restaurant_custom_agents
  for update using (is_restaurant_member(restaurant_id));

create policy "restaurant_custom_agents_delete" on restaurant_custom_agents
  for delete using (is_restaurant_member(restaurant_id));
