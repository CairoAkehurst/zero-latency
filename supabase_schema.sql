-- ==============================================================================
-- Supabase Schema for AgentMail
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create Users Table (Linked to Supabase Auth)
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  google_refresh_token text,
  google_access_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Categories Table
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Insert Default Notion Mail AI Categories
insert into public.categories (name, slug, color) values
  ('Project updates', 'project-updates', 'blue'),
  ('Leadership updates', 'leadership-updates', 'orange'),
  ('Sales leads', 'sales-leads', 'purple'),
  ('Hiring leads', 'hiring-leads', 'pink'),
  ('Meeting requests', 'meeting-requests', 'green'),
  ('Urgent', 'urgent', 'red')
on conflict do nothing;

-- 4. Create Emails Table
create table if not exists public.emails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  google_message_id text not null unique,
  google_thread_id text not null,
  sender_name text,
  sender_email text not null,
  subject text,
  body_text text,
  body_html text,
  snippet text,
  is_unread boolean default true,
  received_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create AI Summaries & Metadata Table
create table if not exists public.email_ai_metadata (
  id uuid default gen_random_uuid() primary key,
  email_id uuid references public.emails(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  tldr text,
  action_required boolean default false,
  suggested_reply text,
  action_payload jsonb,
  processed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.emails enable row level security;
alter table public.email_ai_metadata enable row level security;

-- 7. RLS Policies
create policy "Users can view and update their own profile"
  on public.users for all
  using (auth.uid() = id);

create policy "Categories are viewable by all authenticated users"
  on public.categories for select
  to authenticated
  using (true);

create policy "Categories can be created by authenticated users"
  on public.categories for insert
  to authenticated
  with check (true);

create policy "Categories can be deleted by authenticated users"
  on public.categories for delete
  to authenticated
  using (true);

create policy "Users can view and manage their own emails"
  on public.emails for all
  using (auth.uid() = user_id);

create policy "Users can view metadata of their own emails"
  on public.email_ai_metadata for all
  using (
    exists (
      select 1 from public.emails
      where emails.id = email_ai_metadata.email_id
      and emails.user_id = auth.uid()
    )
  );
