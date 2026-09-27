-- steady — Lantern partners: a read-only "partner pane" (additive-only).
-- Shared-project rules: never alter bloom's tables. New `steady_*` only.
--
-- Tables: steady_lantern_partnerships, steady_lantern_current_levels.
-- RPCs:   find_user_by_username(text)      — username → account id.
--         get_partner_status()             — the partner's read-only pane.
--
-- Security model:
--   * Partnerships are owner-scoped, but *asymmetric*: the sharer manages the
--     outgoing side (invite, revoke) while the partner may see and answer the
--     incoming side (accept, decline). Two OR-combined policies express that;
--     neither side can rewrite the pair ids, because the WITH CHECK clause
--     pins them to auth.uid().
--   * The current level is owner-only. A partner never selects that table —
--     they read it through get_partner_status(), which returns text-only
--     content and nothing else from the sharer's account.
--   * There are no anon policies anywhere in this migration. Partnerships
--     require two real accounts.
--
-- The current level is deliberately time-boxed (expires_at = set_at + 60 min)
-- so a stale signal cannot harden into an alarm. Expiry is evaluated by the
-- client for display; there is no cron and the row is replaced, not appended,
-- because steady_lantern_current_levels is unique on (user_id).

-- ---------- steady_lantern_partnerships ----------
-- One row per pair. `sharer_id` owns the scale, `partner_id` is the viewer.
-- status: pending (invited) → active (accepted) | revoked (declined/withdrawn).
create table if not exists public.steady_lantern_partnerships (
  id uuid primary key default gen_random_uuid(),
  sharer_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint steady_lantern_partnerships_distinct_people check (sharer_id <> partner_id),
  constraint steady_lantern_partnerships_pair unique (sharer_id, partner_id)
);

alter table public.steady_lantern_partnerships enable row level security;

-- The sharer sees everything they sent, invites, and may withdraw or re-invite.
-- Split by command because the sharer must never be able to accept their own
-- invitation: only the partner can move a row to 'active'. The UPDATE check
-- therefore allows pending <-> revoked but excludes 'active'. The client
-- re-invites by resetting a revoked row to pending (the unique pair constraint
-- blocks a duplicate insert, so an UPDATE is the only route back).
create policy "steady_lantern_partnerships sharer sees outgoing"
  on public.steady_lantern_partnerships
  for select using (auth.uid() = sharer_id);

create policy "steady_lantern_partnerships sharer invites"
  on public.steady_lantern_partnerships
  for insert with check (auth.uid() = sharer_id and status = 'pending');

create policy "steady_lantern_partnerships sharer withdraws"
  on public.steady_lantern_partnerships
  for update
  using (auth.uid() = sharer_id)
  with check (auth.uid() = sharer_id and status <> 'active');

create policy "steady_lantern_partnerships sharer removes"
  on public.steady_lantern_partnerships
  for delete using (auth.uid() = sharer_id);

-- The partner sees what was sent to them and may accept or decline it. They
-- cannot insert, and the WITH CHECK clause stops them from re-pointing the row
-- at themselves as sharer.
create policy "steady_lantern_partnerships partner answers incoming"
  on public.steady_lantern_partnerships
  for select using (auth.uid() = partner_id);

create policy "steady_lantern_partnerships partner accepts"
  on public.steady_lantern_partnerships
  for update using (auth.uid() = partner_id) with check (auth.uid() = partner_id);

-- RLS alone cannot make the two participant columns immutable: a policy's
-- WITH CHECK can only see the NEW row, and Postgres ORs the checks of every
-- policy that applies. So the partner UPDATE policy (which pins only
-- partner_id) would otherwise let an invitee rewrite sharer_id to any account
-- and then read that account's whole lantern through get_partner_status().
-- A trigger is the only place that can compare the old row to the new one, so
-- the identity of a pair is locked here rather than in a policy.
create or replace function public.steady_lantern_lock_partnership_ids()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sharer_id <> old.sharer_id or new.partner_id <> old.partner_id then
    raise exception 'partnership participants cannot be changed'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists steady_lantern_partnerships_lock_ids on public.steady_lantern_partnerships;

create trigger steady_lantern_partnerships_lock_ids
  before update on public.steady_lantern_partnerships
  for each row execute function public.steady_lantern_lock_partnership_ids();

-- ---------- steady_lantern_current_levels ----------
-- One row per user: where they are right now. Cascade from the level means a
-- scale edit that removes the level clears the status, which is correct — a
-- level that no longer exists cannot be presented as current.
create table if not exists public.steady_lantern_current_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  level_id uuid not null references public.steady_lantern_levels (id) on delete cascade,
  set_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint steady_lantern_current_levels_one_per_user unique (user_id)
);

alter table public.steady_lantern_current_levels enable row level security;

create policy "steady_lantern_current_levels owner all"
  on public.steady_lantern_current_levels
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- find_user_by_username ----------
-- steady signs people in by username, which is the local part of their hidden
-- Supabase email (see AUTH_EMAIL_DOMAIN in src/auth/authCore.ts). Resolving a
-- username therefore means matching on that email.
--
-- SECURITY DEFINER is required because auth.users is not readable by
-- authenticated clients. The function reveals a uuid and nothing else, and only
-- for a username the caller already knows, so it does not widen the account
-- surface. The caller is excluded so nobody can invite themselves.
create or replace function public.find_user_by_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if p_username is null or btrim(p_username) = '' then
    return 'null'::jsonb;
  end if;

  select u.id, u.email into v_row
  from auth.users u
  where lower(u.email) = lower(btrim(p_username)) || '@bloom.app'
    and u.id <> auth.uid()
  limit 1;

  if not found then
    return 'null'::jsonb;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'username', split_part(v_row.email, '@', 1)
  );
end;
$$;

revoke all on function public.find_user_by_username(p_username text) from public;
grant execute on function public.find_user_by_username(p_username text) to authenticated;

-- ---------- get_partner_status ----------
-- The partner pane, in one call. Returns one entry per active partnership where
-- the caller is the partner: the sharer's scale, plus their current level if
-- they have set one. SECURITY DEFINER so the partner never needs (and never
-- gets) row access to the sharer's tables.
--
-- Text-only by construction: the function projects exactly these fields. It
-- never returns image paths, the scale id, email addresses, or any other row
-- from the sharer's account. `currentLevel` is the sharer's most recent row;
-- expiry is intentionally left for the client to interpret.
create or replace function public.get_partner_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(entry order by entry->>'sharerUsername')
    from (
      select jsonb_build_object(
        'sharerId', p.sharer_id,
        'sharerUsername', split_part(sharer.email, '@', 1),
        'scaleName', s.name,
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
        ), '[]'::jsonb),
        'currentLevel', (
          select jsonb_build_object(
            'id', cl.id,
            'levelId', cl.level_id,
            'setAt', cl.set_at,
            'expiresAt', cl.expires_at,
            'position', cur.position,
            'label', cur.label,
            'description', cur.description,
            'actions', cur.actions
          )
          from public.steady_lantern_current_levels cl
          join public.steady_lantern_levels cur on cur.id = cl.level_id
          where cl.user_id = p.sharer_id
          order by cl.set_at desc
          limit 1
        )
      ) as entry
      from public.steady_lantern_partnerships p
      join auth.users sharer on sharer.id = p.sharer_id
      left join public.steady_lantern_scales s on s.user_id = p.sharer_id
      where p.partner_id = auth.uid()
        and p.status = 'active'
    ) rows
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_partner_status() from public;
grant execute on function public.get_partner_status() to authenticated;
