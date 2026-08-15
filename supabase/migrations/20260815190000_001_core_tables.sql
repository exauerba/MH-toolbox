-- steady — WP2 core tables (additive-only).
-- This project is SHARED with bloom (pink-mood-tracker). Never alter or drop
-- bloom's `trackers` / `entries` tables or their policies/functions. Everything
-- here is new, prefixed `steady_`, and owned per-user via RLS.
--
-- Tables: steady_profiles, steady_pins, steady_jar_days, steady_jar_logs.

-- ---------- steady_profiles ----------
-- One row per user. Mirrors the profile object used by guest (Dexie) mode.
create table if not exists public.steady_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system',
  jar_default_spoons numeric not null default 12,
  jar_reset_hour int not null default 0,
  onboarding_done boolean not null default false,
  local_data_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.steady_profiles enable row level security;

create policy "steady_profiles owner select" on public.steady_profiles
  for select using (auth.uid() = user_id);
create policy "steady_profiles owner insert" on public.steady_profiles
  for insert with check (auth.uid() = user_id);
create policy "steady_profiles owner update" on public.steady_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "steady_profiles owner delete" on public.steady_profiles
  for delete using (auth.uid() = user_id);

-- ---------- steady_pins ----------
-- Ordered pin list for the hub home screen. PK (user_id, tool_id).
create table if not exists public.steady_pins (
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_id text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

alter table public.steady_pins enable row level security;

create policy "steady_pins owner select" on public.steady_pins
  for select using (auth.uid() = user_id);
create policy "steady_pins owner insert" on public.steady_pins
  for insert with check (auth.uid() = user_id);
create policy "steady_pins owner update" on public.steady_pins
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "steady_pins owner delete" on public.steady_pins
  for delete using (auth.uid() = user_id);

-- ---------- steady_jar_days ----------
-- Per-day jar capacity. PK (user_id, date). `total_spoons` numeric so a day can
-- hold fractional capacities just like spent amounts.
create table if not exists public.steady_jar_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  total_spoons numeric not null default 12,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.steady_jar_days enable row level security;

create policy "steady_jar_days owner select" on public.steady_jar_days
  for select using (auth.uid() = user_id);
create policy "steady_jar_days owner insert" on public.steady_jar_days
  for insert with check (auth.uid() = user_id);
create policy "steady_jar_days owner update" on public.steady_jar_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "steady_jar_days owner delete" on public.steady_jar_days
  for delete using (auth.uid() = user_id);

-- ---------- steady_jar_logs ----------
-- One spent-scoop entry. `date` is computed at WRITE time (app-side) from local
-- time + the user's current reset-hour setting; the full `created_at` timestamp
-- is kept so the attribution can be re-derived later. `spent` moves in 0.5 steps.
create table if not exists public.steady_jar_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  spent numeric not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint steady_jar_logs_label_length check (char_length(label) <= 40)
);

alter table public.steady_jar_logs enable row level security;

create policy "steady_jar_logs owner select" on public.steady_jar_logs
  for select using (auth.uid() = user_id);
create policy "steady_jar_logs owner insert" on public.steady_jar_logs
  for insert with check (auth.uid() = user_id);
create policy "steady_jar_logs owner update" on public.steady_jar_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "steady_jar_logs owner delete" on public.steady_jar_logs
  for delete using (auth.uid() = user_id);
