-- steady — security hardening (additive-only).
-- Applies three findings from the 2026-08 security audit to databases that
-- already ran migrations 002/003. Idempotent: safe to run repeatedly.
--
--   M1: steady_timeline_images INSERT now verifies the referenced entry_id
--       belongs to the caller (was: existence-only FK).
--   M2: storage.objects RLS explicitly enabled (was: implicit platform default).
--   M3: steady-media uploads restricted to image extensions server-side
--       (was: client-only MIME check).

-- M2 — make storage.objects RLS explicit (no-op if already enabled).
alter table storage.objects enable row level security;

-- M1 — steady_timeline_images owner insert must also own the referenced entry.
drop policy if exists "steady_timeline_images owner insert" on public.steady_timeline_images;
create policy "steady_timeline_images owner insert" on public.steady_timeline_images
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.steady_timeline_entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );

-- M3 — steady-media owner insert restricted to image extensions.
drop policy if exists "steady-media owner insert" on storage.objects;
create policy "steady-media owner insert" on storage.objects
  for insert with check (
    bucket_id = 'steady-media'
    and auth.uid()::text = owner_id
    and (storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp'))
  );
