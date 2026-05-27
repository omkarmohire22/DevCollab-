-- Users and profiles
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid not null unique,
  email text not null unique,
  full_name text not null,
  username text unique,
  avatar_url text,
  bio text,
  github_url text,
  skills text[] default array[]::text[],
  workspace_role text default 'Member',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  owner_id uuid not null references profiles(id) on delete cascade,
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  status text default 'active',
  created_by uuid not null references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'Member',
  joined_at timestamptz default now(),
  unique(project_id, profile_id)
);

create table if not exists workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'Member',
  joined_at timestamptz default now(),
  unique(workspace_id, profile_id)
);

create table if not exists invitations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  email text not null,
  role text not null default 'Member',
  token text not null unique,
  status text not null default 'pending',
  invited_by uuid not null references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'P2',
  label text,
  assignee text,
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  attachments text[] default array[]::text[],
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists snippets (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete set null,
  title text not null,
  language text not null,
  description text,
  code text not null,
  tags text[] default array[]::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists wiki_pages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  content text,
  slug text not null,
  version integer default 1,
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists activity_feed (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  target text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists whiteboards (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  canvas_data text,
  annotations text[] default array[]::text[],
  diagram_context text,
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id)
);

create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  plan text not null,
  amount numeric(10,2) not null,
  billing_cycle text not null default 'monthly',
  status text not null default 'success',
  card_last4 text,
  card_brand text,
  invoice_id text not null unique,
  created_at timestamptz default now()
);

create extension if not exists "uuid-ossp";

