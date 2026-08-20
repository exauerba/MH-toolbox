-- steady — WP2 timeline orientation (additive-only).
-- Adds the per-user timeline orientation preference to steady_profiles so the
-- Vertical/Horizontal choice persists for signed-in users. Nullable: absent
-- means "use the device default" (vertical on mobile, horizontal on desktop).

alter table public.steady_profiles
  add column if not exists timeline_orientation text
  constraint steady_profiles_timeline_orientation_check
  check (timeline_orientation in ('vertical', 'horizontal'));