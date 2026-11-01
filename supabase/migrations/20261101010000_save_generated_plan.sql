-- Generated tasks are tracked so regenerating a plan replaces only the planner's own
-- unfinished tasks; tasks the user added or completed are never touched.
alter table public.tasks add column generated boolean not null default false;

-- Saves a validated plan, its budget allocation and its checklist in one transaction.
-- SECURITY INVOKER: runs as the calling user, so RLS and the composite foreign keys apply.
create function public.save_generated_plan(p_event_id uuid, p_plan jsonb, p_expenses jsonb, p_tasks jsonb)
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_version integer;
begin
  -- Locks the event row so concurrent generations get distinct version numbers.
  perform 1 from public.events where id = p_event_id and user_id = v_user for update;
  if not found then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.event_plans where event_id = p_event_id;
  insert into public.event_plans (event_id, user_id, version, plan) values (p_event_id, v_user, v_version, p_plan);

  -- New estimates replace old ones; recorded actual spend is kept.
  insert into public.expenses (event_id, user_id, category, estimated_minor)
  select p_event_id, v_user, e ->> 'category', (e ->> 'amountMinor')::bigint
  from jsonb_array_elements(p_expenses) e
  on conflict (event_id, category) do update set estimated_minor = excluded.estimated_minor;

  delete from public.tasks where event_id = p_event_id and generated and not completed;
  insert into public.tasks (event_id, user_id, title, priority, kind, due_date, generated)
  select p_event_id, v_user, t ->> 'title', t ->> 'priority', t ->> 'kind', (t ->> 'dueDate')::date, true
  from jsonb_array_elements(p_tasks) t;

  update public.events set status = 'planning' where id = p_event_id and status = 'draft';
  return v_version;
end $$;

revoke execute on function public.save_generated_plan(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_generated_plan(uuid, jsonb, jsonb, jsonb) to authenticated;
