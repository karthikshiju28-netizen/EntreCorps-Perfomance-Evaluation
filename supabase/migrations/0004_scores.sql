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
