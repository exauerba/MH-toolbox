-- steady — WP2 breathe tables (additive-only).
-- Shared-project rules: never alter bloom's tables. New `steady_*` only.
--
-- Tables: steady_breathe_meds, steady_breathe_checkins, steady_breathe_dose_logs.

-- ---------- steady_breathe_meds ----------
-- A medication the user tracks. `med_type` drives display defaults; the
-- `reminder_hour` is an opt-in local reminder time (null = none).
create table if not exists public.steady_breathe_meds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  med_type text not null check (med_type in ('controller', 'reliever', 'other')),
  reminder_hour integer,
  created_at timestamptz not null default now()
);

alter table public.steady_breathe_meds enable row level security;

create policy "steady_breathe_meds owner all" on public.steady_breathe_meds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- steady_breathe_checkins ----------
-- One check-in per calendar day (at most). `date` is the local YYYY-MM-DD
-- key; the 1–5 ratings are nullable (any field may be left blank).
create table if not exists public.steady_breathe_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  date text not null,
  peak_flow integer,
  symptoms integer,
  sleep integer,
  activity integer,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists steady_breathe_checkins_user_date_idx
  on public.steady_breathe_checkins (user_id, date);

alter table public.steady_breathe_checkins enable row level security;

create policy "steady_breathe_checkins owner all" on public.steady_breathe_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- steady_breathe_dose_logs ----------
-- A medication dose. Multiple per day (one per med per dose). `med_id`
-- references the med it was taken from; `time` is an optional local 'HH:MM'.
create table if not exists public.steady_breathe_dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  med_id uuid not null references public.steady_breathe_meds (id) on delete cascade,
  date text not null,
  time text,
  created_at timestamptz not null default now()
);

alter table public.steady_breathe_dose_logs enable row level security;

create policy "steady_breathe_dose_logs owner all" on public.steady_breathe_dose_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);