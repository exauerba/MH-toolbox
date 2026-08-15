-- steady — WP2 timeline tables (additive-only).
-- Shared-project rules: never alter bloom's tables. New `steady_*` only.
--
-- Tables: steady_timeline_entries, steady_timeline_zones, steady_timeline_images.

-- ---------- steady_timeline_entries ----------
-- A timeline event or period. Ordering is (start_date, created_at); editing the
-- date is "reordering" (an explicit sort_order is a later add if ever wanted).
create table if not exists public.steady_timeline_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date,
  description text,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint steady_timeline_entries_title_length check (char_length(title) <= 80)
);

create index if not exists steady_timeline_entries_user_start_idx
  on public.steady_timeline_entries (user_id, start_date);

alter table public.steady_timeline_entries enable row level security;

create policy "steady_timeline_entries owner select" on public.steady_timeline_entries
  for select using (auth.uid() = user_id);
create policy "steady_timeline_entries owner insert" on public.steady_timeline_entries
  for insert with check (auth.uid() = user_id);
create policy "steady_timeline_entries owner update" on public.steady_timeline_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "steady_timeline_entries owner delete" on public.steady_timeline_entries
  for delete using (auth.uid() = user_id);

-- ---------- steady_timeline_zones ----------
-- User-defined bands drawn behind the timeline. `end_date` null = ongoing.
create table if not exists public.steady_timeline_zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint steady_timeline_zones_name_length check (char_length(name) <= 40)
);

alter table public.steady_timeline_zones enable row level security;

create policy "steady_timeline_zones owner select" on public.steady_timeline_zones
  for select using (auth.uid() = user_id);
create policy "steady_timeline_zones owner insert" on public.steady_timeline_zones
  for insert with check (auth.uid() = user_id);
create policy "steady_timeline_zones owner update" on public.steady_timeline_zones
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "steady_timeline_zones owner delete" on public.steady_timeline_zones
  for delete using (auth.uid() = user_id);

-- ---------- steady_timeline_images ----------
-- Child of an entry (≤5 per entry, enforced app-side against this table).
-- `storage_path` points into the private `steady-media` bucket at
-- {user_id}/{entry_id}/{uuid}{ext}.
create table if not exists public.steady_timeline_images (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.steady_timeline_entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists steady_timeline_images_entry_idx
  on public.steady_timeline_images (entry_id);

alter table public.steady_timeline_images enable row level security;

create policy "steady_timeline_images owner select" on public.steady_timeline_images
  for select using (auth.uid() = user_id);
create policy "steady_timeline_images owner insert" on public.steady_timeline_images
  for insert with check (auth.uid() = user_id);
create policy "steady_timeline_images owner update" on public.steady_timeline_images
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "steady_timeline_images owner delete" on public.steady_timeline_images
  for delete using (auth.uid() = user_id);
