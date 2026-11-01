-- CelebrAI initial schema: profiles, events and per-event child resources.
--
-- Ownership is enforced twice:
--   1. Row Level Security: every policy is `user_id = auth.uid()` for the authenticated role.
--   2. Child tables carry user_id with a composite foreign key to events(id, user_id), so the
--      database refuses to attach a task/expense/plan/conversation to another user's event.
-- Enumerations mirror shared/src/schemas.ts; keep them in sync.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users, created by trigger)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text not null default '' check (char_length(display_name) <= 80),
  time_zone        text not null default 'Asia/Kolkata' check (char_length(time_zone) <= 64),
  default_currency text not null default 'INR' check (default_currency in ('INR', 'USD', 'EUR', 'GBP')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 80), ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status                  text not null default 'draft' check (status in ('draft', 'planning', 'ready', 'completed')),
  occasion                text check (occasion in ('birthday', 'wedding', 'anniversary', 'baby_shower', 'engagement', 'corporate', 'family', 'festival')),
  event_name              text not null check (char_length(event_name) between 1 and 120),
  event_date              date,
  location                text not null default '' check (char_length(location) <= 120),
  guest_count             integer check (guest_count between 1 and 5000),
  budget_minor            bigint not null check (budget_minor between 0 and 9007199254740991),
  currency                text not null default 'INR' check (currency in ('INR', 'USD', 'EUR', 'GBP')),
  venue_preference        text not null default 'flexible' check (venue_preference in ('indoor', 'outdoor', 'flexible')),
  theme_preferences       text[] not null default '{}' check (cardinality(theme_preferences) <= 10),
  age_group               text not null default '' check (char_length(age_group) <= 40),
  dietary_requirements    text[] not null default '{}' check (cardinality(dietary_requirements) <= 10),
  additional_instructions text not null default '' check (char_length(additional_instructions) <= 1000),
  invitation_text         text not null default '' check (char_length(invitation_text) <= 2000),
  invitation_tone         text not null default 'friendly' check (invitation_tone in ('formal', 'friendly', 'traditional', 'modern')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint events_occasion_required check (status = 'draft' or occasion is not null),
  constraint events_id_user_key unique (id, user_id)
);

create index events_user_date_idx on public.events (user_id, event_date);

-- ---------------------------------------------------------------------------
-- event_plans (versioned, validated plan JSON)
-- ---------------------------------------------------------------------------
create table public.event_plans (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null,
  user_id    uuid not null default auth.uid(),
  version    integer not null check (version >= 1),
  plan       jsonb not null check (jsonb_typeof(plan) = 'object'),
  created_at timestamptz not null default now(),
  constraint event_plans_version_key unique (event_id, version),
  constraint event_plans_event_fk foreign key (event_id, user_id) references public.events (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- expenses (one row per budget category: estimate vs actual)
-- ---------------------------------------------------------------------------
create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null,
  user_id         uuid not null default auth.uid(),
  category        text not null check (category in ('venue', 'food', 'decoration', 'photography', 'entertainment', 'invitations', 'miscellaneous', 'contingency')),
  estimated_minor bigint not null check (estimated_minor between 0 and 9007199254740991),
  actual_minor    bigint check (actual_minor between 0 and 9007199254740991),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint expenses_category_key unique (event_id, category),
  constraint expenses_event_fk foreign key (event_id, user_id) references public.events (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- tasks (checklist + dated preparation milestones)
-- ---------------------------------------------------------------------------
create table public.tasks (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null,
  user_id    uuid not null default auth.uid(),
  title      text not null check (char_length(title) between 2 and 200),
  priority   text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  kind       text not null default 'preparation' check (kind in ('preparation', 'vendor', 'invitation', 'shopping')),
  due_date   date,
  completed  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_event_fk foreign key (event_id, user_id) references public.events (id, user_id) on delete cascade
);

create index tasks_event_due_idx on public.tasks (event_id, due_date);

-- ---------------------------------------------------------------------------
-- conversations (one bounded message history per event)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null,
  user_id    uuid not null default auth.uid(),
  messages   jsonb not null default '[]' check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_event_key unique (event_id),
  constraint conversations_event_fk foreign key (event_id, user_id) references public.events (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: authenticated users see and change only their own rows.
-- The anon role gets no table access at all.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_plans enable row level security;
alter table public.expenses enable row level security;
alter table public.tasks enable row level security;
alter table public.conversations enable row level security;

revoke all on public.profiles, public.events, public.event_plans, public.expenses, public.tasks, public.conversations from anon;

create policy "own profile: read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own events" on public.events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own plans" on public.event_plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own expenses" on public.expenses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own tasks" on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own conversations" on public.conversations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
