-- steady — WP2 timeline display mode (additive-only).
-- Shared-project rules: never alter bloom's tables. New `steady_*` only.
--
-- Adds per-entry display_mode ('card' | 'compact') to steady_timeline_entries.
-- Existing rows backfill to 'card' via the column default.

alter table public.steady_timeline_entries
  add column if not exists display_mode text not null default 'card'
  constraint steady_timeline_entries_display_mode_check check (display_mode in ('card', 'compact'));