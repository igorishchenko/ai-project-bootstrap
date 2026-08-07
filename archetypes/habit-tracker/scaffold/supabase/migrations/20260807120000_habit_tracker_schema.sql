-- Habit Tracker starter schema.
--
-- Apply with `npx supabase db push` (remote) or `npx supabase db reset`
-- (local) — see docs/starter-template.md. This is a starting point: extend
-- it, don't treat it as fixed.

create extension if not exists pgcrypto;

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits (id) on delete cascade,
  -- Denormalized: RLS policies read this column directly rather than joining
  -- through `habits` on every check, and it makes the policy below correct
  -- even if `habits.user_id` is ever changed.
  user_id uuid not null references auth.users (id) on delete cascade,
  checked_in_on date not null default current_date,
  created_at timestamptz not null default now(),
  -- One check-in per habit per day — the app relies on this constraint
  -- (a duplicate insert is treated as "already checked in", not an error).
  unique (habit_id, checked_in_on)
);

create index if not exists habit_checkins_habit_id_idx on habit_checkins (habit_id);

alter table habits enable row level security;
alter table habit_checkins enable row level security;

-- Every table gets exactly the same shape of policy: a user reads, writes,
-- updates and deletes only their own rows. `auth.uid()` comes from the JWT
-- the client sends with every request — see technologies/supabase's own
-- setup.md for why this is the entire authorization model here.
create policy "Users manage their own habits"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own check-ins"
  on habit_checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
