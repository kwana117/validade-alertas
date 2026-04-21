-- Extensões úteis
create extension if not exists "pgcrypto";

-- Perfis com chat ID do Telegram
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  telegram_chat_id text,
  enable_item_test_button boolean not null default false,
  alert_offsets_days int[] not null default '{7,3,1,0}',
  alert_include_expired boolean not null default true,
  alert_expired_max_days int not null default 7,
  alert_time text not null default '09:00',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists enable_item_test_button boolean not null default false;

alter table public.profiles
  add column if not exists alert_offsets_days int[] not null default '{7,3,1,0}';

alter table public.profiles
  add column if not exists alert_include_expired boolean not null default true;

alter table public.profiles
  add column if not exists alert_expired_max_days int not null default 7;

alter table public.profiles
  add column if not exists alert_time text not null default '09:00';

-- Itens monitorizados
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  expires_at date not null,
  location text not null check (location in ('fridge', 'freezer', 'pantry')),
  status text not null default 'active' check (status in ('active', 'consumed', 'discarded')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Trigger para atualizar o campo updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

-- Trigger para criar perfil automaticamente
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
after insert on auth.users
for each row
execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.items enable row level security;

create policy "Cada utilizador vê o seu perfil"
on public.profiles
for select using (auth.uid() = id);

create policy "Atualizar apenas o próprio perfil"
on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Gerir itens do próprio utilizador"
on public.items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =============================================
-- PRODUTOS FREQUENTES
-- =============================================

-- Tabela de produtos frequentes
create table if not exists public.frequent_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  input_mode text not null check (input_mode in ('date', 'duration')),
  default_duration_days int null,
  allowed_locations text[] not null default array['fridge', 'freezer', 'pantry'],
  usage_count int not null default 0,
  last_used_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, name)
);

-- Indexes para melhorar performance
create index if not exists idx_frequent_items_user_id on public.frequent_items(user_id);
create index if not exists idx_frequent_items_usage on public.frequent_items(user_id, usage_count desc);

-- RLS para frequent_items
alter table public.frequent_items enable row level security;

create policy "Users can view own frequent items"
on public.frequent_items for select
using (auth.uid() = user_id);

create policy "Users can insert own frequent items"
on public.frequent_items for insert
with check (auth.uid() = user_id);

create policy "Users can update own frequent items"
on public.frequent_items for update
using (auth.uid() = user_id);

create policy "Users can delete own frequent items"
on public.frequent_items for delete
using (auth.uid() = user_id);

-- Trigger para updated_at nos frequent_items
drop trigger if exists trg_frequent_items_updated_at on public.frequent_items;
create trigger trg_frequent_items_updated_at
before update on public.frequent_items
for each row
execute function public.set_updated_at();

-- =============================================
-- ABERTURA DE PRODUTOS
-- =============================================

alter table public.items
  add column if not exists opened_at timestamptz null;

alter table public.items
  add column if not exists opened_duration_days int null;

alter table public.frequent_items
  add column if not exists opened_duration_days int null;
