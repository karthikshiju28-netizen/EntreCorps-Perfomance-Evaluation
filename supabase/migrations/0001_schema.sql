create extension if not exists citext;

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,              -- 'Project 1' .. 'Project 6' (exact ROSTER strings)
  sort_order int not null default 0,
  active boolean not null default true
);

create table people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,                -- 'First Last', as in ROSTER column C
  role text not null check (role in ('Project Manager','Senior Consultant','Consultant','SLT')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- More than one email per person lets you add a personal Gmail later without touching history.
create table person_emails (
  email citext primary key,
  person_id uuid not null references people(id) on delete cascade
);

create table assignments (
  person_id uuid not null references people(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (person_id, project_id)
);

create table cycles (
  id uuid primary key default gen_random_uuid(),
  term text not null,                     -- e.g. 'Fall 2026'
  round text not null check (round in ('Mid-term Evaluation','Final Evaluation')),
  is_open boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  unique (term, round)
);
create unique index one_open_cycle on cycles (is_open) where is_open;

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles(id),
  form_type text not null check (form_type in ('self','manager','upward','slt')),
  project_id uuid not null references projects(id),
  evaluator_id uuid not null references people(id),
  evaluator_role text not null,           -- snapshot from people.role at submit (trigger)
  evaluatee_id uuid not null references people(id),
  evaluatee_role text not null,           -- snapshot from people.role at submit (trigger)
  technical smallint not null check (technical between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  reliability smallint not null check (reliability between 1 and 5),
  teamwork smallint not null check (teamwork between 1 and 5),
  initiative smallint not null check (initiative between 1 and 5),
  leadership smallint check (leadership between 1 and 5),
  comment text not null check (length(trim(comment)) > 0),
  -- RESPONSES column N: mean of the row's non-blank scores (avgOf_ in the Apps Script)
  eval_avg numeric generated always as (
    (technical + communication + reliability + teamwork + initiative + coalesce(leadership, 0))::numeric
    / (5 + case when leadership is null then 0 else 1 end)
  ) stored,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, form_type, evaluator_id, evaluatee_id, project_id)
);

create table weights (
  component text primary key check (component in ('Self','Manager','Upward','SLT')),
  consultant_pct numeric not null,
  pm_sc_pct numeric not null
);
-- Exact values from the workbook's Weights tab
insert into weights values
  ('Self',    25, 15),
  ('Manager', 60, 25),
  ('Upward',   0, 35),
  ('SLT',     15, 25);

create table app_settings (
  key text primary key,
  value text not null
);
insert into app_settings values
  ('allowed_email_domain', 'illinois.edu'),   -- set to '' to allow any email in person_emails
  ('allow_edits_until_close', 'true'),
  ('pm_sc_peer_reviews', 'true'),            -- PM and SC on a project rate each other (Section 7)
  ('composite_missing', 'renormalize');      -- or 'require_all' (Section 7, Open decisions)

-- Moved here from 0003: referenced by my_tasks() in 0002.
create or replace function current_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select person_id from person_emails
  where email = lower(auth.jwt() ->> 'email')
$$;

create or replace function is_slt() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where id = current_person_id() and role = 'SLT' and active)
$$;

