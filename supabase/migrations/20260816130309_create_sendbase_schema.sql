create extension if not exists pgcrypto;

create type public.login_provider as enum ('chzzk', 'soop', 'cime');
create type public.publish_platform as enum ('threads', 'x', 'discord', 'naver_cafe', 'soop');
create type public.post_status as enum ('draft', 'publishing', 'published', 'partial', 'failed');
create type public.destination_status as enum ('pending', 'publishing', 'published', 'failed');

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.login_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  provider public.login_provider not null,
  provider_account_id text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_account_id)
);

create table public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  platform public.publish_platform not null,
  external_account_id text,
  display_name text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null default '',
  content_html text not null default '',
  content_text text not null default '',
  image_urls text[] not null default '{}',
  status public.post_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.post_destinations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  platform public.publish_platform not null,
  status public.destination_status not null default 'pending',
  external_post_id text,
  external_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, platform)
);

create index posts_user_updated_idx on public.posts (user_id, updated_at desc);
create index sessions_token_idx on public.app_sessions (token_hash, expires_at);

alter table public.app_users enable row level security;
alter table public.login_accounts enable row level security;
alter table public.app_sessions enable row level security;
alter table public.platform_connections enable row level security;
alter table public.posts enable row level security;
alter table public.post_destinations enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
