-- steady — WP2 storage (additive-only).
-- Private bucket for timeline images + owner-scoped RLS on storage.objects.
-- Existence-guarded (DO block) so re-running is a no-op.
--
-- Cloud schema note: storage.objects.owner_id is TEXT on current Supabase
-- (classic schema had uuid), so auth.uid() must be cast to text. bucket_id is
-- text. Verified against project xxtavjeetzvtlhwoenho (PG 17).

-- ---------- steady-media bucket ----------
insert into storage.buckets (id, name, public)
values ('steady-media', 'steady-media', false)
on conflict (id) do nothing;

-- ---------- storage.objects policies (scoped to the steady-media bucket) ----------
-- Objects live at {user_id}/{entry_id}/{uuid}{ext}. `owner_id` is set by
-- Supabase Storage on upload from the authenticated client.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'steady-media owner select'
  ) then
    create policy "steady-media owner select" on storage.objects
      for select using (bucket_id = 'steady-media' and auth.uid()::text = owner_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'steady-media owner insert'
  ) then
    create policy "steady-media owner insert" on storage.objects
      for insert with check (bucket_id = 'steady-media' and auth.uid()::text = owner_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'steady-media owner update'
  ) then
    create policy "steady-media owner update" on storage.objects
      for update using (bucket_id = 'steady-media' and auth.uid()::text = owner_id)
      with check (bucket_id = 'steady-media' and auth.uid()::text = owner_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'steady-media owner delete'
  ) then
    create policy "steady-media owner delete" on storage.objects
      for delete using (bucket_id = 'steady-media' and auth.uid()::text = owner_id);
  end if;
end $$;