-- steady — WP2 breathe dose-log triggers (additive-only).
-- Adds an optional list of irritants/triggers recorded with a dose.
-- Shared-project rules: never alter bloom's tables. New `steady_*` columns only.

alter table public.steady_breathe_dose_logs
  add column if not exists trigger text[] not null default '{}';
