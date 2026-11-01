-- Phase 7 security audit fixes.
--
-- 1. Users can write their own rows directly through the Data API (RLS allows it by design),
--    so every limit the API relies on must also hold in the database. Tag lists were checked
--    for count only; each tag is now 1-40 characters, matching shared/src/schemas.ts. This
--    bounds what can reach an AI prompt (and the owner's AI bill).
create function public.tags_valid(tags text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(char_length(t) between 1 and 40), true) from unnest(tags) as t
$$;

alter table public.events
  add constraint events_theme_preferences_valid check (public.tags_valid(theme_preferences)),
  add constraint events_dietary_requirements_valid check (public.tags_valid(dietary_requirements));

-- 2. The dashboard reads a user's tasks and plans by user_id (the same column RLS filters on).
create index tasks_user_idx on public.tasks (user_id);
create index event_plans_user_created_idx on public.event_plans (user_id, created_at desc);

-- 3. Trigger functions are never called directly; drop the default execute grant.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
