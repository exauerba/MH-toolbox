-- steady — security hardening (additive-only).
-- Applies three findings from the 2026-08 security audit to databases that
-- already ran migrations 002/003. Idempotent: safe to run repeatedly.
--
--   M1: steady_timeline_images INSERT now verifies the referenced entry_id
--       belongs to the caller (was: existence-only FK).
--   M2: storage.objects RLS explicitly enabled (was: implicit platform default).
--   M3: steady-media uploads restricted to image extensions server-side
--       (was: client-only MIME check).
--
-- M2 and M3 both touch `storage.objects`, which is owned by
-- `supabase_storage_admin`. A plain `postgres` connection lacks ownership and
-- would abort the whole migration, so those statements are guarded and report
-- a NOTICE instead. Neither is load-bearing: the platform enables RLS on
-- storage.objects by default (M2), and M3 is enforced through the bucket's
-- `allowed_mime_types`, which the Storage API applies regardless of ownership.

-- M2 — make storage.objects RLS explicit (no-op if already enabled).
do $$
begin
  alter table storage.objects enable row level security;
exception
  when insufficient_privilege then
    raise notice 'M2 skipped: no ownership of storage.objects (RLS is on by default)';
end $$;

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

-- M3 (a) — restrict the bucket to image types. Enforced by the Storage API,
-- so it applies without owning storage.objects.
do $$
begin
  update storage.buckets
     set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
   where id = 'steady-media';
exception
  when insufficient_privilege then
    raise notice 'M3(a) skipped: insufficient privilege on storage.buckets';
end $$;

-- M3 (b) — tighten the owner-insert policy itself, where the running role owns
-- storage.objects (or is superuser). Mirrors M3(a).
do $$
begin
  drop policy if exists "steady-media owner insert" on storage.objects;
  create policy "steady-media owner insert" on storage.objects
    for insert with check (
      bucket_id = 'steady-media'
      and auth.uid()::text = owner_id
      and (storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp'))
    );
exception
  when insufficient_privilege then
    raise notice 'M3(b) skipped: no ownership of storage.objects (M3(a) covers it)';
end $$;
