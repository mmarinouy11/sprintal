-- SPRINTAL — Supabase Schema
-- Run in your Supabase SQL Editor

-- Organizations
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text default '#AADC00',
  plan text default 'trial',
  trial_ends_at timestamptz default (now() + interval '90 days'),
  created_at timestamptz default now()
);

-- Org members (links auth.users to orgs)
create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  full_name text,
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

-- Sprints
create table if not exists sprints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  start_date text,
  end_date text,
  focus text,
  signals text,
  status text default 'Planned',
  closure jsonb,
  created_at timestamptz default now()
);

-- Bets
create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  sprint_id uuid references sprints(id) on delete cascade,
  name text not null,
  owner_area text,
  owner_contact text,
  status text default 'Active',
  signal text default 'Unclear',
  outcome text,
  hypothesis text,
  why_now text,
  indicators jsonb default '[]',
  kill_criteria text,
  scale_trigger text,
  alignment jsonb default '[]',
  revenue text default 'Medium',
  margin text default 'Medium',
  importance text default 'Medium',
  last_reviewed text,
  last_note text,
  is_draft boolean default false,
  source_bet_id uuid references bets(id),
  closure_learning text,
  created_at timestamptz default now()
);

-- Evidence
create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  bet_id uuid references bets(id) on delete cascade,
  date text,
  actual text,
  insight text,
  new_status text,
  action text,
  created_at timestamptz default now()
);

-- Signal checks
create table if not exists signal_checks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  bet_id uuid references bets(id) on delete cascade,
  date text,
  prev_signal text,
  signal text,
  note text,
  created_at timestamptz default now()
);

-- RLS
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table sprints enable row level security;
alter table bets enable row level security;
alter table evidence enable row level security;
alter table signal_checks enable row level security;

-- Policies: users can only access their org's data
create policy "org members can view org" on organizations
  for select using (
    id in (select org_id from org_members where user_id = auth.uid())
  );

-- Allow each user to read their own membership row without a self-referential
-- subquery (invited users otherwise may get zero rows on / and be sent to login).
create policy "org members can view members" on org_members
  for select using (
    user_id = auth.uid()
    or org_id in (select om.org_id from org_members om where om.user_id = auth.uid())
  );

create policy "org members full access sprints" on sprints
  for all using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create policy "org members full access bets" on bets
  for all using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create policy "org members full access evidence" on evidence
  for all using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create policy "org members full access signal_checks" on signal_checks
  for all using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

-- Function: create org + member on signup
create or replace function handle_new_user_org()
returns trigger as $$
declare
  new_org_id uuid;
  org_name text;
  org_slug text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'org_name', 'My Organization');
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6);
  insert into organizations(name, slug) values(org_name, org_slug) returning id into new_org_id;
  insert into org_members(org_id, user_id, role, full_name)
    values(new_org_id, new.id, 'owner', coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user_org();
