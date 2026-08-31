-- Murphy's Desk: database schema
-- Run this once in the Supabase SQL editor.
-- Everything is scoped to a household. A parent sees their learners; a learner sees only themselves.

-- ---------------------------------------------------------------- households

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Household',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- profiles

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  household_id uuid not null references households on delete cascade,
  role text not null check (role in ('parent', 'learner')),
  display_name text not null,
  -- the fixed weekly pace. Mastery gates ordering and repetition; this gates overall progress.
  programme_week int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists profiles_household_idx on profiles (household_id);

-- Helper: the caller's household. security definer so it can read profiles
-- without recursing through the policies defined below.
create or replace function my_household()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from profiles where id = auth.uid()
$$;

create or replace function is_parent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'parent' from profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------- attempts

create table if not exists attempts (
  id bigserial primary key,
  learner_id uuid not null references profiles on delete cascade,
  session_id uuid,
  objective_id text not null,
  template_id text not null,
  seed bigint not null,
  -- 'teach' = worked example shown, 'complete' = last steps blanked, 'solo' = full problem,
  -- 'gate' = mastery check, 'retention' = delayed check
  mode text not null,
  response text,
  is_correct boolean not null,
  misconception_id text,
  latency_ms int,
  -- true when the answer arrived faster than a human could have read the question
  rapid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists attempts_learner_idx on attempts (learner_id, created_at desc);
create index if not exists attempts_objective_idx on attempts (learner_id, objective_id, created_at desc);

-- ---------------------------------------------------------------- mastery

create table if not exists mastery (
  learner_id uuid not null references profiles on delete cascade,
  objective_id text not null,
  -- locked -> available -> learning -> gated -> retained
  status text not null default 'available',
  -- Bayesian knowledge tracing belief that the skill is known
  p_known double precision not null default 0.25,
  rung int not null default 0,             -- 0 worked example, 1 completion, 2 independent
  consecutive_correct int not null default 0,
  consecutive_wrong int not null default 0,
  attempts_count int not null default 0,
  correct_count int not null default 0,
  misconceptions jsonb not null default '{}'::jsonb,
  gate_fails int not null default 0,
  halted boolean not null default false,   -- two failed gates: stop and tell the grown-up
  first_gated_at timestamptz,
  last_seen_at timestamptz,
  primary key (learner_id, objective_id)
);

-- ---------------------------------------------------------------- scheduling

create table if not exists review_state (
  learner_id uuid not null references profiles on delete cascade,
  objective_id text not null,
  due timestamptz not null,
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  state int not null default 0,
  last_review timestamptz,
  retention_rung int not null default 0,
  primary key (learner_id, objective_id)
);

create index if not exists review_due_idx on review_state (learner_id, due);

-- ---------------------------------------------------------------- sessions

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references profiles on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_minutes int not null default 15,
  items_done int not null default 0,
  items_correct int not null default 0
);

create index if not exists sessions_learner_idx on sessions (learner_id, started_at desc);

-- ---------------------------------------------------------------- the wall

create table if not exists wall (
  id bigserial primary key,
  learner_id uuid not null references profiles on delete cascade,
  objective_id text not null,
  text text not null,
  created_at timestamptz not null default now(),
  unique (learner_id, objective_id)
);

-- ---------------------------------------------------------------- flags

-- The "this looks wrong" button. Production error channel.
create table if not exists flags (
  id bigserial primary key,
  learner_id uuid not null references profiles on delete cascade,
  template_id text not null,
  seed bigint not null,
  stem text,
  expected text,
  given text,
  note text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- row level security

alter table households   enable row level security;
alter table profiles     enable row level security;
alter table attempts     enable row level security;
alter table mastery      enable row level security;
alter table review_state enable row level security;
alter table sessions     enable row level security;
alter table wall         enable row level security;
alter table flags        enable row level security;

-- households: readable by members
drop policy if exists households_read on households;
create policy households_read on households for select
  using (id = my_household());

-- profiles: you can always see yourself; a parent sees everyone in the household
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select
  using (id = auth.uid() or (is_parent() and household_id = my_household()));

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (id = auth.uid() or (is_parent() and household_id = my_household()))
  with check (id = auth.uid() or (is_parent() and household_id = my_household()));

drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert
  with check (id = auth.uid());

-- Learner-owned tables. One pattern, applied to each.
-- A learner reads and writes their own rows. A parent in the same household reads them.

do $$
declare t text;
begin
  foreach t in array array['attempts','mastery','review_state','sessions','wall','flags']
  loop
    execute format('drop policy if exists %I_own on %I', t, t);
    execute format($f$
      create policy %I_own on %I for all
        using (
          learner_id = auth.uid()
          or (is_parent() and learner_id in (select id from profiles where household_id = my_household()))
        )
        with check (
          learner_id = auth.uid()
          or (is_parent() and learner_id in (select id from profiles where household_id = my_household()))
        )
    $f$, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- setting up the household
--
-- 1. Create two users in Authentication > Users (yours and hers). Email and password.
-- 2. Copy their user ids.
-- 3. Run the block below with the ids filled in.
--
--   insert into households (id, name) values ('00000000-0000-0000-0000-000000000001', 'Home');
--
--   insert into profiles (id, household_id, role, display_name) values
--     ('<your-user-id>',   '00000000-0000-0000-0000-000000000001', 'parent',  'Dad'),
--     ('<her-user-id>',    '00000000-0000-0000-0000-000000000001', 'learner', 'Murphy');
