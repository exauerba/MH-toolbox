-- steady — WP2 lantern tables (additive-only).
-- Shared-project rules: never alter bloom's tables. New `steady_*` only.
--
-- Tables: steady_lantern_scales, steady_lantern_levels,
--         steady_lantern_images, steady_lantern_shares.
-- RPC:    get_shared_scale(p_token uuid) — text-only public share read.
--
-- Security model: every table is owner-only under RLS. The share link is the
-- single exception: anon/authenticated may call get_shared_scale() with a
-- token, which returns only name/levelCount/levels (no image paths, no user
-- metadata, no scale id). No anon policies exist on any steady_lantern_* table.

-- ---------- steady_lantern_scales ----------
-- The user's single lantern scale. `level_count` is 3–12 (default 10).
create table if not exists public.steady_lantern_scales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  name text not null default 'My Lantern',
  level_count integer not null default 10 check (level_count between 3 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.steady_lantern_scales enable row level security;

create policy "steady_lantern_scales owner all" on public.steady_lantern_scales
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- steady_lantern_levels ----------
-- One row per level, ordered by `position` (1 = most grounded … level_count).
-- `actions` is the list of things people nearby can do to help.
create table if not exists public.steady_lantern_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  scale_id uuid not null references public.steady_lantern_scales (id) on delete cascade,
  position integer not null,
  label text not null,
  description text not null default '',
  actions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists steady_lantern_levels_scale_position_idx
  on public.steady_lantern_levels (scale_id, position);

alter table public.steady_lantern_levels enable row level security;

create policy "steady_lantern_levels owner all" on public.steady_lantern_levels
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- steady_lantern_images ----------
-- Image metadata for a level. Bytes live in the private steady-media bucket
-- at {userId}/{levelId}/{uuid}{ext}; `storage_path` mirrors that location.
create table if not exists public.steady_lantern_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  level_id uuid not null references public.steady_lantern_levels (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.steady_lantern_images enable row level security;

create policy "steady_lantern_images owner all" on public.steady_lantern_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- steady_lantern_shares ----------
-- A partner share link. `token` is the uuid embedded in the public URL;
-- `revoked_at` null = active. Owner-only under RLS.
create table if not exists public.steady_lantern_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  scale_id uuid not null references public.steady_lantern_scales (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  label text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.steady_lantern_shares enable row level security;

create policy "steady_lantern_shares owner all" on public.steady_lantern_shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- get_shared_scale ----------
-- The only door for share-link visitors. Returns text-only scale content for
-- an active token, or SQL NULL when the token is unknown/revoked. SECURITY
-- DEFINER so anon callers never touch the tables directly; search_path is
-- locked to public to prevent search-path hijacking.
create or replace function public.get_shared_scale(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scale jsonb;
begin
  select jsonb_build_object(
    'name', s.name,
    'levelCount', s.level_count,
    'levels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', l.position,
        'label', l.label,
        'description', l.description,
        'actions', l.actions
      ) order by l.position)
      from public.steady_lantern_levels l
      where l.scale_id = s.id
    ), '[]'::jsonb)
  )
  into v_scale
  from public.steady_lantern_scales s
  join public.steady_lantern_shares sh on sh.scale_id = s.id
  where sh.token = p_token and sh.revoked_at is null;

  return coalesce(v_scale, 'null'::jsonb);
end;
$$;

revoke all on function public.get_shared_scale(p_token uuid) from public;
grant execute on function public.get_shared_scale(p_token uuid) to anon, authenticated;