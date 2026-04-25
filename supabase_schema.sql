-- =============================================================
-- Layman App — Supabase Database Schema
-- Run this in the Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Paste & Run
-- =============================================================

-- 1. Create saved_articles table
create table if not exists public.saved_articles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  article_id     text not null,
  headline       text not null,
  image          text,
  content        text[],
  original_headline text,
  original_content  text,
  source         text default '',
  url            text default '',
  saved_at       timestamptz default now(),
  
  -- Prevent duplicate saves for the same user+article
  unique(user_id, article_id)
);

-- 2. Enable Row Level Security
alter table public.saved_articles enable row level security;

-- 3. RLS Policy — users can only access their own rows
create policy "Users can manage their own saved articles"
  on public.saved_articles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Index for faster lookups
create index if not exists saved_articles_user_id_idx
  on public.saved_articles (user_id);

create index if not exists saved_articles_saved_at_idx
  on public.saved_articles (saved_at desc);

-- 5. Grant permissions to anon and authenticated roles
grant select, insert, update, delete on public.saved_articles to authenticated;

-- Done! Your saved_articles table is ready.
