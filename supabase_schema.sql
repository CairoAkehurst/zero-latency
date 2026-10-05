-- ==============================================================================
-- Supabase Schema for Zero Latency
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

-- 2. Create Categories Table (For UI mapping of colors to Gmail labels)
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Insert Default Categories
insert into public.categories (name, slug, color) values
  ('Project updates', 'project-updates', 'blue'),
  ('Leadership updates', 'leadership-updates', 'orange'),
  ('Sales leads', 'sales-leads', 'purple'),
  ('Hiring leads', 'hiring-leads', 'pink'),
  ('Meeting requests', 'meeting-requests', 'green'),
  ('Urgent', 'urgent', 'red')
on conflict do nothing;

-- 4. Create AI Summaries & Metadata Table
-- (Modified to reference google_message_id directly instead of a local emails table)
create table if not exists public.email_ai_metadata (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  google_message_id text not null,
  category_id uuid references public.categories(id) on delete set null,
  tldr text,
  action_required boolean default false,
  suggested_reply text,
  action_payload jsonb,
  processed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, google_message_id)
);

-- 5. Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.email_ai_metadata enable row level security;

-- 6. RLS Policies
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

create policy "Users can view and manage metadata of their own emails"
  on public.email_ai_metadata for all
  using (auth.uid() = user_id);

-- 7. Migration / Cleanup Script (Run this carefully if migrating an existing DB)
/*
-- Drop old foreign key constraint if it exists
alter table if exists public.email_ai_metadata drop constraint if exists email_ai_metadata_email_id_fkey;

-- We can't automatically migrate UUID to string if they didn't match google_message_id, 
-- so we might need to recreate the table if the old one exists and you want a fresh start.
drop table if exists public.email_ai_metadata;
drop table if exists public.emails cascade;
*/

-- 8. CRM Table
create table if not exists public.crm (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  company text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.crm enable row level security;

create policy "Users can view their own crm contacts"
  on public.crm for select
  using (auth.uid() = user_id);

create policy "Users can insert their own crm contacts"
  on public.crm for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own crm contacts"
  on public.crm for update
  using (auth.uid() = user_id);

create policy "Users can delete their own crm contacts"
  on public.crm for delete
  using (auth.uid() = user_id);
