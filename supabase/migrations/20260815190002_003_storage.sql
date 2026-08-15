-- steady — WP2 storage (additive-only).
-- Private bucket for timeline images + owner-scoped RLS on storage.objects.
-- Uses `if not exists` / `on conflict do nothing` so re-running is a no-op.

-- ---------- steady-media bucket ----------
insert into storage.buckets (id, name, public)
values ('steady-media', 'steady-media', false)
on conflict (id) do nothing;

-- ---------- storage.objects policies (scoped to the steady-media bucket) ----------
-- Objects live at {user_id}/{entry_id}/{uuid}{ext}. `owner_id` is set by
-- Supabase Storage on upload from the authenticated client.
create policy if not exists "steady-media owner select" on storage.objects
  for select using (bucket_id = 'steady-media' and auth.uid() = owner_id);

create policy if not exists "steady-media owner insert" on storage.objects
  for insert with check (bucket_id = 'steady-media' and auth.uid() = owner_id);

create policy if not exists "steady-media owner update" on storage.objects
  for update using (bucket_id = 'steady-media' and auth.uid() = owner_id)
  with check (bucket_id = 'steady-media' and auth.uid() = owner_id);

create policy if not exists "steady-media owner delete" on storage.objects
  for delete using (bucket_id = 'steady-media' and auth.uid() = owner_id);
