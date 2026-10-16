-- "My project" page for Project Managers and Senior Consultants.
-- PMs/SCs see, live, for consultants on projects they lead:
--   * scores (Self, Manager, composite) and
--   * the Self and Manager reviews (scores + comments, with reviewer names).
-- They also see anonymous averages and comments from the Upward reviews consultants wrote about them,
-- only once at least 3 consultants have reviewed them in that round.

-- Round to show: the open one, else the most recently closed one.
create or replace function current_or_latest_cycle() returns uuid
language sql stable security definer set search_path = public as $$
  select id from cycles order by is_open desc, coalesce(closes_at, opens_at) desc nulls last limit 1
$$;

-- Projects the caller leads as PM or SC.
create or replace function my_led_projects() returns setof uuid
language sql stable security definer set search_path = public as $$
  select a.project_id from assignments a join people p on p.id = a.person_id
  where p.id = current_person_id() and p.active and p.role in ('Project Manager','Senior Consultant')
$$;

create or replace function project_consultant_scores(p_cycle uuid)
returns table (project_id uuid, project_name text, person_id uuid, full_name text,
               self_score numeric, manager_score numeric, composite numeric, n_evals bigint)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.name, s.person_id, s.full_name, s.self_score, s.manager_score, s.composite, s.n_evals
  from cycles c
  cross join lateral person_scores(c.term, c.round) s
  join assignments a on a.person_id = s.person_id
  join projects pr on pr.id = a.project_id
  where c.id = p_cycle and s.role = 'Consultant' and pr.id in (select my_led_projects())
  order by pr.sort_order, s.full_name
$$;

create or replace function project_consultant_reviews(p_cycle uuid)
returns table (project_id uuid, evaluatee_id uuid, form_type text, evaluator_name text, evaluator_role text,
               technical smallint, communication smallint, reliability smallint, teamwork smallint, initiative smallint,
               eval_avg numeric, comment text, submitted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.project_id, e.evaluatee_id, e.form_type, er.full_name, e.evaluator_role,
         e.technical, e.communication, e.reliability, e.teamwork, e.initiative,
         round(e.eval_avg, 2), e.comment, e.submitted_at
  from evaluations e
  join people er on er.id = e.evaluator_id
  join people ee on ee.id = e.evaluatee_id
  where e.cycle_id = p_cycle and e.form_type in ('self','manager') and ee.role = 'Consultant'
    and e.project_id in (select my_led_projects())
  order by e.submitted_at
$$;

-- Anonymous Upward feedback about the caller (consultant-written only), hidden below 3 reviews.
create or replace function my_upward_feedback(p_cycle uuid)
returns table (n bigint, technical numeric, communication numeric, reliability numeric, teamwork numeric,
               initiative numeric, leadership numeric, overall numeric, comments text[])
language sql stable security definer set search_path = public as $$
  with u as (
    select * from evaluations e
    where e.cycle_id = p_cycle and e.form_type = 'upward' and e.evaluator_role = 'Consultant'
      and e.evaluatee_id = current_person_id()
  )
  select count(*),
    case when count(*) >= 3 then round(avg(technical), 2) end,
    case when count(*) >= 3 then round(avg(communication), 2) end,
    case when count(*) >= 3 then round(avg(reliability), 2) end,
    case when count(*) >= 3 then round(avg(teamwork), 2) end,
    case when count(*) >= 3 then round(avg(initiative), 2) end,
    case when count(*) >= 3 then round(avg(leadership), 2) end,
    case when count(*) >= 3 then round(avg(eval_avg), 2) end,
    case when count(*) >= 3 then array_agg(comment order by md5(id::text)) end   -- stable shuffle, not by time
  from u
$$;
