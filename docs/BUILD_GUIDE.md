

# EntreCorps Evaluation App: Claude Code Build Guide
 · 

## How to use this guide with Claude Code
This guide replaces the 4 Google Forms, the RESPONSES merge, and the Scores tab with one web app: Next.js on Vercel, Supabase for the database and Google sign-in. The forms and the math are carried over word for word from the Apps Script and the EntreCorps_Performance_Database workbook; Sections 6 and 7 are the spec and should not be paraphrased.
- 
Create an empty folder (e.g. `entrecorps-evals`) and open Claude Code in it.
- 
Export this doc as Markdown and save it in that folder as `docs/BUILD_GUIDE.md`.
- 
Create `CLAUDE.md` in the folder root with this text:
```
This repo is the EntreCorps evaluation web app.
The full spec is docs/BUILD_GUIDE.md. Read it before every task.
Sections 6 (forms) and 7 (scoring) are exact requirements: copy question text, scales, labels,
required flags and formulas character for character. Do not rename, reword, or "improve" them.
Work one phase at a time (Section 10). Stop at the end of each phase and tell me what to test.
Never put the Supabase service-role key in client code or commit any .env file.

I am a complete beginner at coding. Whenever I need to do something myself:
- Explain it in the most basic way, as numbered steps, one action per step.
- Tell me exactly where to click or what to type, and which window to do it in
  (Terminal, browser, Supabase dashboard, Vercel, Google Cloud).
- Put every command I need to run in its own code block, and say what it does in one plain sentence.
- Tell me what I should see if it worked, and what to do if I see an error instead.
- Define any technical word the first time you use it (e.g. "migration", "environment variable").
- Never assume I know a step; don't skip "obvious" ones like saving a file or restarting the app.
- At the end of each phase, give me a short checklist to test it myself in the browser.

The real roster (names, emails, roles, projects) will come later, after the app is running.
Until then, use the fake test roster in seed/roster.csv, and make me (my own email) the SLT member.
```

- 
Run the Section 10 prompts in order, one per Claude Code session or `/clear` between phases. Test each phase with the Section 12 checklist before moving on.
- 
Do the steps marked You do this yourself (Google Cloud, Supabase dashboard, Vercel). Claude Code cannot click through those dashboards for you.

## Accounts and prerequisites
All of these have free tiers that cover a club of about 60 people.

What | 
Why | 
Who sets it up | 

GitHub account + empty repo | 
Holds the code; Vercel deploys from it | 
You | 

Supabase project | 
Postgres database, Google sign-in, email links, row-level security | 
You create it in the dashboard; Claude Code writes the SQL | 

Google Cloud project + OAuth client (Web application) | 
Gives Supabase the client ID/secret for "Sign in with Google" | 
You (Section 4 has the steps) | 

Vercel account (sign in with GitHub) | 
Hosts the site at a URL like `entrecorps-evals.vercel.app` | 
You | 

Resend account (or any SMTP) | 
Sends the backup email sign-in links; Supabase's built-in mailer is rate-limited too low for a deadline night | 
You | 

Node.js 20+ and Git on your computer | 
Running the app locally while you build | 
You | 

Claude Code | 
Writes the code from this guide | 
Already have | 

Roster: name, @illinois.edu email, role, project for every member | 
Seeds the `people` and `assignments` tables | 
You, later: a fake test roster is used until the app runs, then you import the real one in Admin | 
Roster CSV format Claude Code will expect (`seed/roster.csv`):
```
name,email,role,project
Jane Doe,jdoe2@illinois.edu,Project Manager,Project 1
Sam Lee,slee5@illinois.edu,Senior Consultant,Project 1
Alex Kim,akim9@illinois.edu,Consultant,Project 1
Priya Shah,pshah3@illinois.edu,SLT,
```

Role must be exactly one of `Project Manager`, `Senior Consultant`, `Consultant`, `SLT` (the same strings the forms and ROSTER tab use). SLT rows leave `project` blank. A person on two projects gets two rows.

## Architecture and tech stack
One Next.js app talks to one Supabase project; there is no separate backend server and no Google Sheet in the loop.
[EMBED: system architecture · 3 tiers, 2 sign-in providers]

The browser never decides who can see what. Supabase checks the signed-in user's email against the roster on every query (row-level security), so a consultant cannot read anyone else's evaluations even with developer tools open.

Layer | 
Choice | 
Notes | 

Framework | 
Next.js 15, App Router, TypeScript | 
Server Components + Server Actions; no separate API needed | 

Styling | 
Tailwind CSS + shadcn/ui | 
Ready-made form, table, select, slider components | 

Database | 
Supabase Postgres | 
Tables, views, RLS policies in SQL migrations under `supabase/migrations/` | 

Auth | 
Supabase Auth: Google provider + email magic link | 
Both restricted to `@illinois.edu` (Section 4) | 

Supabase client | 
`@supabase/ssr` | 
Cookie-based sessions for server components and middleware | 

Validation | 
Zod | 
Same schema checks the form in the browser and again on the server | 

Charts | 
Recharts | 
SLT dashboard only | 

Hosting | 
Vercel | 
Auto-deploys on every push to `main` | 
Folder layout Claude Code should create:
```
entrecorps-evals/
  CLAUDE.md
  docs/BUILD_GUIDE.md
  supabase/migrations/        # numbered .sql files: schema, RLS, views
  seed/roster.csv
  scripts/seed-roster.ts      # loads roster.csv with the service-role key (local only)
  src/
    middleware.ts             # refreshes session, redirects signed-out users to /login
    lib/supabase/             # server.ts, client.ts, middleware.ts
    lib/forms.ts              # the 4 form definitions from Section 6 (single source of truth)
    lib/scoring.ts            # TypeScript mirror of Section 7 for unit tests
    app/login/page.tsx
    app/auth/callback/route.ts
    app/(member)/page.tsx                 # My evaluations (to-do list)
    app/(member)/evaluate/[taskId]/page.tsx
    app/(slt)/dashboard/page.tsx
    app/(slt)/dashboard/[personId]/page.tsx
    app/(slt)/admin/page.tsx
  tests/                      # Vitest: scoring + assignment rules
```


## Database schema (SQL)
Eight tables replace ROSTER, RAW_Self/Manager/Upward/SLT, RESPONSES and Weights. One `evaluations` row = one RESPONSES row (one evaluator scoring one evaluatee), so the scoring logic carries over unchanged.

Workbook tab | 
Replaced by | 

ROSTER (Project, Role, Name) | 
`people` + `person_emails` + `assignments` + `projects` | 

RAW_Self, RAW_Manager, RAW_Upward, RAW_SLT | 
`evaluations` (column `form_type` says which form) | 

RESPONSES (15 columns) | 
view `responses` with the same 15 columns | 

"Which round of evaluation is this?" | 
`cycles.round` (SLT opens a round; members no longer pick it) | 

Weights | 
`weights` table, editable by SLT | 

Scores, Dashboard | 
views `component_scores`, `scores`, `project_dashboard` (Section 7) | 
Migration `supabase/migrations/0001_schema.sql`:
```
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
```

The `unique` constraint on `evaluations` means a person submits each evaluation once per round; with `allow_edits_until_close` on, a resubmit updates the same row instead of creating a duplicate.

## Sign-in and access control
Nobody picks their own name. The app reads the verified email from the sign-in, looks it up in `person_emails`, and from that knows the person's name, role and project(s). An email not in the roster gets a "You're not registered, contact SLT" page and can read nothing.

### Sign-in page (exact copy)
- 
Primary button: Sign in with Google (Illinois account)
- 
Under it, small text: First time? Turn on your Illinois Google account at [cloud-dashboard.illinois.edu (set Google Apps @ Illinois to On), then come back.
- 
Divider: or
- 
Email field (placeholder `netid@illinois.edu`) + button Email me a sign-in link
- 
Under it: If Google says it can't find your account, use the email link instead.
Google call (Claude Code writes this):
```
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/auth/callback`,
    queryParams: { hd: 'illinois.edu', prompt: 'select_account' }, // shows only Illinois accounts in the picker
  },
});
```

The `hd` hint is only a hint. The real checks are: (1) `/auth/callback` rejects any email not ending in the `allowed_email_domain` setting, signs the user out and shows an error; (2) the magic-link form refuses non-matching emails before sending; (3) RLS returns nothing for an email that is not in `person_emails`.

### You do this: Google Cloud OAuth client (about 10 minutes)
- 
Go to [console.cloud.google.com, create a project named `EntreCorps Evals`.
- 
APIs & Services > OAuth consent screen: User type External, app name `EntreCorps Evaluations`, your email as support and developer contact. Scopes: `openid`, `email`, `profile` only. Then Publish app (basic scopes need no Google review).
- 
APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
- 
Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (copy it from Supabase > Authentication > Providers > Google).
- 
Paste the Client ID and Client secret into Supabase > Authentication > Providers > Google and enable it.
- 
Supabase > Authentication > URL Configuration: Site URL = your Vercel URL; Redirect URLs = `http://localhost:3000/**` and `https://<your-app>.vercel.app/**`.
- 
Supabase > Authentication > SMTP: enter your Resend SMTP details so email links are not rate-limited.

### Access rules (migration `000``3``_rls.sql`)
```
-- Who is calling? Maps the JWT email to a roster person.
create or replace function current_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select person_id from person_emails
  where email = lower(auth.jwt() ->> 'email')
$$;

create or replace function is_slt() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where id = current_person_id() and role = 'SLT' and active)
$$;

alter table projects enable row level security;
alter table people enable row level security;
alter table person_emails enable row level security;
alter table assignments enable row level security;
alter table cycles enable row level security;
alter table evaluations enable row level security;
alter table weights enable row level security;
alter table app_settings enable row level security;

-- Roster data: any registered member can read names, roles, projects (needed for to-do lists).
create policy read_projects on projects for select using (current_person_id() is not null);
create policy read_people on people for select using (current_person_id() is not null);
create policy read_assignments on assignments for select using (current_person_id() is not null);
create policy read_cycles on cycles for select using (current_person_id() is not null);
create policy read_own_email on person_emails for select using (person_id = current_person_id() or is_slt());

-- Evaluations: you see only what you wrote; SLT sees everything.
create policy read_evals on evaluations for select
  using (evaluator_id = current_person_id() or is_slt());

create policy insert_evals on evaluations for insert
  with check (
    evaluator_id = current_person_id()
    and exists (select 1 from cycles c where c.id = cycle_id and c.is_open)
    and can_evaluate(form_type, evaluator_id, evaluatee_id, project_id)   -- Section 5
  );

create policy update_evals on evaluations for update
  using (evaluator_id = current_person_id()
         and exists (select 1 from cycles c where c.id = cycle_id and c.is_open)
         and (select value from app_settings where key = 'allow_edits_until_close') = 'true')
  with check (evaluator_id = current_person_id());

-- SLT-only writes
create policy slt_write_people on people for all using (is_slt()) with check (is_slt());
create policy slt_write_emails on person_emails for all using (is_slt()) with check (is_slt());
create policy slt_write_assign on assignments for all using (is_slt()) with check (is_slt());
create policy slt_write_projects on projects for all using (is_slt()) with check (is_slt());
create policy slt_write_cycles on cycles for all using (is_slt()) with check (is_slt());
create policy slt_delete_evals on evaluations for delete using (is_slt());
create policy slt_weights on weights for all using (is_slt()) with check (is_slt());
create policy slt_settings on app_settings for all using (is_slt()) with check (is_slt());
create policy read_settings on app_settings for select using (true);   -- login page needs the domain
```

Route protection on top of RLS: `middleware.ts` sends signed-out users to `/login`; the `(slt)` route group's layout calls `is_slt()` and returns 404 for everyone else, so the dashboard URL is not even visible to members.
Switching to personal emails later: set `allowed_email_domain` to `''` in the admin page and add each person's Gmail as an extra row in `person_emails`. No code changes.

## Who evaluates whom (assignment rules)
Each person's to-do list is generated from their role and project, using the same pairings the four forms' descriptions set out. The only change from the Google Forms: the evaluatee dropdowns are limited to the evaluator's own project instead of listing every consultant or every PM/SC in the club.

Form | 
Evaluator role | 
Evaluates | 
Source in the Apps Script | 

Self | 
Project Manager, Senior Consultant, Consultant | 
Themselves, once per project they're on | 
`buildSelf_`, role choices PM/SC/Consultant | 

Manager | 
Project Manager, Senior Consultant | 
Each Consultant on the same project | 
"Submit once for EACH consultant you're evaluating." | 

Upward | 
Consultant | 
The PM and the SC on the same project (with the pm_sc_peer_reviews setting on, the PM and SC also rate each other on this form) | 
"Submit once for your Project Manager, once for your Senior Consultant." | 

SLT | 
SLT | 
Each PM and SC (all projects, or only the projects the SLT member is assigned to, if any) | 
"Submit once for each Project Manager / Senior Consultant you're evaluating." | 
Role matching keeps the Apps Script's `readRoster_` logic: a Consultant is a role containing "consultant" but not "senior"; leadership (valid Upward/SLT targets) is Project Manager or Senior Consultant.
For one project with a PM, an SC and 6 consultants, a round produces 8 Self + 12 Manager + 14 Upward evaluations (12 from consultants, 2 PM/SC peer), plus 2 per SLT member.
Migration `000``2``_assignments.sql`:
```
-- True when this evaluator may submit this form about this evaluatee on this project.
create or replace function can_evaluate(p_form text, p_evaluator uuid, p_evaluatee uuid, p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with er as (select role from people where id = p_evaluator and active),
       ee as (select role from people where id = p_evaluatee and active),
       on_proj as (select person_id from assignments where project_id = p_project)
  select case p_form
    when 'self' then p_evaluator = p_evaluatee
      and (select role from er) in ('Project Manager','Senior Consultant','Consultant')
      and p_evaluator in (select person_id from on_proj)
    when 'manager' then (select role from er) in ('Project Manager','Senior Consultant')
      and (select role from ee) = 'Consultant'
      and p_evaluator in (select person_id from on_proj)
      and p_evaluatee in (select person_id from on_proj)
    when 'upward' then ((select role from er) = 'Consultant'
        or ((select role from er) in ('Project Manager','Senior Consultant')
            and p_evaluator <> p_evaluatee
            and (select value from app_settings where key = 'pm_sc_peer_reviews') = 'true'))
      and (select role from ee) in ('Project Manager','Senior Consultant')
      and p_evaluator in (select person_id from on_proj)
      and p_evaluatee in (select person_id from on_proj)
    when 'slt' then (select role from er) = 'SLT'
      and (select role from ee) in ('Project Manager','Senior Consultant')
      and p_evaluatee in (select person_id from on_proj)
      and (not exists (select 1 from assignments where person_id = p_evaluator)
           or p_evaluator in (select person_id from on_proj))
    else false end
$$;

-- Every evaluation the signed-in person owes in the open round, with done/not done.
create or replace function my_tasks()
returns table (form_type text, project_id uuid, project_name text,
               evaluatee_id uuid, evaluatee_name text, evaluatee_role text,
               evaluation_id uuid, submitted_at timestamptz)
language sql stable security definer set search_path = public as $$
  with me as (select current_person_id() as id),
       cyc as (select id from cycles where is_open),
       pairs as (
         select f.form_type, a.project_id, p.id as evaluatee_id
         from (values ('self'),('manager'),('upward'),('slt')) f(form_type)
         cross join projects pr
         join assignments a on a.project_id = pr.id
         join people p on p.id = a.person_id and p.active
         where pr.active and can_evaluate(f.form_type, (select id from me), p.id, pr.id)
       )
  select pa.form_type, pa.project_id, pr.name, pa.evaluatee_id, pe.full_name, pe.role,
         e.id, e.submitted_at
  from pairs pa
  join projects pr on pr.id = pa.project_id
  join people pe on pe.id = pa.evaluatee_id
  left join evaluations e on e.cycle_id = (select id from cyc)
    and e.form_type = pa.form_type and e.evaluator_id = (select id from me)
    and e.evaluatee_id = pa.evaluatee_id and e.project_id = pa.project_id
  where exists (select 1 from cyc)
  order by case pa.form_type when 'self' then 0 when 'manager' then 1 when 'upward' then 2 else 3 end,
           pr.sort_order, pe.full_name
$$;

-- Snapshot roles and enforce the Leadership rules on every insert/update.
create or replace function evaluations_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select role into new.evaluator_role from people where id = new.evaluator_id;
  select role into new.evaluatee_role from people where id = new.evaluatee_id;
  new.updated_at := now();
  if new.form_type = 'manager' and new.leadership is not null then
    raise exception 'Manager evaluations have no Leadership score';
  end if;
  if new.form_type in ('upward','slt') and new.leadership is null then
    raise exception 'Leadership & Mentorship is required on Upward and SLT evaluations';
  end if;
  if new.form_type = 'self' and new.leadership is not null
     and new.evaluator_role not in ('Project Manager','Senior Consultant') then
    raise exception 'Only PMs and SCs answer Leadership on the self-evaluation';
  end if;
  return new;
end $$;

create trigger evaluations_before_write before insert or update on evaluations
  for each row execute function evaluations_before_write();
```


## The four evaluation forms, exact spec from the Apps Script
The web forms ask the same questions, in the same order, with the same wording, scales and required flags as `buildSelf_` and `buildFlatEval_`. Name, role, project, evaluatee and round are no longer typed or picked by the member: they come from the roster and the open round, and are shown read-only at the top of the form.
Put these constants in `src/lib/forms.ts` verbatim and render every form from them:
```
export const CORE = [
  { key: 'technical',     label: 'Technical & Analytical Quality (1-5)' },
  { key: 'communication', label: 'Communication (1-5)' },
  { key: 'reliability',   label: 'Reliability & Ownership (1-5)' },
  { key: 'teamwork',      label: 'Teamwork & Collaboration (1-5)' },
  { key: 'initiative',    label: 'Initiative (1-5)' },
] as const;

export const LEADERSHIP = 'Leadership & Mentorship (1-5)';
export const LEADERSHIP_SELF = 'Leadership & Mentorship (1-5) (PM/SC only - others skip)';

export const SCALE = { min: 1, max: 5, minLabel: 'Needs Improvement', maxLabel: 'Excellent' };

export const COMMENT_SELF =
  'Comments (Provide a 3-4 line explanation of your performance so far. ' +
  'If you indicated a low score (1-3) on any of the metrics, provide an explanation of why.)';
export const COMMENT_OTHER =
  'Comments (Provide a 3-4 line explanation of their performance so far. ' +
  'If you indicated a low score (1-3) on any of the metrics, provide an explanation of why.)';

export const FORMS = {
  self: {
    title: 'EntreCorps Self-Evaluation',
    description: 'Rate your own performance this cycle.',
  },
  manager: {
    title: 'EntreCorps Manager Evaluation (PM & SC rating Consultants)',
    description: "For Project Managers and Senior Consultants. Submit once for EACH consultant you're evaluating.",
  },
  upward: {
    title: 'EntreCorps Upward Evaluation',
    description: 'For Consultants. Submit once for your Project Manager, once for your Senior Consultant.',
  },
  slt: {
    title: 'EntreCorps SLT Evaluation',
    description: "For SLT members. Submit once for each Project Manager / Senior Consultant you're evaluating.",
  },
} as const;
```

Every 1-5 question renders as a row of five buttons labelled 1 to 5, with "Needs Improvement" under 1 and "Excellent" under 5 (the Google Forms linear scale).

### Self-Evaluation

# | 
Question (exact) | 
Type | 
Required | 

header | 
Your name (First, Last) | 
Read-only, from roster | 
n/a | 

header | 
Your role | 
Read-only, from roster | 
n/a | 

header | 
Which project are you on? | 
Read-only, from assignment | 
n/a | 

1-5 | 
The five CORE questions, in CORE order | 
Scale 1-5 | 
Yes | 

6 | 
Leadership & Mentorship (1-5) (PM/SC only - others skip) | 
Scale 1-5, shown only when role is PM or SC | 
No | 

7 | 
COMMENT_SELF text | 
Paragraph | 
Yes | 

### Manager Evaluation (PM & SC rating Consultants)

# | 
Question (exact) | 
Type | 
Required | 

header | 
Your name (First, Last) / Your role | 
Read-only | 
n/a | 

header | 
Which project is this about? | 
Read-only | 
n/a | 

header | 
Which consultant are you evaluating? | 
Read-only, from the task | 
n/a | 

1-5 | 
The five CORE questions | 
Scale 1-5 | 
Yes | 

6 | 
COMMENT_OTHER text | 
Paragraph | 
Yes | 
No Leadership question (the Apps Script skips it when `mode === 'manager'`).

### Upward Evaluation

# | 
Question (exact) | 
Type | 
Required | 

header | 
Your name (First, Last) / Your role | 
Read-only | 
n/a | 

header | 
Which project is this about? | 
Read-only | 
n/a | 

header | 
Who are you evaluating? | 
Read-only, from the task | 
n/a | 

1-5 | 
The five CORE questions | 
Scale 1-5 | 
Yes | 

6 | 
Leadership & Mentorship (1-5) | 
Scale 1-5 | 
Yes | 

7 | 
COMMENT_OTHER text | 
Paragraph | 
Yes | 

### SLT Evaluation
Identical to Upward: header shows role `SLT`, "Which project is this about?", "Who are you evaluating?"; then the five CORE questions, Leadership & Mentorship (1-5) required, and COMMENT_OTHER required.

### Form behaviour
- 
Submit is disabled until every required question is answered; the server validates again with the same Zod schema.
- 
After submit: "Saved. Back to my evaluations" and the task shows a check mark.
- 
While the round is open and edits are allowed, reopening a done task loads the saved answers and Update overwrites the same row.
- 
Unsaved changes are kept in browser storage per task, so a closed tab doesn't lose a half-written comment.

## Scoring calculations, exact spec from the workbook
Every number on the SLT dashboard is computed the way the README, RESPONSES, Scores and Weights tabs compute it: a per-evaluation average, then four component averages split by the evaluator's role, then a role-weighted composite. The one thing to confirm is how your Composite formula treats a blank component (Open decisions, item 1).

### Step 1: per-evaluation average (RESPONSES column N, "Eval Avg")
Mean of that row's non-blank scores: 5 scores for Manager rows, 6 for Upward and SLT rows, 5 or 6 for Self rows depending on whether Leadership was answered. This is the `eval_avg` generated column in Section 3, identical to `avgOf_` in the Apps Script.

### Step 2: component scores per person (Scores columns D-G)
Each is the plain average of `eval_avg` over the matching rows, after the round filter. No rows = blank, not zero.

Component | 
Rows included (all must be about this person) | 
Workbook formula it mirrors | 

Self | 
Evaluator is this person | 
`AVERAGEIFS(N, E=name, B=name)` | 

Manager | 
Evaluator role is Project Manager or Senior Consultant, and evaluator is not this person | 
`(SUMIFS PM + SUMIFS SC) / (COUNTIFS PM + COUNTIFS SC)`, evaluator ≠ name | 

Upward | 
Evaluator role is Consultant, and evaluator is not this person | 
`SUMIFS/COUNTIFS`, role = Consultant, evaluator ≠ name | 

SLT | 
Evaluator role is SLT | 
`AVERAGEIFS(N, E=name, C="SLT")` | 

# Evals (Scores column H) | 
All rows about this person | 
Count of evaluations received (confirm, Open decisions item 3) | 
The workbook matched people by name; the app matches by person ID, which gives the same result without breaking when two people share a name or someone fixes a typo.
Who feeds each component under the Section 5 rules:
- 
Consultant: Self (own form), Manager (their PM and SC), SLT (nothing: the SLT form only targets PMs and SCs), Upward (not applicable, weight 0%).
- 
PM / SC: Self, Upward (their consultants), SLT (SLT members), Manager (only from the PM and SC rating each other, which the old Upward form allowed because its role question offered PM and SC; kept via the `pm_sc_peer_reviews` setting, on by default).

### Step 3: composite (Scores column I)
Weights from the Weights tab, by the evaluatee's role:

Component | 
Consultant | 
PM / SC | 

Self | 
25% | 
15% | 

Manager (PM/SC ratings) | 
60% | 
25% | 

Upward (consultant ratings) | 
0% | 
35% | 

SLT | 
15% | 
25% | 

Total | 
100% | 
100% | 
```
\text{Composite} = \frac{\sum_{c \,\in\, \text{present}} w_c \, S_c}{\sum_{c \,\in\, \text{present}} w_c}
```

"Present" = components that have at least one row and a weight above 0. With every component present this is exactly 0.25 × Self + 0.60 × Manager + 0.15 × SLT for a consultant. With `composite_missing = 'require_all'` the composite is blank until every weighted component has data instead.
Worked check for the unit tests (consultant): Self 4.4; Manager rows 3.6 and 4.0, so Manager 3.8; SLT 4.0. Composite = 0.25 × 4.4 + 0.60 × 3.8 + 0.15 × 4.0 = 3.98. Same person with no SLT rows: renormalize gives (25 × 4.4 + 60 × 3.8) / 85 = 3.976; require_all gives blank.

### Step 4: filters (Scores!K2)
Round filter values, exactly: `All Rounds`, `Mid-term Evaluation`, `Final Evaluation`. The app adds a Term filter (default: the current term) so "All Rounds" means both rounds of this semester, not every semester ever. The filter changes components and therefore the composite, as in the sheet.

### Step 5: project dashboard (Dashboard tab)
One row per project: Avg Composite = mean of the composites of that project's members that have one; # People Scored = members on the project (the sheet shows 8 per project before any responses, so it counts the roster); plus a new column, # with a composite.
Migration `0004_scores.sql`:
```
-- Same 15 columns as the RESPONSES tab, plus term.
create view responses with (security_invoker = true) as
select e.submitted_at as "Timestamp", er.full_name as "Evaluator Name", e.evaluator_role as "Evaluator Role",
       pr.name as "Project", ee.full_name as "Evaluatee Name", e.evaluatee_role as "Evaluatee Role",
       e.technical as "Technical", e.communication as "Communication", e.reliability as "Reliability",
       e.teamwork as "Teamwork", e.initiative as "Initiative", e.leadership as "Leadership",
       e.comment as "Comment", round(e.eval_avg, 2) as "Eval Avg", c.round as "Round", c.term as "Term"
from evaluations e
join people er on er.id = e.evaluator_id
join people ee on ee.id = e.evaluatee_id
join projects pr on pr.id = e.project_id
join cycles c on c.id = e.cycle_id;

create or replace function person_scores(p_term text, p_round text default 'All Rounds')
returns table (person_id uuid, full_name text, role text, projects text,
               self_score numeric, manager_score numeric, upward_score numeric, slt_score numeric,
               n_evals bigint, composite numeric)
language sql stable security invoker set search_path = public as $$
  with f as (
    select e.* from evaluations e join cycles c on c.id = e.cycle_id
    where (p_term is null or c.term = p_term)
      and (p_round = 'All Rounds' or c.round = p_round)
  ),
  comp as (
    select p.id, p.full_name, p.role,
      (select string_agg(pr.name, ', ' order by pr.sort_order) from assignments a
         join projects pr on pr.id = a.project_id where a.person_id = p.id) as projects,
      (select avg(eval_avg) from f where evaluatee_id = p.id and evaluator_id = p.id) as s_self,
      (select avg(eval_avg) from f where evaluatee_id = p.id and evaluator_id <> p.id
         and evaluator_role in ('Project Manager','Senior Consultant')) as s_mgr,
      (select avg(eval_avg) from f where evaluatee_id = p.id and evaluator_id <> p.id
         and evaluator_role = 'Consultant') as s_up,
      (select avg(eval_avg) from f where evaluatee_id = p.id and evaluator_role = 'SLT') as s_slt,
      (select count(*) from f where evaluatee_id = p.id) as n
    from people p where p.active and p.role <> 'SLT'
  ),
  w as (
    select
      max(case when component = 'Self' then consultant_pct end) as c_self,
      max(case when component = 'Manager' then consultant_pct end) as c_mgr,
      max(case when component = 'Upward' then consultant_pct end) as c_up,
      max(case when component = 'SLT' then consultant_pct end) as c_slt,
      max(case when component = 'Self' then pm_sc_pct end) as l_self,
      max(case when component = 'Manager' then pm_sc_pct end) as l_mgr,
      max(case when component = 'Upward' then pm_sc_pct end) as l_up,
      max(case when component = 'SLT' then pm_sc_pct end) as l_slt
    from weights
  ),
  parts as (
    select comp.*,
      case when role = 'Consultant' then array[c_self, c_mgr, c_up, c_slt]
           else array[l_self, l_mgr, l_up, l_slt] end as wt,
      array[s_self, s_mgr, s_up, s_slt] as sc
    from comp, w
  )
  select id, full_name, role, projects,
    round(s_self, 2), round(s_mgr, 2), round(s_up, 2), round(s_slt, 2), n,
    round(case
      when (select value from app_settings where key = 'composite_missing') = 'require_all'
        and exists (select 1 from generate_subscripts(wt, 1) i where wt[i] > 0 and sc[i] is null)
        then null
      else (select sum(wt[i] * sc[i]) / nullif(sum(wt[i]), 0)
            from generate_subscripts(wt, 1) i where wt[i] > 0 and sc[i] is not null)
    end, 2)
  from parts
  order by projects, case role when 'Project Manager' then 0 when 'Senior Consultant' then 1 else 2 end, full_name
$$;
```

`security invoker` means only SLT get rows back (RLS on `evaluations`); a member calling it sees only scores built from their own submissions, so the dashboard page must also be SLT-gated (Section 4). Keep a TypeScript copy of Steps 1-3 in `src/lib/scoring.ts` and unit-test it against the worked check above.

## Pages and user flow
A member goes from the link to a finished evaluation in four screens: sign in, to-do list, form, back to the list.
- 
Open the link. Signed out goes to `/login` (Section 4 copy).
- 
Sign in. Google with the Illinois account, or the emailed link. `/auth/callback` checks the domain, exchanges the code for a session, then:
- 
email not in `person_emails` → `/not-registered`: "You're signed in as {email}, but you're not on the EntreCorps roster. Ask an SLT member to add you." + Sign out button.
- 
registered → `/` (My evaluations).
- 
My evaluations (`/`). Header: name, role, project(s), current round ("Fall 2026 · Mid-term Evaluation") and its close date. A progress bar "5 of 7 done". Then `my_tasks()` grouped by form: Self, Manager, Upward, SLT. Each row: evaluatee name, their role, project, status (Not started / Submitted on Oct 20), and a Start or Edit button.
- 
No open round → "No evaluation round is open right now."
- 
Project selector: only if the person is on more than one project, a tab per project; otherwise none (the roster already knows).
- 
Evaluate (`/evaluate/[taskId]`). Form title and description from `FORMS`, read-only header, the questions from Section 6. Submit saves through a Server Action that re-runs Zod validation and inserts/updates with the user's own session (RLS applies). Success → toast "Saved" and back to `/`.
- 
SLT members see the same `/` page (they have SLT evaluations to do) plus nav links Dashboard and Admin.

Route | 
Who | 
Purpose | 

`/login` | 
Anyone | 
Google button, activation note, email link | 

`/auth/callback` | 
Anyone | 
Finishes sign-in, checks domain | 

`/not-registered` | 
Signed in, not on roster | 
Explains and offers sign out | 

`/` | 
Members + SLT | 
To-do list for the open round | 

`/evaluate/[taskId]` | 
Owner of that task | 
The form | 

`/dashboard` | 
SLT | 
Consolidated scores (Section 9) | 

`/dashboard/[personId]` | 
SLT | 
One person's detail | 

`/admin` | 
SLT | 
Roster, rounds, weights, settings | 
Mobile first: most people will fill these on a phone, so the scale buttons are at least 44 px tall and the form is one column.

## SLT dashboard and admin
The dashboard is the Scores and Dashboard tabs as one live page; the admin page replaces editing the ROSTER and Weights tabs by hand.

### `/dashboard`
- 
Filters bar: Term (default current), Round (`All Rounds` / `Mid-term Evaluation` / `Final Evaluation`), Project (All / each project), Role (All / PM / SC / Consultant). Filters live in the URL so a view can be shared with other SLT members.
- 
Completion tracker (top): for the open round, submitted vs expected per project and per form type, e.g. "Project 3: 27 of 34". Click through to a list of who still owes what, with a Copy reminder list button (names + emails).
- 
Scores table: one row per person from `person_scores(term, round)`; columns exactly as the Scores tab: Project, Role, Name, Self, Manager, Upward, SLT, # Evals, Composite. Two decimals, blank (not 0) when no data. Sortable by any column; a composite under 3.0 is highlighted.
- 
Project summary: the Dashboard tab as a table: Project, Avg Composite, # People Scored, # with a composite; plus a bar chart of Avg Composite by project.
- 
Export: CSV of the scores table and of `responses` (same 15 columns as the RESPONSES tab, plus Term) for anyone who still wants it in Sheets.

### `/dashboard/[personId]`
- 
Header: name, role, project(s), the four components and composite for the selected filters.
- 
Per-criterion averages (Technical, Communication, Reliability, Teamwork, Initiative, Leadership) split by component, and Mid-term vs Final side by side when both exist.
- 
Every evaluation received: date, form, evaluator name and role, scores, comment. Upward comments show the evaluator's name only if Open decisions item 2 says so; otherwise "Consultant".

### `/admin`
- 
Roster: table of people with name, role, emails, projects, active. Add / edit / deactivate; bulk Import CSV in the Section 1 format (upsert by email). Deactivating keeps their past evaluations.
- 
Projects: add, rename, reorder, deactivate (6 today; the workbook had 7).
- 
Rounds: create a round (term + Mid-term or Final), Open, Close. Opening closes any other open round (enforced by the `one_open_cycle` index).
- 
Weights: the Weights table with two columns; Save is disabled unless each column sums to 100.
- 
Settings: allowed email domain, allow edits until close, PM/SC peer reviews, composite with missing components (renormalize / require all).
- 
Import past responses (one-time): upload a CSV export of the old RESPONSES tab; rows are matched to people by name and to a round by the Round column, then inserted into `evaluations`. Unmatched names are listed for manual fixing, nothing is guessed.

## Build phases with Claude Code prompts
Seven phases (0 to 6), each one prompt. Paste the prompt, let Claude Code finish, run the "Done when" check, commit, then `/clear` and start the next.

### Phase 0: Scaffold
```
Read CLAUDE.md and docs/BUILD_GUIDE.md (Sections 2 and 10).
Create a Next.js 15 App Router project with TypeScript, Tailwind, ESLint in this folder.
Add shadcn/ui (button, card, input, textarea, table, select, tabs, badge, toast, dialog),
@supabase/supabase-js, @supabase/ssr, zod, recharts, vitest.
Create the folder layout from Section 2 with placeholder pages.
Create .env.local.example with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY (server/scripts only). Add .env* to .gitignore.
Stop and tell me what to put in .env.local.
```

Done when: `npm run dev` shows the placeholder home page at localhost:3000.

### Phase 1: Database
```
Implement Sections 3, 5 and 7 of docs/BUILD_GUIDE.md as SQL migrations in supabase/migrations/,
in this order: 0001_schema.sql, 0002_assignments.sql, 0003_rls.sql, 0004_scores.sql.
Copy the SQL from the guide; fix only syntax errors, and tell me about every change.
Also add 0005_completion.sql: a security-definer function completion_status(p_cycle uuid)
that raises an exception unless is_slt(), and returns, for every active non-SLT person and every
SLT member, each evaluation they owe in that cycle (same pairing logic as my_tasks) with done/not done.
The real roster isn't ready yet. Create seed/roster.csv with FAKE test people in the Section 1 format:
2 projects, each with 1 Project Manager, 1 Senior Consultant and 3 Consultants, using made-up names
and made-up @illinois.edu emails. Ask me for my own @illinois.edu email and add me as the SLT member
(so I can see the dashboard and admin pages).
Write scripts/seed-roster.ts: reads seed/roster.csv, upserts projects, people, person_emails,
assignments using SUPABASE_SERVICE_ROLE_KEY. Also create one closed test cycle 'Test' / 'Mid-term Evaluation'.
Give me the exact commands to apply the migrations (Supabase CLI: supabase link, supabase db push).
```

Done when: the migrations apply cleanly, the seed loads, and in the Supabase SQL editor `select count(*) from people` matches your CSV.

### Phase 2: Sign-in
```
Implement Section 4 (sign-in) and the routing in Section 8:
- src/lib/supabase/{server,client,middleware}.ts with @supabase/ssr cookie handling.
- middleware.ts: refresh session; signed-out users -> /login (except /login, /auth/*).
- /login with the exact copy in Section 4: Google button (hd=illinois.edu, prompt=select_account),
  the activation note linking https://cloud-dashboard.illinois.edu, and the email-link form.
- Domain check reads app_settings.allowed_email_domain; empty string means any domain.
- /auth/callback: exchange code, enforce domain (sign out + error if wrong), then send to
  /not-registered if current_person_id() is null, else /.
- /not-registered page with the exact copy from Section 8.
- (slt) route group layout: 404 unless is_slt().
```

Done when: your Illinois account lands on `/`; a Gmail account is refused; an Illinois account not in the roster lands on `/not-registered`.

### Phase 3: To-do list and forms
```
Implement Section 6 and the member pages in Section 8.
- src/lib/forms.ts: paste the constants from Section 6 exactly. Do not change any string.
- One <EvaluationForm formType=...> component renders all four forms from those constants:
  read-only header, CORE scales (1-5 buttons, 'Needs Improvement' under 1, 'Excellent' under 5),
  Leadership rules per form, the correct comment prompt, required flags exactly as in the tables.
- Zod schema per form type, used client-side and in the Server Action.
- / calls rpc('my_tasks') and shows the grouped to-do list, progress bar, round header.
- /evaluate/[taskId]: taskId encodes form_type, project_id, evaluatee_id; server re-checks the task
  is in my_tasks() before rendering. Submit upserts into evaluations for the open cycle.
- Draft autosave to localStorage per task (wrapped in try/catch).
```

Done when: with a test round open, a consultant test account sees 1 Self + 2 Upward tasks, submits all three, and the rows appear in `responses` with the right Eval Avg.

### Phase 4: SLT dashboard
```
Implement /dashboard and /dashboard/[personId] from Section 9 using rpc('person_scores'),
rpc('completion_status'), and the responses view. Filters in URL search params.
Scores table columns exactly: Project, Role, Name, Self, Manager, Upward, SLT, # Evals, Composite.
Blank cells for null, two decimals. Project summary table + Recharts bar chart.
CSV export for the scores table and the responses view.
```

Done when: the numbers for your test data match a hand calculation with the Section 7 rules.

### Phase 5: Admin
```
Implement /admin from Section 9: roster CRUD + CSV import (upsert by email), projects,
rounds (create/open/close), weights editor (each column must total 100), settings,
and the one-time import of an old RESPONSES CSV (match by exact name; list unmatched rows; never guess).
All writes go through Server Actions using the signed-in SLT user's session so RLS applies.
```

Done when: you can add a person, open a round, change a weight and see the composite change.

### Phase 6: Tests and polish
```
Write Vitest tests for src/lib/scoring.ts using the worked check in Section 7
(3.98 with all components; 3.976 renormalized and blank under require_all without SLT),
and for the pairing rules in Section 5 (one project: PM, SC, 6 consultants, 2 SLT).
Then go through Section 12 and fix anything that fails. Check every page at 375 px width.
```

Done when: `npm test` passes and every Section 12 box is ticked.

## Deploy and launch
Deploy once Phase 3 works, so testers use the real URL; later phases redeploy automatically on every push.
- 
You do this: push the repo to GitHub (`git push origin main`).
- 
You do this: Vercel > Add New Project > import the repo. Add environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do not add the service-role key to Vercel; it is only for the local seed script.
- 
Copy the Vercel URL into Supabase > Authentication > URL Configuration (Site URL + Redirect URLs) and confirm the Google OAuth client still lists the Supabase callback URL.
- 
Pilot with 4 people: one PM, one SC, one consultant, one SLT member. Open a round named `Test`, have each complete their list, check the dashboard, then delete the test round's evaluations from the admin page.
- 
Load the real roster: Admin > Roster > Import CSV, using the Section 1 format (name, email, role, project). Deactivate the fake test people. Then create the real round (e.g. `Fall 2026` / `Mid-term Evaluation`) and open it.
- 
Send the launch message (template below), then watch the completion tracker and chase stragglers with the copied reminder list.
Launch message template:
```
EntreCorps mid-term evaluations are open until <date>.
1. Turn on your Illinois Google account (one minute, skip if done):
   https://cloud-dashboard.illinois.edu -> Google Apps @ Illinois -> On
2. Go to <app URL> and sign in with your @illinois.edu Google account.
   Tip: use a browser window where you're only signed into your Illinois account.
3. Your evaluations are listed for you. Finish all of them.
Can't sign in with Google? Use the "Email me a sign-in link" option on the same page.
```


## Acceptance test checklist
The app is ready to launch when every box below is ticked on the deployed URL, not just localhost.
Sign-in and access
- 
Illinois Google account on the roster lands on My evaluations
- 
Illinois Google account not on the roster lands on Not registered and sees no data
- 
Personal Gmail is refused at the callback
- 
Email link works for an @illinois.edu address and is refused for any other domain
- 
A consultant opening `/dashboard` or `/admin` gets a 404
- 
A consultant querying `evaluations` from the browser console gets only their own rows
Forms (compare side by side with the old Google Forms)
- 
All four titles and descriptions match `FORMS` character for character
- 
All five CORE question labels, Leadership labels and both comment prompts match exactly
- 
Every scale runs 1 to 5 with "Needs Improvement" and "Excellent"
- 
Self: Leadership shows only for PM/SC and is optional; comment required
- 
Manager: no Leadership question
- 
Upward and SLT: Leadership required
- 
Submit stays disabled until all required answers are given
- 
Resubmitting a task while the round is open updates the same row (no duplicate)
- 
Nobody can submit when no round is open
To-do lists (one project: PM, SC, 6 consultants)
- 
Consultant: 1 Self + Upward for the PM and the SC
- 
PM: 1 Self + 6 Manager + 1 Upward (the SC)
- 
SC: 1 Self + 6 Manager + 1 Upward (the PM)
- 
SLT member: 1 SLT task per PM and SC
- 
Nobody sees people from another project
Scores
- 
Eval Avg uses 5 scores for Manager rows, 6 for Upward/SLT, 5 or 6 for Self
- 
Self, Manager, Upward, SLT columns match a hand calculation for 3 people
- 
Self-ratings never count toward Manager or Upward
- 
Composite equals the Section 7 worked check (3.98)
- 
Round filter changes the numbers; All Rounds combines both rounds of the term
- 
Changing a weight in admin changes composites immediately
- 
CSV exports open in Sheets with the RESPONSES column names
Phone
- 
Full flow works on an iPhone and an Android phone

## Open decisions
Five things the workbook doesn't settle; each has a default already built into the guide, so Claude Code can proceed and you can change them later from the admin page or a one-line edit.

# | 
Question | 
Default in this guide | 
How to decide | 

1 | 
When a component is blank, does the composite skip it and re-weight the rest, or stay blank? | 
Re-weight the rest (`composite_missing = 'renormalize'`) | 
Click Scores!I2 in the workbook and read the formula; if it multiplies blanks as 0 or shows blank, switch to `require_all` | 

2 | 
Should SLT see which consultant gave each upward rating, or only the average? | 
Names visible to SLT | 
If PMs/SCs ever see their own results, show upward comments as "Consultant" | 

3 | 
Does "# Evals" count self-evaluations? | 
Yes, counts every evaluation received | 
Read Scores!H2's formula | 

4 | 
Consultants have a 15% SLT weight, but the SLT form only covers PMs and SCs, so that component is always blank for consultants | 
Leave as is; renormalizing makes a consultant's composite (25% Self + 60% Manager) / 85% | 
Either let SLT also rate consultants (add `'Consultant'` to the `slt` branch of `can_evaluate`) or move the 15% to Manager/Self in the Weights admin | 

5 | 
PM and SC rate each other so PM/SC have a Manager score (25% weight) | 
On (`pm_sc_peer_reviews = 'true'`) | 
Turn off in admin if you'd rather move that 25% elsewhere | 

## Changes after the original spec (Fall 2026)
- SLT members review only the PMs and SCs on projects they are staffed on (migration 0006). An SLT member with no project has no SLT reviews.
- Every form has one extra optional short-answer question, `SUPPORT_QUESTION` in `src/lib/forms.ts`: "What can EntreCorps leadership help you with the most?" Stored in `evaluations.leadership_support`, shown on the SLT dashboard, and exported as the "Leadership Support" column.
- Real roster lives only in Supabase and the git-ignored `seed/roster.csv`.
